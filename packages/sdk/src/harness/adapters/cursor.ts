/**
 * Cursor harness adapter.
 *
 * Derives all behavior from BaseHarnessAdapter + agent-mux metadata.
 */

import { HarnessCapability as Cap } from "../types";
import { BaseHarnessAdapter, type AdapterConfig } from "../BaseAdapter";
import { getAmuxAdapterMetadata } from "../amuxMetadata";
import { deriveAdapterConfig } from "../derivePromptContext";

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
    sessionEnvVars: "AGENT_SESSION_ID",
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
    capabilities: [Cap.HeadlessPrompt, Cap.StopHook, Cap.SessionBinding, Cap.Mcp],
    promptCapabilities: ["hooks", "stop-hook", "mcp", "task-tool", "breakpoint-routing"],
    supportedHookTypes: [
      "stop", "session-start", "session-end", "post-tool-use",
      "after-file-edit", "after-shell-execution", "before-shell-execution",
      "before-mcp-execution", "after-mcp-execution", "before-read-file",
      "pre-tool-use", "post-tool-use-failure", "subagent-start",
      "subagent-stop", "pre-compact", "before-submit-prompt",
      "before-tab-file-read", "after-tab-file-edit",
    ],
    missingSessionIdHint:
      "Cursor provides conversation_id only via hook stdin JSON (not as an " +
      "env var). Ensure the sessionStart hook is configured in .cursor/hooks.json " +
      "and is persisting the conversation_id to the state file. Pass --session-id " +
      "explicitly if running outside of the hook context.",
  });
  config.autoResolvesSession = false;
  return config;
}

class CursorAdapter extends BaseHarnessAdapter {
  constructor() {
    super(buildConfig());
  }
}

export function createCursorAdapter(): CursorAdapter {
  return new CursorAdapter();
}
