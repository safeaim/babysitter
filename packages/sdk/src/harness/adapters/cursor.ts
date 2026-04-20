/**
 * Cursor harness adapter.
 *
 * Derives metadata from @a5c-ai/agent-mux. Extends BaseHarnessAdapter with
 * Cursor-specific behavior:
 * - Custom bindSession (inline, not shared helper)
 * - Hook dispatcher path resolution
 * - Supported hook types enumeration
 */

import * as path from "node:path";
import { existsSync } from "node:fs";
import { HarnessCapability as Cap } from "../types";
import type {
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { normalizeSessionStateDir } from "../../config";
import { BaseHarnessAdapter, type AdapterConfig } from "../BaseAdapter";
import { createDefaultCliSetupSnippet, createPromptContext } from "../../prompts/contextShared";
import { readSessionMarker } from "../../utils/sessionMarker";
import {
  getSessionFilePath,
  readSessionFile,
  sessionFileExists,
} from "../../session/parse";
import type { SessionState } from "../../session/types";
import {
  getCurrentTimestamp,
  updateSessionState,
  writeSessionFile,
} from "../../session/write";
import { getAmuxAdapterMetadata } from "../amuxMetadata";
import { deriveAdapterConfig } from "../derivePromptContext";

export function resolveCursorStateDir(args: {
  stateDir?: string;
  pluginRoot?: string;
}): string {
  return normalizeSessionStateDir(
    args.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
}

// ---------------------------------------------------------------------------
// Config derivation from agent-mux
// ---------------------------------------------------------------------------

function buildConfig(): AdapterConfig {
  const metadata = getAmuxAdapterMetadata("cursor");
  const config = deriveAdapterConfig(metadata, {
    name: "cursor",
    displayName: "Cursor",
    extraActivationEnvVars: ["CURSOR_PROJECT_DIR", "CURSOR_VERSION"],
    pluginRootEnvVars: ["CURSOR_PLUGIN_ROOT"],
    sessionIdEnvVars: ["AGENT_SESSION_ID"],
    pluginRootVar: "${CURSOR_PLUGIN_ROOT}",
    interactiveToolName: "AskUserQuestion tool",
    sessionEnvVars: "conversation_id from hook stdin (authoritative per-request); PID-scoped session marker; AGENT_SESSION_ID fallback",
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
    capabilities: [Cap.HeadlessPrompt, Cap.StopHook, Cap.SessionBinding, Cap.Mcp],
    promptCapabilities: ["hooks", "stop-hook", "mcp", "task-tool", "breakpoint-routing"],
  });
  // Cursor does not auto-resolve sessions
  config.autoResolvesSession = false;
  return config;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class CursorAdapter extends BaseHarnessAdapter {
  constructor() {
    super(buildConfig());
  }

  override getMissingSessionIdHint(): string {
    return (
      "Cursor provides conversation_id only via hook stdin JSON (not as an " +
      "env var). Ensure the sessionStart hook is configured in .cursor/hooks.json " +
      "and is persisting the conversation_id to the state file. Pass --session-id " +
      "explicitly if running outside of the hook context."
    );
  }

  override supportsHookType(hookType: string): boolean {
    const supported = new Set([
      "stop", "session-start", "session-end", "post-tool-use",
      "after-file-edit", "after-shell-execution", "before-shell-execution",
      "before-mcp-execution", "after-mcp-execution", "before-read-file",
      "pre-tool-use", "post-tool-use-failure", "subagent-start",
      "subagent-stop", "pre-compact", "before-submit-prompt",
      "before-tab-file-read", "after-tab-file-edit",
    ]);
    return supported.has(hookType);
  }

  override getUnsupportedHookMessage(hookType: string): string {
    if (hookType === "after-agent-response" || hookType === "after-agent-thought") {
      return `The "${hookType}" hook type does not fire in Cursor headless CLI mode (only in the IDE).`;
    }
    return `Hook type "${hookType}" is not supported by the Cursor adapter.`;
  }

  override resolveSessionId(parsed: { sessionId?: string }): string | undefined {
    if (parsed.sessionId) return parsed.sessionId;
    const trustEnv =
      process.env.AGENT_TRUST_ENV_SESSION === "1" ||
      process.env.BABYSITTER_TRUST_ENV_SESSION === "1";
    const agentSessionId = process.env.AGENT_SESSION_ID;
    if (trustEnv) {
      if (agentSessionId) return agentSessionId;
      return undefined;
    }
    if (agentSessionId) return agentSessionId;
    const fromMarker = readSessionMarker("cursor");
    if (fromMarker) return fromMarker;
    return undefined;
  }

  override resolveStateDir(args: { stateDir?: string; pluginRoot?: string }): string | undefined {
    return resolveCursorStateDir(args);
  }

  override async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
    const { sessionId, runId, maxIterations = 256, prompt, verbose } = opts;
    const stateDir = resolveCursorStateDir({
      stateDir: opts.stateDir,
      pluginRoot: opts.pluginRoot,
    });
    const filePath = getSessionFilePath(stateDir, sessionId);

    if (await sessionFileExists(filePath)) {
      try {
        const existing = await readSessionFile(filePath);
        if (existing.state.runId && existing.state.runId !== runId) {
          return {
            harness: "cursor",
            sessionId,
            stateFile: filePath,
            error: `Session already associated with run: ${existing.state.runId}`,
          };
        }
        await updateSessionState(
          filePath,
          { runId, active: true },
          { state: existing.state, prompt: existing.prompt },
        );
        if (verbose) {
          process.stderr.write(
            `[run:create] Updated existing session ${sessionId} with run ${runId}\n`,
          );
        }
        return { harness: "cursor", sessionId, stateFile: filePath };
      } catch {
        // Corrupted state file — overwrite
      }
    }

    const nowTs = getCurrentTimestamp();
    const state: SessionState = {
      active: true,
      iteration: 1,
      maxIterations,
      runId,
      runIds: [],
      startedAt: nowTs,
      lastIterationAt: nowTs,
      iterationTimes: [],
    };

    try {
      await writeSessionFile(filePath, state, prompt);
    } catch (e) {
      return {
        harness: "cursor",
        sessionId,
        error: `Failed to write session state: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    if (verbose) {
      process.stderr.write(
        `[run:create] Session ${sessionId} initialized and bound to run ${runId}\n`,
      );
    }
    return { harness: "cursor", sessionId, stateFile: filePath };
  }

  override findHookDispatcherPath(_startCwd: string): string | null {
    const pluginRoot = process.env.CURSOR_PLUGIN_ROOT;
    if (pluginRoot) {
      const candidate = path.join(
        path.resolve(pluginRoot),
        "hooks",
        "stop-hook.sh",
      );
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  override getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
    return createPromptContext({
      harness: "cursor",
      harnessLabel: "Cursor",
      capabilities: ["hooks", "stop-hook", "mcp", "task-tool", "breakpoint-routing"],
      pluginRootVar: "${CURSOR_PLUGIN_ROOT}",
      loopControlTerm: "stop-hook",
      sessionBindingFlags: "",
      hookDriven: true,
      interactiveToolName: "AskUserQuestion tool",
      sessionEnvVars: "conversation_id from hook stdin (authoritative per-request); PID-scoped session marker; AGENT_SESSION_ID fallback",
      resumeFlags: "",
      cliSetupSnippet: createDefaultCliSetupSnippet(),
      iterateFlags: "",
      hasIntentFidelityChecks: false,
      hasNonNegotiables: false,
    }, opts);
  }

  // handleStopHook and handleSessionStartHook use BaseAdapter defaults
}

export function createCursorAdapter(): CursorAdapter {
  return new CursorAdapter();
}
