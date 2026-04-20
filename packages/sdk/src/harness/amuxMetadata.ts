/**
 * Resolves adapter metadata from @a5c-ai/agent-mux.
 * Used by babysitter adapters to derive capabilities, env signals, etc.
 *
 * agent-mux adapters carry comprehensive per-adapter metadata:
 * - hostEnvSignals: env vars indicating the harness is active
 * - capabilities: AgentCapabilities with fields like supportsSkills, supportsThinking, etc.
 * - models: ModelCapabilities with context windows, pricing
 * - sessionDir(): where sessions are stored
 *
 * Instead of duplicating this data, babysitter adapters import it.
 */

/**
 * Subset of agent-mux AgentCapabilities relevant to babysitter orchestration.
 */
export interface AmuxCapabilitiesSubset {
  supportsSkills: boolean;
  supportsThinking: boolean;
  supportsMCP: boolean;
  requiresToolApproval: boolean;
  supportsInteractiveMode: boolean;
  supportsStdinInjection: boolean;
  supportsSubagentDispatch: boolean;
  supportsParallelExecution: boolean;
  supportsImageInput: boolean;
  /** Whether the harness supports runtime hooks (stop-hook, pre-tool-use, etc.) */
  hasRuntimeHooks: boolean;
  /** Whether the harness has a blocking stop hook. */
  hasStopHook: boolean;
}

/**
 * Metadata resolved from an agent-mux adapter instance.
 */
export interface AmuxAdapterMetadata {
  /** The agent name in agent-mux (e.g. 'claude', 'codex', 'gemini'). */
  name: string;
  /** Env vars that indicate this harness is active. */
  hostEnvSignals: readonly string[];
  /** Subset of capabilities relevant to babysitter. */
  capabilities: AmuxCapabilitiesSubset;
  /** Session directory (resolved). */
  sessionDir: string;
}

// ---------------------------------------------------------------------------
// Name mapping (babysitter harness name -> agent-mux adapter name)
// ---------------------------------------------------------------------------

const HARNESS_TO_AMUX_NAME: Record<string, string> = {
  "claude-code": "claude",
  "gemini-cli": "gemini",
  "github-copilot": "copilot",
  "oh-my-pi": "omp",
};

function mapHarnessName(name: string): string {
  return HARNESS_TO_AMUX_NAME[name] || name;
}

// ---------------------------------------------------------------------------
// Internal types for the dynamic require from @a5c-ai/agent-mux
// ---------------------------------------------------------------------------

/** Minimal type for the adapter registry returned by createClient(). */
interface AmuxAdapterRegistry {
  get(agent: string): AmuxRawAdapter | undefined;
}

/** Minimal adapter shape we read from agent-mux. */
interface AmuxRawAdapter {
  agent?: string;
  hostEnvSignals?: readonly string[];
  capabilities?: AmuxRawCapabilities;
  sessionDir?: (cwd?: string) => string;
}

/** Minimal capabilities shape. */
interface AmuxRawCapabilities {
  supportsSkills?: boolean;
  supportsThinking?: boolean;
  supportsMCP?: boolean;
  requiresToolApproval?: boolean;
  supportsInteractiveMode?: boolean;
  supportsStdinInjection?: boolean;
  supportsSubagentDispatch?: boolean;
  supportsParallelExecution?: boolean;
  supportsImageInput?: boolean;
  runtimeHooks?: Record<string, string>;
}

/** Minimal client shape. */
interface AmuxClient {
  adapters: AmuxAdapterRegistry;
}

// ---------------------------------------------------------------------------
// Cached metadata lookup
// ---------------------------------------------------------------------------

let _metadataCache: Map<string, AmuxAdapterMetadata | null> | undefined;

function getCache(): Map<string, AmuxAdapterMetadata | null> {
  if (!_metadataCache) {
    _metadataCache = new Map();
  }
  return _metadataCache;
}

/**
 * Get metadata for a harness from agent-mux's adapter registry.
 * Returns null if agent-mux is not available or the adapter is not found.
 *
 * Results are cached for the lifetime of the process.
 */
export function getAmuxAdapterMetadata(harnessName: string): AmuxAdapterMetadata | null {
  const cache = getCache();
  const amuxName = mapHarnessName(harnessName);

  if (cache.has(amuxName)) {
    return cache.get(amuxName) ?? null;
  }

  try {
    // Dynamic require to avoid hard failure when agent-mux is not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const amux: Record<string, unknown> = require("@a5c-ai/agent-mux");
    const createClient = amux.createClient as (() => AmuxClient) | undefined;
    const registerBuiltInAdapters = amux.registerBuiltInAdapters as ((client: AmuxClient) => void) | undefined;

    if (!createClient || !registerBuiltInAdapters) {
      cache.set(amuxName, null);
      return null;
    }

    const client = createClient();
    registerBuiltInAdapters(client);

    const adapter = client.adapters.get(amuxName);
    if (!adapter) {
      cache.set(amuxName, null);
      return null;
    }

    const caps = adapter.capabilities;
    if (!caps) {
      cache.set(amuxName, null);
      return null;
    }

    // Determine if the adapter has a stop hook
    const runtimeHooks = caps.runtimeHooks;
    const hasStopHook = !!(
      runtimeHooks &&
      typeof runtimeHooks === "object" &&
      "stop" in runtimeHooks &&
      runtimeHooks.stop !== "none"
    );
    const hasRuntimeHooks = !!(
      runtimeHooks &&
      typeof runtimeHooks === "object" &&
      Object.values(runtimeHooks).some((v: unknown) => v !== "none")
    );

    const metadata: AmuxAdapterMetadata = {
      name: adapter.agent ?? amuxName,
      hostEnvSignals: adapter.hostEnvSignals ?? [],
      capabilities: {
        supportsSkills: caps.supportsSkills ?? false,
        supportsThinking: caps.supportsThinking ?? false,
        supportsMCP: caps.supportsMCP ?? false,
        requiresToolApproval: caps.requiresToolApproval ?? false,
        supportsInteractiveMode: caps.supportsInteractiveMode ?? false,
        supportsStdinInjection: caps.supportsStdinInjection ?? false,
        supportsSubagentDispatch: caps.supportsSubagentDispatch ?? false,
        supportsParallelExecution: caps.supportsParallelExecution ?? false,
        supportsImageInput: caps.supportsImageInput ?? false,
        hasRuntimeHooks,
        hasStopHook,
      },
      sessionDir: typeof adapter.sessionDir === "function"
        ? adapter.sessionDir()
        : ".a5c/runs",
    };

    cache.set(amuxName, metadata);
    return metadata;
  } catch {
    // agent-mux not available — graceful degradation
    cache.set(amuxName, null);
    return null;
  }
}

/**
 * Clear the metadata cache. Useful for testing.
 */
export function clearAmuxMetadataCache(): void {
  _metadataCache = undefined;
}
