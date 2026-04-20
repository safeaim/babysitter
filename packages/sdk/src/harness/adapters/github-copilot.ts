/**
 * GitHub Copilot harness adapter.
 *
 * Derives metadata from @a5c-ai/agent-mux.
 */

import * as path from "node:path";
import { appendFileSync, readFileSync } from "node:fs";
import { HarnessCapability as Cap } from "../types";
import type {
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { normalizeSessionStateDir } from "../../config";
import { BaseHarnessAdapter, type AdapterConfig } from "../BaseAdapter";
import { createDefaultCliSetupSnippet, createPromptContext } from "../../prompts/contextShared";
import { bindSession } from "../hooks/sessionBinding";
import { readSessionMarker } from "../../utils/sessionMarker";
import { getAmuxAdapterMetadata } from "../amuxMetadata";
import { deriveAdapterConfig } from "../derivePromptContext";

// ---------------------------------------------------------------------------
// Utilities (previously in githubCopilotHooks.ts)
// ---------------------------------------------------------------------------

export function setBabysitterSessionIdInCopilotEnvFile(
  envFile: string,
  sessionId: string,
): void {
  appendFileSync(envFile, `export AGENT_SESSION_ID="${sessionId}"\n`);
}

export function resolveGithubCopilotStateDir(args: {
  stateDir?: string;
  pluginRoot?: string;
}): string {
  return normalizeSessionStateDir(args.stateDir ?? process.env.BABYSITTER_STATE_DIR);
}

export function resolveGithubCopilotSessionId(parsed: {
  sessionId?: string;
}): string | undefined {
  if (parsed.sessionId) {
    return parsed.sessionId;
  }

  const trustEnv =
    process.env.AGENT_TRUST_ENV_SESSION === "1" ||
    process.env.BABYSITTER_TRUST_ENV_SESSION === "1";
  const agentSessionId =
    process.env.AGENT_SESSION_ID;
  if (trustEnv) {
    if (agentSessionId) {
      return agentSessionId;
    }
    const trustedEnvFile = process.env.COPILOT_ENV_FILE || process.env.CLAUDE_ENV_FILE;
    if (trustedEnvFile) {
      try {
        const content = readFileSync(trustedEnvFile, "utf-8");
        const agentMatch = content.match(
          /(?:^|\n)\s*(?:export\s+)?AGENT_SESSION_ID="([^"]+)"/,
        );
        if (agentMatch?.[1]) {
          return agentMatch[1];
        }
      } catch {
        // Fall through
      }
    }
    if (process.env.COPILOT_SESSION_ID) {
      return process.env.COPILOT_SESSION_ID;
    }
    return undefined;
  }

  const envFile = process.env.COPILOT_ENV_FILE || process.env.CLAUDE_ENV_FILE;
  if (envFile) {
    try {
      const content = readFileSync(envFile, "utf-8");
      const agentMatches = [
        ...content.matchAll(/export AGENT_SESSION_ID="([^"]+)"/g),
      ];
      const agentLast = agentMatches.at(-1)?.[1];
      if (agentLast) {
        return agentLast;
      }
    } catch {
      // Fall through
    }
  }

  if (process.env.COPILOT_SESSION_ID) {
    return process.env.COPILOT_SESSION_ID;
  }
  if (agentSessionId) {
    return agentSessionId;
  }

  return readSessionMarker("github-copilot") ?? undefined;
}

// ---------------------------------------------------------------------------
// Config derivation from agent-mux
// ---------------------------------------------------------------------------

function buildConfig(): AdapterConfig {
  const metadata = getAmuxAdapterMetadata("github-copilot");
  const config = deriveAdapterConfig(metadata, {
    name: "github-copilot",
    displayName: "GitHub Copilot CLI",
    extraActivationEnvVars: ["COPILOT_HOME", "COPILOT_GITHUB_TOKEN"],
    pluginRootEnvVars: ["CLAUDE_PLUGIN_DATA", "COPILOT_PLUGIN_ROOT"],
    sessionIdEnvVars: ["AGENT_SESSION_ID"],
    pluginRootVar: "${COPILOT_PLUGIN_ROOT}",
    interactiveToolName: "AskUserQuestion tool",
    sessionEnvVars: "PID-scoped session marker (authoritative); COPILOT_ENV_FILE / COPILOT_SESSION_ID and AGENT_SESSION_ID are fallbacks",
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
    capabilities: [Cap.HeadlessPrompt, Cap.SessionBinding, Cap.Mcp],
    promptCapabilities: ["hooks", "mcp", "task-tool", "breakpoint-routing"],
    loopControlTerm: "in-turn",
    hookDriven: false,
  });
  // Copilot does not auto-resolve sessions
  config.autoResolvesSession = false;
  return config;
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class GithubCopilotAdapter extends BaseHarnessAdapter {
  constructor() {
    super(buildConfig());
  }

  override getMissingSessionIdHint(): string {
    return (
      "GitHub Copilot CLI provides session IDs via hook stdin JSON. " +
      "Use --session-id explicitly, or ensure Copilot CLI hooks are configured " +
      "to pass session_id in the stdin payload."
    );
  }

  override supportsHookType(hookType: string): boolean {
    const supported = [
      "session-start", "session-end", "user-prompt-submit",
      "pre-tool-use", "post-tool-use",
    ];
    return supported.includes(hookType);
  }

  override resolveSessionId(parsed: { sessionId?: string }): string | undefined {
    return resolveGithubCopilotSessionId(parsed);
  }

  override resolveStateDir(args: { stateDir?: string; pluginRoot?: string }): string | undefined {
    return resolveGithubCopilotStateDir(args);
  }

  override resolvePluginRoot(args: { pluginRoot?: string }): string | undefined {
    const root =
      args.pluginRoot ||
      process.env.CLAUDE_PLUGIN_DATA ||
      process.env.COPILOT_PLUGIN_ROOT;
    return root ? path.resolve(root) : undefined;
  }

  override async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
    const stateDir = resolveGithubCopilotStateDir({
      stateDir: opts.stateDir,
      pluginRoot: opts.pluginRoot,
    });
    return bindSession({
      harness: "github-copilot",
      stateDir: stateDir ?? "",
      opts,
    });
  }

  override getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
    return createPromptContext({
      harness: "github-copilot",
      harnessLabel: "GitHub Copilot CLI",
      capabilities: ["hooks", "mcp", "task-tool", "breakpoint-routing"],
      pluginRootVar: "${COPILOT_PLUGIN_ROOT}",
      loopControlTerm: "in-turn",
      sessionBindingFlags: "",
      hookDriven: false,
      interactiveToolName: "AskUserQuestion tool",
      sessionEnvVars: "PID-scoped session marker (authoritative); COPILOT_ENV_FILE / COPILOT_SESSION_ID and AGENT_SESSION_ID are fallbacks",
      resumeFlags: "",
      cliSetupSnippet: createDefaultCliSetupSnippet(),
      iterateFlags: "",
      hasIntentFidelityChecks: false,
      hasNonNegotiables: false,
    }, opts);
  }

  // handleStopHook and handleSessionStartHook use BaseAdapter defaults
}

export function createGithubCopilotAdapter(): GithubCopilotAdapter {
  return new GithubCopilotAdapter();
}
