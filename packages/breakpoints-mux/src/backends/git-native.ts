import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
  BreakpointBackend,
  SubmitBreakpointParams,
  WaitForAnswerOptions,
  SubmitAnswerParams,
} from "../backend.js";
import type {
  Breakpoint,
  BreakpointAnswer,
  BreakpointWaitResult,
} from "../types.js";
import {
  generateBreakpointId,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  BREAKPOINTS_DIR,
  BreakpointSchema,
  BreakpointAnswerSchema,
} from "../types.js";

export interface GitNativeBackendOptions {
  /** Path to the .breakpoints directory. Defaults to `.breakpoints` in cwd. */
  breakpointsDir?: string;
  /** Default poll interval in ms. Defaults to 3000. */
  pollIntervalMs?: number;
  /** Default timeout in ms. Defaults to 30 minutes. */
  timeoutMs?: number;
}

export class GitNativeBackend implements BreakpointBackend {
  readonly name = "git-native";

  private breakpointsDir: string;
  private defaultPollIntervalMs: number;
  private defaultTimeoutMs: number;

  constructor(options?: GitNativeBackendOptions) {
    this.breakpointsDir = options?.breakpointsDir
      ?? path.resolve(process.cwd(), BREAKPOINTS_DIR);
    this.defaultPollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.defaultTimeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private breakpointPath(id: string): string {
    return path.join(this.breakpointsDir, `${id}.json`);
  }

  private answerPath(id: string): string {
    return path.join(this.breakpointsDir, `${id}.answer.json`);
  }

  async submitBreakpoint(params: SubmitBreakpointParams): Promise<Breakpoint> {
    await fs.mkdir(this.breakpointsDir, { recursive: true });

    const id = generateBreakpointId();
    const now = new Date().toISOString();
    const timeoutMs = params.routing.timeoutMs || this.defaultTimeoutMs;

    const breakpoint: Breakpoint = {
      id,
      text: params.text,
      context: params.context,
      status: "pending",
      routing: params.routing,
      answers: [],
      projectId: params.projectId,
      repoId: params.repoId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    };

    // Validate before writing
    BreakpointSchema.parse(breakpoint);

    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );

    return breakpoint;
  }

  async getBreakpoint(id: string): Promise<Breakpoint> {
    const raw = await fs.readFile(this.breakpointPath(id), "utf-8");
    const breakpoint = BreakpointSchema.parse(JSON.parse(raw));

    // Check for answer file
    try {
      const answerRaw = await fs.readFile(this.answerPath(id), "utf-8");
      const answer = BreakpointAnswerSchema.parse(JSON.parse(answerRaw));
      if (!breakpoint.answers.some((a) => a.id === answer.id)) {
        breakpoint.answers.push(answer);
      }
      if (breakpoint.status === "pending" || breakpoint.status === "claimed") {
        breakpoint.status = "answered";
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }

    return breakpoint;
  }

  async waitForAnswer(
    id: string,
    options?: WaitForAnswerOptions,
  ): Promise<BreakpointWaitResult> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const pollIntervalMs = options?.pollIntervalMs ?? this.defaultPollIntervalMs;
    const signal = options?.signal;
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) {
        const breakpoint = await this.getBreakpoint(id);
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "aborted",
          elapsedMs: Date.now() - startTime,
        };
      }

      // Check for answer file
      try {
        await fs.access(this.answerPath(id));
        const breakpoint = await this.getBreakpoint(id);
        const answer = breakpoint.answers[0];
        return {
          answered: true,
          breakpoint: { ...breakpoint, status: "answered" },
          answer,
          allAnswers: breakpoint.answers,
          elapsedMs: Date.now() - startTime,
        };
      } catch {
        // No answer yet
      }

      // Check cancellation status
      const breakpoint = await this.getBreakpoint(id);
      if (breakpoint.status === "cancelled") {
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "cancelled",
          elapsedMs: Date.now() - startTime,
        };
      }

      if (Date.now() - startTime >= timeoutMs) {
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "timeout",
          elapsedMs: Date.now() - startTime,
        };
      }

      // Wait before next poll
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, pollIntervalMs);
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            resolve();
          };
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
  }

  async listPendingBreakpoints(responderId?: string): Promise<Breakpoint[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.breakpointsDir);
    } catch {
      return [];
    }

    const pending: Breakpoint[] = [];
    for (const file of files) {
      if (!file.endsWith(".json") || file.includes(".answer.") || file.includes(".proven.")) {
        continue;
      }
      try {
        const raw = await fs.readFile(
          path.join(this.breakpointsDir, file),
          "utf-8",
        );
        const bp = BreakpointSchema.parse(JSON.parse(raw));
        if (bp.status !== "pending" && bp.status !== "routed") continue;

        // Check expiration
        if (new Date(bp.expiresAt) < new Date()) continue;

        // Filter by responder if specified
        if (responderId && bp.routing.targetResponders.length > 0) {
          if (!bp.routing.targetResponders.includes(responderId)) continue;
        }

        // Check if answer already exists
        try {
          await fs.access(this.answerPath(bp.id));
          continue; // Already answered
        } catch {
          // No answer, include it
        }

        pending.push(bp);
      } catch {
        // Skip malformed files
      }
    }

    return pending;
  }

  async answerBreakpoint(
    id: string,
    answer: SubmitAnswerParams,
  ): Promise<BreakpointAnswer> {
    // Verify breakpoint exists
    await this.getBreakpoint(id);

    const answerId = generateBreakpointId();
    const now = new Date().toISOString();

    const breakpointAnswer: BreakpointAnswer = {
      id: answerId,
      breakpointId: id,
      responderId: answer.responderId,
      responderName: answer.responderName,
      text: answer.text,
      approved: answer.approved,
      confidence: answer.confidence ?? 80,
      references: answer.references ?? [],
      followUpQuestions: answer.followUpQuestions ?? [],
      answeredAt: now,
      decisionMemory: answer.decisionMemory
        ? { ...answer.decisionMemory, savedAt: now }
        : undefined,
    };

    BreakpointAnswerSchema.parse(breakpointAnswer);

    await fs.writeFile(
      this.answerPath(id),
      JSON.stringify(breakpointAnswer, null, 2) + "\n",
      "utf-8",
    );

    // Update the breakpoint status
    const breakpoint = await this.getBreakpoint(id);
    breakpoint.status = "answered";
    breakpoint.updatedAt = now;
    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );

    return breakpointAnswer;
  }

  async cancelBreakpoint(id: string): Promise<void> {
    const breakpoint = await this.getBreakpoint(id);
    breakpoint.status = "cancelled";
    breakpoint.updatedAt = new Date().toISOString();

    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );
  }

  async claimBreakpoint(id: string, responderId: string): Promise<Breakpoint> {
    const breakpoint = await this.getBreakpoint(id);
    breakpoint.status = "claimed";
    breakpoint.claimedByResponderId = responderId;
    breakpoint.updatedAt = new Date().toISOString();

    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );

    return breakpoint;
  }
}
