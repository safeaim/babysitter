/**
 * Claude Code hook handlers.
 * Extracted from claudeCode/stopHook.ts and claudeCode/sessionStart.ts.
 */

import * as path from "node:path";
import { existsSync } from "node:fs";
import {
  getSessionFilePath,
  readSessionFile,
  sessionFileExists,
} from "../../session/parse";
import type { SessionState } from "../../session/types";
import {
  getCurrentTimestamp,
  isIterationTooFast,
  updateIterationTimes,
  writeSessionFile,
} from "../../session/write";
import { normalizeSessionStateDir } from "../../config";
import { loadCompressionConfig } from "../../compression/config-loader";
import {
  findLibraryFiles,
  getOrCompressFile,
} from "../../compression/library-cache";
import { getActiveProcessLibraryPath } from "../../processLibrary/active";
import type { HookHandlerArgs } from "../types";
import {
  appendStopHookEvent,
  cleanupSession,
  createHookLogger,
  parseHookInput,
  readStdin,
  safeStr,
} from "./utils";
import {
  buildStopHookContinuation,
  parseAssistantStopState,
  resolveStopHookRunState,
} from "./stopHookContinuation";
import { collapseDoubledA5cRuns } from "../../cli/resolveInputPath";

// ---------------------------------------------------------------------------
// Shared Claude Code types and utilities
// ---------------------------------------------------------------------------

export interface ClaudeCodeStopHookInput {
  session_id?: string;
  transcript_path?: string;
  last_assistant_message?: string;
}

export interface ClaudeCodeSessionStartHookInput {
  session_id?: string;
}

/**
 * Resolve the current session ID from environment.
 * hooks-proxy handles session ID propagation via AGENT_SESSION_ID.
 */
export function resolveCurrentSessionIdFromEnv(): string | undefined {
  return process.env.AGENT_SESSION_ID;
}

export interface SessionResolutionDetails {
  sessionId?: string;
  resolvedFrom: "env-var" | "explicit" | "none";
  /** @deprecated PID-marker logic removed. Always null. */
  ancestorPid: number | null;
  /** @deprecated PID-marker logic removed. Always null. */
  ancestorAlive: boolean | null;
}

/**
 * Resolve session ID with detailed provenance.
 */
export function resolveSessionIdDetailed(explicit?: string): SessionResolutionDetails {
  if (explicit) {
    return {
      sessionId: explicit,
      resolvedFrom: "explicit",
      ancestorPid: null,
      ancestorAlive: null,
    };
  }

  const agentSessionId = process.env.AGENT_SESSION_ID;
  if (agentSessionId) {
    return {
      sessionId: agentSessionId,
      resolvedFrom: "env-var",
      ancestorPid: null,
      ancestorAlive: null,
    };
  }

  return {
    sessionId: undefined,
    resolvedFrom: "none",
    ancestorPid: null,
    ancestorAlive: null,
  };
}

export const __resolveCurrentSessionIdFromEnvForTests = resolveCurrentSessionIdFromEnv;

import { appendFileSync } from "node:fs";

export function setBabysitterSessionIdInEnvFile(
  envFile: string,
  sessionId: string,
): void {
  appendFileSync(envFile, `export AGENT_SESSION_ID="${sessionId}"\n`);
}

// ---------------------------------------------------------------------------
// Lifecycle (session binding)
// ---------------------------------------------------------------------------

import { bindSession } from "./sessionBinding";

export async function bindClaudeCodeSession(
  opts: import("../types").SessionBindOptions,
): Promise<import("../types").SessionBindResult> {
  const stateDir = normalizeSessionStateDir(
    opts.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
  return bindSession({
    harness: "claude-code",
    stateDir,
    opts,
    autoReleaseStale: true,
  });
}

// ---------------------------------------------------------------------------
// Stop hook handler
// ---------------------------------------------------------------------------

export async function handleClaudeCodeStopHook(args: HookHandlerArgs): Promise<number> {
  const { verbose } = args;
  const log = createHookLogger("babysitter-stop-hook");
  log.info("handleHookRunStop started");

  let rawInput: string;
  if (args.stdinPayload !== undefined) {
    rawInput = args.stdinPayload;
  } else {
    try {
      rawInput = await readStdin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn(`stdin read error: ${msg}`);
      if (verbose) {
        process.stderr.write(`[hook:run stop] stdin read error: ${msg}\n`);
      }
      process.stdout.write("{}\n");
      return 0;
    }
  }

  const hookInput = parseHookInput(rawInput) as ClaudeCodeStopHookInput;
  log.info("Hook input received");

  let sessionId = safeStr(hookInput as Record<string, unknown>, "session_id");
  if (!sessionId) {
    log.info("No session ID in hook input — allowing exit");
    if (verbose) {
      process.stderr.write("[hook:run stop] No session ID in hook input\n");
    }
    process.stdout.write("{}\n");
    return 0;
  }

  log.setContext("session", sessionId);
  const pluginRoot = args.pluginRoot
    || process.env.CLAUDE_PLUGIN_ROOT
    || process.env.AGENT_PLUGIN_ROOT
    || "";
  const resolvedPluginRoot = pluginRoot ? path.resolve(pluginRoot) : "";
  const stateDir = normalizeSessionStateDir(
    args.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
  if (!stateDir) {
    log.warn("Cannot determine state directory — allowing exit");
    if (verbose) {
      process.stderr.write("[hook:run stop] Cannot determine state directory\n");
    }
    process.stdout.write("{}\n");
    return 0;
  }

  const runsDir = collapseDoubledA5cRuns(path.resolve(args.runsDir || ".a5c/runs"));
  let filePath = getSessionFilePath(stateDir, sessionId);
  log.info(`Checking session file at: ${filePath}`);

  let sessionFile;
  try {
    if (!(await sessionFileExists(filePath))) {
      const envSessionId = resolveCurrentSessionIdFromEnv();
      if (envSessionId && envSessionId !== sessionId) {
        log.info(`Payload session ${sessionId} is stale; current env session is ${envSessionId} — retrying lookup`);
        const retryPath = getSessionFilePath(stateDir, envSessionId);
        if (await sessionFileExists(retryPath)) {
          filePath = retryPath;
          sessionId = envSessionId;
          log.setContext("session", sessionId);
          log.info(`Found session file for env session: ${filePath}`);
        } else {
          log.info(`No active loop found for payload session ${sessionId} or env session ${envSessionId} — allowing exit`);
          if (verbose) {
            process.stderr.write(
              `[hook:run stop] No active loop found for session ${sessionId} or ${envSessionId}\n`,
            );
          }
          process.stdout.write("{}\n");
          return 0;
        }
      } else {
        log.info(`No active loop found for session ${sessionId} — allowing exit`);
        if (verbose) {
          process.stderr.write(`[hook:run stop] No active loop found for session ${sessionId}\n`);
        }
        process.stdout.write("{}\n");
        return 0;
      }
    }
    sessionFile = await readSessionFile(filePath);
  } catch {
    log.warn(`Session file read error at ${filePath} — allowing exit`);
    process.stdout.write("{}\n");
    return 0;
  }

  const { state } = sessionFile;
  const prompt = sessionFile.prompt ?? "";

  if (state.maxIterations > 0 && state.iteration >= state.maxIterations) {
    if (verbose) {
      process.stderr.write(`[hook:run stop] Max iterations (${state.maxIterations}) reached\n`);
    }
    if (state.runId) {
      await appendStopHookEvent(state.runDir?.trim() || path.join(runsDir, state.runId), {
        sessionId,
        iteration: state.iteration,
        decision: "approve",
        reason: "max_iterations_reached",
        runState: "",
        pendingKinds: "",
        hasPromise: false,
      });
    }
    await cleanupSession(filePath);
    process.stdout.write("{}\n");
    return 0;
  }

  const now = getCurrentTimestamp();
  const updatedTimes =
    state.iteration >= 5
      ? updateIterationTimes(state.iterationTimes, state.lastIterationAt, now)
      : state.iterationTimes;

  if (isIterationTooFast(updatedTimes)) {
    if (verbose) {
      const avg = updatedTimes.reduce((a, b) => a + b, 0) / updatedTimes.length;
      process.stderr.write(`[hook:run stop] Iteration too fast (avg ${avg}s)\n`);
    }
    if (state.runId) {
      await appendStopHookEvent(state.runDir?.trim() || path.join(runsDir, state.runId), {
        sessionId,
        iteration: state.iteration,
        decision: "approve",
        reason: "iteration_too_fast",
        runState: "",
        pendingKinds: "",
        hasPromise: false,
      });
    }
    await cleanupSession(filePath);
    process.stdout.write("{}\n");
    return 0;
  }

  const runId = state.runId ?? "";
  const boundRunDir = state.runDir?.trim() || undefined;
  if (runId) {
    log.setContext("run", runId);
  }

  const { hasPromise, promiseValue } = parseAssistantStopState(
    hookInput as Record<string, unknown>,
    log,
  );

  if (!runId) {
    log.info("No run associated with session — allowing exit");
    if (verbose) {
      process.stderr.write(
        `[hook:run stop] No run associated with session ${sessionId} — allowing exit\n`,
      );
    }
    await cleanupSession(filePath);
    process.stdout.write("{}\n");
    return 0;
  }

  const runStateDetails = await resolveStopHookRunState({
    runId,
    runsDir,
    preferredRunDir: boundRunDir,
    log,
  });
  const {
    runState,
    completionProof,
    pendingKinds,
    onlyBreakpointsPending,
    entrypointImportPath,
    runDir,
    lookupError,
  } = runStateDetails;
  const runEventDir = runDir || boundRunDir || path.join(runsDir, runId);

  log.info(`Run state: ${runState || "unknown"}`);
  if (completionProof) {
    log.info("Completion proof available");
  }

  if (!runState) {
    const errorMessage =
      lookupError ??
      `Run ${runId} could not be resolved during the stop hook. Stored runDir=${boundRunDir ?? "(none)"} runsDir=${runsDir}`;
    log.error(errorMessage);
    process.stderr.write(`[hook:run stop] ${errorMessage}\n`);
    await appendStopHookEvent(runEventDir, {
      sessionId,
      iteration: state.iteration,
      decision: "approve",
      reason: "run_state_unknown",
      runState,
      pendingKinds,
      hasPromise,
    });
    process.stdout.write("{}\n");
    return 1;
  }

  if (runState === "waiting" && onlyBreakpointsPending) {
    log.info(`Run waiting on breakpoints only (${pendingKinds}) — allowing exit`);
    if (verbose) {
      process.stderr.write(
        "[hook:run stop] Run waiting on breakpoint(s) — allowing exit for human resolution\n",
      );
    }
    await appendStopHookEvent(runEventDir, {
      sessionId,
      iteration: state.iteration,
      decision: "approve",
      reason: "breakpoint_waiting",
      runState,
      pendingKinds,
      hasPromise,
    });
    process.stdout.write("{}\n");
    return 0;
  }

  if (hasPromise) {
    log.info("Detected valid promise tag");
  }
  if (completionProof && hasPromise && promiseValue === completionProof) {
    log.info("Promise matches completion proof — allowing exit");
    if (verbose) {
      process.stderr.write("[hook:run stop] Valid promise tag detected - run complete\n");
    }
    await appendStopHookEvent(runEventDir, {
      sessionId,
      iteration: state.iteration,
      decision: "approve",
      reason: "completion_proof_matched",
      runState,
      pendingKinds,
      hasPromise,
    });
    await cleanupSession(filePath);
    process.stdout.write("{}\n");
    return 0;
  }

  const nextIteration = state.iteration + 1;
  const currentTime = getCurrentTimestamp();
  const updatedState: SessionState = {
    ...state,
    iteration: nextIteration,
    lastIterationAt: currentTime,
    iterationTimes: updatedTimes,
  };

  try {
    await writeSessionFile(filePath, updatedState, prompt);
  } catch {
    if (verbose) {
      process.stderr.write("[hook:run stop] Failed to update session state\n");
    }
  }

  const { reason, systemMessage } = await buildStopHookContinuation({
    nextIteration,
    maxIterations: state.maxIterations,
    runState,
    pendingKinds,
    completionProof,
    prompt,
    resolvedPluginRoot,
    runId,
    runsDir: path.dirname(runDir),
    entrypointImportPath,
  });

  const output = { decision: "block", reason, systemMessage };
  await appendStopHookEvent(runEventDir, {
    sessionId,
    iteration: state.iteration,
    decision: "block",
    reason: "continue_loop",
    runState,
    pendingKinds,
    hasPromise,
  });

  process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  log.info(`Decision: block (iteration=${nextIteration}, maxIterations=${state.maxIterations})`);
  if (verbose) {
    process.stderr.write(
      `[hook:run stop] Blocking stop, iteration=${nextIteration} maxIterations=${state.maxIterations}\n`,
    );
  }

  if (!existsSync(runDir)) {
    log.warn(`Resolved run directory missing during stop hook: ${runDir}`);
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Session start hook handler
// ---------------------------------------------------------------------------

export async function handleClaudeCodeSessionStartHook(
  args: HookHandlerArgs,
): Promise<number> {
  const { verbose } = args;

  if (args.pluginRoot && !process.env.CLAUDE_PLUGIN_ROOT) {
    process.env.CLAUDE_PLUGIN_ROOT = path.resolve(args.pluginRoot);
  }
  if (args.stateDir && !process.env.BABYSITTER_STATE_DIR) {
    process.env.BABYSITTER_STATE_DIR = normalizeSessionStateDir(args.stateDir);
  }

  let rawInput: string;
  try {
    rawInput = await readStdin();
  } catch {
    process.stdout.write("{}\n");
    return 0;
  } finally {
    if (typeof process.stdin.unref === "function") {
      process.stdin.unref();
    }
  }

  const hookInput = parseHookInput(rawInput) as ClaudeCodeSessionStartHookInput;
  const sessionId = safeStr(hookInput as Record<string, unknown>, "session_id");
  if (!sessionId) {
    process.stdout.write("{}\n");
    return 0;
  }

  // hooks-proxy handles CLAUDE_ENV_FILE writes via native_env_file propagation backend
  const envFilePersisted = !!process.env.CLAUDE_ENV_FILE;

  const stateDir = normalizeSessionStateDir(
    args.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );

  let stateFilePersisted = false;
  if (stateDir) {
    const filePath = getSessionFilePath(stateDir, sessionId);
    try {
      if (!(await sessionFileExists(filePath))) {
        const nowTs = getCurrentTimestamp();
        const state: SessionState = {
          active: true,
          iteration: 1,
          maxIterations: 256,
          runId: "",
          runIds: [],
          startedAt: nowTs,
          lastIterationAt: nowTs,
          iterationTimes: [],
        };
        await writeSessionFile(filePath, state, "");
        stateFilePersisted = true;
        if (verbose) {
          process.stderr.write(`[hook:run session-start] Created session state: ${filePath}\n`);
        }
      } else {
        stateFilePersisted = true;
      }
    } catch {
      process.stderr.write(`[hook:run session-start] Failed to create session state in ${stateDir}\n`);
    }
  } else {
    process.stderr.write(
      "[hook:run session-start] Cannot resolve state directory — session state will not be persisted\n",
    );
  }

  try {
    const compressionCfg = loadCompressionConfig(process.cwd());
    const cacheLayer = compressionCfg.layers.processLibraryCache;
    if (compressionCfg.enabled && cacheLayer.enabled) {
      const libraryRoot = await getActiveProcessLibraryPath();
      if (libraryRoot) {
        const cacheDir = path.join(process.cwd(), ".a5c", "cache", "compression");
        const libraryFiles = findLibraryFiles(libraryRoot);
        for (const file of libraryFiles) {
          getOrCompressFile(file, cacheLayer.targetReduction, cacheLayer.ttlHours, cacheDir);
        }
        if (verbose) {
          process.stderr.write(
            `[hook:run session-start] Pre-warmed processLibraryCache for ${libraryFiles.length} file(s)\n`,
          );
        }
      }
    }
  } catch {
    // Best-effort
  }

  if (verbose) {
    process.stderr.write(`Babysitter session started: ${sessionId}\n`);
  }
  if (!envFilePersisted && !stateFilePersisted) {
    process.stderr.write(
      "[hook:run session-start] Session persistence failed — no env file or state file was written\n",
    );
    process.stdout.write("{}\n");
    return 1;
  }

  try {
    const { runSessionCleanup } = await import("../../session/cleanup");
    void runSessionCleanup({ harness: "claude-code", dryRun: false }).catch(() => {
      // non-fatal
    });
  } catch {
    // non-fatal
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `Your Claude Code session ID is: ${sessionId}`,
      },
    }) + "\n",
  );
  return 0;
}
