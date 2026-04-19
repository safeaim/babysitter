/**
 * Minimal agent-mux interfaces needed by babysitter-harness.
 *
 * These are interface-first definitions that match agent-mux's actual API
 * surface but are *owned* by babysitter-harness so no real @agent-mux/core
 * dependency is required. When agent-mux is published to npm, wire these
 * to the real types via a thin adapter or re-export.
 *
 * @module harness/amux/amuxTypes
 */

// ---------------------------------------------------------------------------
// Run options (maps to AgentMuxClient.run() options)
// ---------------------------------------------------------------------------

/**
 * Options accepted by AgentMuxClient.run().
 *
 * Only the fields babysitter-harness actually uses are listed here.
 * The real @agent-mux/core type may have more.
 */
export interface AmuxRunOptions {
  /** Agent-mux adapter name (e.g. "claude", "codex", "gemini"). */
  agent: string;
  /** Prompt text (or array for multi-turn). */
  prompt: string | string[];
  /** Model identifier override. */
  model?: string;
  /** Working directory for the agent invocation. */
  cwd?: string;
  /** Session ID for session resumption. */
  sessionId?: string;
  /** Maximum execution time in ms. */
  timeout?: number;
  /** Tool approval mode. */
  approvalMode?: "yolo" | "prompt" | "deny";
  /** Whether to stream events. */
  stream?: boolean;
  /** Suppress interactive prompts. */
  nonInteractive?: boolean;
  /** Maximum agent turns before force-stop. */
  maxTurns?: number;
  /** Additional environment variables for the subprocess. */
  env?: Record<string, string>;
  /** Hook configuration forwarded to the agent. */
  hooks?: unknown;
  /** Skills to enable for this run. */
  skills?: string[];
}

// ---------------------------------------------------------------------------
// Run handle (returned by AgentMuxClient.run())
// ---------------------------------------------------------------------------

/**
 * Handle returned by AgentMuxClient.run().
 *
 * Provides an async-iterable event stream, an interaction channel for
 * responding to approval requests, and run lifecycle metadata.
 */
export interface AmuxRunHandle {
  /** Async-iterable stream of normalised agent events. */
  events: AsyncIterable<AmuxAgentEvent>;
  /** Channel for responding to interactive requests (approvals, inputs). */
  interactions: AmuxInteractionChannel;
  /** Session ID allocated or resumed by agent-mux. */
  sessionId?: string;
  /** Process exit code (set after the event stream ends). */
  exitCode?: number;
  /** Abort the running agent process. */
  abort(): void;
}

// ---------------------------------------------------------------------------
// Agent event (normalised event from any adapter)
// ---------------------------------------------------------------------------

/**
 * Canonical agent event emitted by agent-mux adapters.
 *
 * Known `type` values:
 *   session_start, session_end, text_delta, thinking_delta,
 *   tool_call_start, tool_result, cost, token_usage,
 *   approval_request, input_required, error, crash,
 *   context_compacted
 */
export interface AmuxAgentEvent {
  /** Event type discriminator. */
  type: string;
  /** Run identifier assigned by agent-mux. */
  runId: string;
  /** Adapter/agent name that produced the event. */
  agent: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Arbitrary additional fields (schema depends on `type`). */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Interaction channel
// ---------------------------------------------------------------------------

/**
 * Channel for responding to interactive events (approval_request,
 * input_required) during a run.
 */
export interface AmuxInteractionChannel {
  /** Respond to an interactive request by its ID. */
  respond(id: string, response: unknown): Promise<void>;
}

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

/**
 * Programmatic client for invoking agents via agent-mux.
 *
 * babysitter-harness depends on this interface only; the concrete
 * implementation can be backed by the real @agent-mux/core library,
 * a mock, or a subprocess adapter.
 */
export interface AmuxClient {
  /** Start an agent run and return a handle for streaming events. */
  run(options: AmuxRunOptions): AmuxRunHandle;
}

// ---------------------------------------------------------------------------
// Adapter discovery (optional, for harness:discover integration)
// ---------------------------------------------------------------------------

/** Metadata about an agent-mux adapter. */
export interface AmuxAdapterInfo {
  /** Adapter identifier (e.g. "claude", "codex"). */
  agent: string;
  /** Human-readable display name. */
  displayName: string;
}

/** Result of checking whether an adapter's CLI is installed. */
export interface AmuxAdapterInstallationCheck {
  /** Whether the CLI binary is found on PATH. */
  installed: boolean;
  /** Detected version, if available. */
  version?: string;
}

/** Result of checking adapter authentication state. */
export interface AmuxAuthCheck {
  /** Auth state discriminator. */
  state: "authenticated" | "unauthenticated" | "unknown";
}

/**
 * Extended client interface that exposes adapter discovery.
 * Only needed when replacing babysitter's harness:discover command.
 */
export interface AmuxClientWithDiscovery extends AmuxClient {
  adapters: {
    list(): AmuxAdapterInfo[];
    detectInstallation(agent: string): Promise<AmuxAdapterInstallationCheck>;
  };
  auth: {
    check(agent: string): Promise<AmuxAuthCheck>;
  };
}
