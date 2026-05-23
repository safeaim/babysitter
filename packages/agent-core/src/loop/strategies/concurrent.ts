/**
 * Concurrent loop runner — runs promptFn for each agent in parallel.
 *
 * Uses Promise.allSettled so a single agent failure does not abort
 * the whole iteration.  Respects maxParallelism by batching agents
 * into groups that run sequentially.
 */

import type { AgentLoopIterationResult, ConcurrentStrategy } from "../types";

export type PromptFn<TInput, TOutput> = (
  input: TInput,
  agentId: string,
) => Promise<TOutput>;

export interface ConcurrentLoopRunnerConfig {
  readonly strategy: ConcurrentStrategy;
  readonly agentIds: string[];
}

/** Result wrapper that includes per-agent settled status. */
export interface ConcurrentIterationOutput<TOutput> {
  readonly results: ReadonlyArray<
    | { readonly status: "fulfilled"; readonly agentId: string; readonly output: TOutput }
    | { readonly status: "rejected"; readonly agentId: string; readonly reason: unknown }
  >;
}

export class ConcurrentLoopRunner<TInput, TOutput> {
  private readonly agentIds: readonly string[];
  private readonly maxParallelism: number;
  private readonly promptFn: PromptFn<TInput, TOutput>;

  constructor(
    config: ConcurrentLoopRunnerConfig,
    promptFn: PromptFn<TInput, TOutput>,
  ) {
    this.agentIds = config.agentIds;
    this.maxParallelism = config.strategy.maxParallelism ?? config.agentIds.length;
    this.promptFn = promptFn;
  }

  async run(
    input: TInput,
    iterationIndex: number,
  ): Promise<AgentLoopIterationResult<ConcurrentIterationOutput<TOutput>>> {
    const start = Date.now();

    const allResults: ConcurrentIterationOutput<TOutput>["results"][number][] = [];

    // Process agents in batches of maxParallelism
    for (let i = 0; i < this.agentIds.length; i += this.maxParallelism) {
      const batch = this.agentIds.slice(i, i + this.maxParallelism);
      const settled = await Promise.allSettled(
        batch.map((agentId) => this.promptFn(input, agentId)),
      );

      for (let j = 0; j < settled.length; j++) {
        const s = settled[j]!;
        const agentId = batch[j]!;
        if (s.status === "fulfilled") {
          allResults.push({ status: "fulfilled", agentId, output: s.value });
        } else {
          allResults.push({ status: "rejected", agentId, reason: s.reason });
        }
      }
    }

    const durationMs = Date.now() - start;

    return {
      index: iterationIndex,
      agentId: this.agentIds[0] ?? "concurrent",
      output: { results: allResults },
      durationMs,
    };
  }
}
