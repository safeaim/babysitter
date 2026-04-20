/**
 * Codex harness adapter.
 *
 * Derives metadata from @a5c-ai/agent-mux. Extends BaseHarnessAdapter with
 * Codex-specific behavior:
 * - Codex-specific session/plugin root resolution
 * - Session binding with auto-release
 */

import * as path from "node:path";
import { HarnessCapability as Cap } from "../types";
import type {
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { normalizeSessionStateDir } from "../../config";
import { resolveSessionIdWithMarker } from "../../utils/sessionMarker";
import { BaseHarnessAdapter, type AdapterConfig } from "../BaseAdapter";
import { bindSession } from "../hooks/sessionBinding";
import { createDefaultCliSetupSnippet, createPromptContext } from "../../prompts/contextShared";
import { getAmuxAdapterMetadata } from "../amuxMetadata";
import { deriveAdapterConfig } from "../derivePromptContext";

// ---------------------------------------------------------------------------
// Shared utilities (previously in codexHooks.ts)
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

// ---------------------------------------------------------------------------
// Config derivation from agent-mux
// ---------------------------------------------------------------------------

function buildConfig(): AdapterConfig {
  const metadata = getAmuxAdapterMetadata("codex");
  return deriveAdapterConfig(metadata, {
    name: "codex",
    displayName: "Codex",
    extraActivationEnvVars: ["CODEX_THREAD_ID", "CODEX_PLUGIN_ROOT"],
    pluginRootEnvVars: ["CODEX_PLUGIN_ROOT", "AGENT_PLUGIN_ROOT"],
    sessionIdEnvVars: ["CODEX_THREAD_ID", "CODEX_SESSION_ID", "AGENT_SESSION_ID"],
    pluginRootVar: "${CODEX_PLUGIN_ROOT}",
    interactiveToolName: "AskUserQuestion tool",
    sessionEnvVars: "PID-scoped session marker (authoritative); CODEX_THREAD_ID/CODEX_SESSION_ID and AGENT_SESSION_ID are fallbacks",
    hasIntentFidelityChecks: true,
    hasNonNegotiables: true,
    capabilities: [Cap.SessionBinding, Cap.StopHook, Cap.HeadlessPrompt],
    promptCapabilities: ["hooks", "stop-hook", "ask-user-question", "task-tool", "breakpoint-routing"],
  });
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class CodexAdapter extends BaseHarnessAdapter {
  constructor() {
    super(buildConfig());
  }

  override getMissingSessionIdHint(): string {
    return (
      "Use --session-id explicitly, or launch through a Codex hook callback " +
      "that provides a stable session/thread ID."
    );
  }

  override supportsHookType(_hookType: string): boolean {
    return true;
  }

  override resolveSessionId(parsed: { sessionId?: string }): string | undefined {
    return resolveCodexSessionId(parsed);
  }

  override resolveStateDir(args: { stateDir?: string; pluginRoot?: string }): string | undefined {
    return resolveCodexStateDir(args);
  }

  override resolvePluginRoot(args: { pluginRoot?: string }): string | undefined {
    return resolveCodexPluginRoot(args);
  }

  override async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
    const stateDir = resolveCodexStateDir({
      stateDir: opts.stateDir,
      pluginRoot: opts.pluginRoot,
    });
    return bindSession({
      harness: "codex",
      stateDir,
      opts,
      autoReleaseStale: true,
    });
  }

  override getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
    return createPromptContext({
      harness: "codex",
      harnessLabel: "Codex",
      capabilities: ["hooks", "stop-hook", "ask-user-question", "task-tool", "breakpoint-routing"],
      pluginRootVar: "${CODEX_PLUGIN_ROOT}",
      loopControlTerm: "stop-hook",
      sessionBindingFlags: "",
      hookDriven: true,
      interactiveToolName: "AskUserQuestion tool",
      sessionEnvVars:
        "PID-scoped session marker (authoritative); CODEX_THREAD_ID/CODEX_SESSION_ID and AGENT_SESSION_ID are fallbacks",
      resumeFlags: "",
      cliSetupSnippet: createDefaultCliSetupSnippet(),
      iterateFlags: "",
      hasIntentFidelityChecks: true,
      hasNonNegotiables: true,
    }, opts);
  }

  // handleStopHook and handleSessionStartHook use BaseAdapter defaults
}

export function createCodexAdapter(): CodexAdapter {
  return new CodexAdapter();
}
