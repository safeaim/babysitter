/**
 * Mapping from babysitter harness identifiers to agent-mux adapter names.
 *
 * Pi is intentionally excluded -- it uses piWrapper directly rather than
 * the agent-mux subprocess model.
 *
 * @module harness/amux/amuxHarnessMap
 */

/**
 * Maps babysitter-harness names (as used in HARNESS_CLI_MAP) to the
 * corresponding agent-mux adapter identifier.
 */
export const HARNESS_TO_AMUX_ADAPTER: Readonly<Record<string, string>> = {
  "claude-code": "claude",
  "codex": "codex",
  "gemini-cli": "gemini",
  "github-copilot": "copilot",
  "cursor": "cursor",
  "opencode": "opencode",
  "openclaw": "openclaw",
  "oh-my-pi": "omp",
  // Pi is NOT here -- uses piWrapper directly.
};

/**
 * Resolve a babysitter harness name to an agent-mux adapter name.
 *
 * @throws {Error} if `harness` is "pi" (Pi uses piWrapper, not agent-mux)
 *         or if the harness has no known mapping.
 */
export function mapHarnessToAmuxAdapter(harness: string): string {
  if (harness === "pi" || harness === "internal") {
    throw new Error(
      `Harness "${harness}" uses piWrapper and cannot be invoked via agent-mux.`,
    );
  }
  const adapter = HARNESS_TO_AMUX_ADAPTER[harness];
  if (!adapter) {
    throw new Error(
      `No agent-mux adapter mapping for harness "${harness}". ` +
      `Known mappings: ${Object.keys(HARNESS_TO_AMUX_ADAPTER).join(", ")}`,
    );
  }
  return adapter;
}

/**
 * Check whether a harness name has a corresponding agent-mux adapter.
 */
export function hasAmuxAdapter(harness: string): boolean {
  return harness in HARNESS_TO_AMUX_ADAPTER;
}
