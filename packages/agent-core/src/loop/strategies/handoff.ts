/**
 * Handoff loop runner — the active agent explicitly transfers control.
 *
 * Starts with `entryAgentId`.  After each iteration the runner inspects
 * `result.handoffTarget`: if set, the next iteration uses that agent;
 * if not, the loop signals termination.
 *
 * `maxHandoffs` puts an upper bound on the total number of agent
 * switches to prevent infinite delegation chains.
 */

import type { AgentLoopIterationResult, HandoffStrategy } from "../types";

export type PromptFn<TInput, TOutput> = (
  input: TInput,
  agentId: string,
) => Promise<TOutput>;

/**
 * Callers that wish to signal a handoff should include a `handoffTarget`
 * property on their prompt output.  This interface describes the minimal
 * shape we inspect.
 */
export interface HandoffCapableOutput {
  handoffTarget?: string;
}

export interface HandoffLoopRunnerConfig {
  readonly strategy: HandoffStrategy;
  readonly agentIds: string[];
}

export class HandoffLoopRunner<TInput, TOutput> {
  private readonly entryAgentId: string;
  private readonly agentIds: ReadonlySet<string>;
  private readonly maxHandoffs: number;
  private readonly promptFn: PromptFn<TInput, TOutput>;

  private currentAgentId: string;
  private handoffCount = 0;
  private _terminated = false;

  constructor(
    config: HandoffLoopRunnerConfig,
    promptFn: PromptFn<TInput, TOutput>,
  ) {
    this.entryAgentId = config.strategy.entryAgentId;
    this.agentIds = new Set(config.agentIds);
    this.maxHandoffs = config.strategy.maxHandoffs ?? Infinity;
    this.promptFn = promptFn;
    this.currentAgentId = this.entryAgentId;
  }

  /** Whether the runner has signalled termination. */
  get terminated(): boolean {
    return this._terminated;
  }

  async run(
    input: TInput,
    iterationIndex: number,
  ): Promise<AgentLoopIterationResult<TOutput>> {
    if (this._terminated) {
      throw new Error("HandoffLoopRunner: loop has already terminated");
    }

    const agentId = this.currentAgentId;
    const start = Date.now();
    const output = await this.promptFn(input, agentId);
    const durationMs = Date.now() - start;

    // Determine if a handoff was requested
    const handoffTarget = this.extractHandoffTarget(output);

    if (handoffTarget) {
      if (this.handoffCount >= this.maxHandoffs) {
        // Max handoffs reached — terminate after this iteration
        this._terminated = true;
      } else {
        this.currentAgentId = handoffTarget;
        this.handoffCount++;
      }
    } else {
      // No handoff requested — signal termination
      this._terminated = true;
    }

    return {
      index: iterationIndex,
      agentId,
      output,
      durationMs,
      handoffTarget,
    };
  }

  reset(): void {
    this.currentAgentId = this.entryAgentId;
    this.handoffCount = 0;
    this._terminated = false;
  }

  /**
   * Extract a handoff target from the prompt output.
   *
   * Checks for an explicit `handoffTarget` property first, then
   * returns undefined (no handoff).
   */
  private extractHandoffTarget(output: TOutput): string | undefined {
    if (
      output !== null &&
      typeof output === "object" &&
      "handoffTarget" in output
    ) {
      const target = (output as HandoffCapableOutput).handoffTarget;
      return typeof target === "string" ? target : undefined;
    }
    return undefined;
  }
}
