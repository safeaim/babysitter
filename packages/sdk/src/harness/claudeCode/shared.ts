import { appendFileSync } from "node:fs";

// Re-export shared utilities so existing internal consumers don't break.
export {
  type HookLogger,
  createHookLogger,
  readStdin,
  parseHookInput,
  safeStr,
  countPendingByKind,
  isOnlyBreakpoints,
  appendStopHookEvent,
  cleanupSession,
} from "../hooks/utils";

export interface ClaudeCodeStopHookInput {
  session_id?: string;
  transcript_path?: string;
  last_assistant_message?: string;
}

export interface ClaudeCodeSessionStartHookInput {
  session_id?: string;
}

/**
 * @deprecated PID-marker session resolution has been removed.
 * hooks-proxy now handles session ID via AGENT_SESSION_ID.
 * Always returns undefined.
 */
export function getCurrentSessionIdFilePath(): string | undefined {
  return undefined;
}

/**
 * Resolve the current session ID.
 *
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
 *
 * Simplified: hooks-proxy propagates AGENT_SESSION_ID.
 * PID-marker and env-file fallback logic has been removed.
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

export function setBabysitterSessionIdInEnvFile(
  envFile: string,
  sessionId: string,
): void {
  appendFileSync(envFile, `export AGENT_SESSION_ID="${sessionId}"\n`);
}
