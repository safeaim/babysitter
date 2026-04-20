/**
 * Codex hook handlers and shared utilities.
 * Extracted from codex/hooks.ts and codex/shared.ts.
 */

import * as path from "node:path";
import { normalizeSessionStateDir } from "../../config";
import { resolveSessionIdWithMarker } from "../../utils/sessionMarker";
import { writeSessionMarker } from "../../utils/sessionMarker";
import type { HarnessAdapter, HookHandlerArgs } from "../types";
import {
  initializeSessionState,
  parseHookInput,
  readStdin,
  safeStr,
} from "./utils";

// ---------------------------------------------------------------------------
// Shared utilities (from codex/shared.ts)
// ---------------------------------------------------------------------------

export function resolveCodexPluginRoot(
  args: { pluginRoot?: string } = {},
): string | undefined {
  const root = args.pluginRoot
    || process.env.CODEX_PLUGIN_ROOT
    || process.env.AGENT_PLUGIN_ROOT;
  return root ? path.resolve(root) : undefined;
}

export function resolveCodexStateDir(args: {
  stateDir?: string;
  pluginRoot?: string;
}): string {
  return normalizeSessionStateDir(
    args.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
}

export function resolveCodexSessionId(parsed: {
  sessionId?: string;
}): string | undefined {
  return resolveSessionIdWithMarker("codex", parsed, [
    "CODEX_THREAD_ID",
    "CODEX_SESSION_ID",
  ]);
}

function firstString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

export function normalizeCodexHookInput(
  raw: string,
): Record<string, unknown> {
  const parsed = parseHookInput(raw);
  const allowAmbientFallback = Object.keys(parsed).length > 0;
  const sessionId =
    firstString(parsed, [
      "session_id",
      "sessionId",
      "thread_id",
      "threadId",
      "conversation_id",
      "conversationId",
    ]) || (allowAmbientFallback ? resolveCodexSessionId({}) : undefined);

  const transcriptPath = firstString(parsed, [
    "transcript_path",
    "transcriptPath",
  ]);
  const lastAssistantMessage = firstString(parsed, [
    "last_assistant_message",
    "lastAssistantMessage",
    "assistant_message",
    "assistantMessage",
  ]);

  return {
    ...parsed,
    ...(sessionId ? { session_id: sessionId } : {}),
    ...(transcriptPath ? { transcript_path: transcriptPath } : {}),
    ...(lastAssistantMessage
      ? { last_assistant_message: lastAssistantMessage }
      : {}),
  };
}

export function getFirstCodexString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  return firstString(obj, keys);
}

// ---------------------------------------------------------------------------
// Hook handlers (from codex/hooks.ts)
// ---------------------------------------------------------------------------

export async function handleCodexStopHook(
  args: HookHandlerArgs,
  claude: Pick<HarnessAdapter, "handleStopHook">,
): Promise<number> {
  let rawInput = "";
  try {
    rawInput = await readStdin();
  } catch {
    rawInput = "";
  }

  // hooks-proxy now handles all input normalization.
  // Pass the raw input directly to the stop hook handler.
  return claude.handleStopHook({
    ...args,
    pluginRoot: resolveCodexPluginRoot({ pluginRoot: args.pluginRoot }),
    stateDir: resolveCodexStateDir({
      stateDir: args.stateDir,
      pluginRoot: args.pluginRoot,
    }),
    stdinPayload: rawInput,
  });
}

export async function handleCodexSessionStartHook(
  args: HookHandlerArgs,
): Promise<number> {
  const { verbose } = args;

  let rawInput = "";
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

  // hooks-proxy now handles all input normalization.
  const parsed = parseHookInput(rawInput);
  const sessionId = safeStr(parsed, "session_id");
  if (!sessionId) {
    process.stdout.write("{}\n");
    return 0;
  }

  try {
    writeSessionMarker("codex", sessionId);
  } catch {
    // Non-fatal: marker is a best-effort mechanism
  }

  const stateDir = resolveCodexStateDir({
    stateDir: args.stateDir,
    pluginRoot: args.pluginRoot,
  });

  await initializeSessionState(sessionId, stateDir, { verbose });

  process.stdout.write("{}\n");
  return 0;
}
