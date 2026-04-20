/**
 * oh-my-pi harness adapter.
 *
 * Derives metadata from @a5c-ai/agent-mux when available, falling back to
 * hardcoded config.
 */

import { HarnessCapability as Cap } from "../types";
import type {
  HookHandlerArgs,
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { BaseHarnessAdapter, type AdapterConfig } from "../BaseAdapter";
import { normalizeSessionStateDir } from "../../config";
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
import { writeSessionMarker, resolveSessionIdWithMarker } from "../../utils/sessionMarker";
import { createDefaultCliSetupSnippet, createPromptContext } from "../../prompts/contextShared";
import { getAmuxAdapterMetadata } from "../amuxMetadata";
import { deriveAdapterConfig } from "../derivePromptContext";

// ---------------------------------------------------------------------------
// Fallback config (used when agent-mux is unavailable)
// ---------------------------------------------------------------------------

const FALLBACK_CONFIG: AdapterConfig = {
  name: "oh-my-pi",
  displayName: "oh-my-pi",
  activationEnvVars: ["AGENT_SESSION_ID", "OMP_SESSION_ID", "OMP_PLUGIN_ROOT"],
  capabilities: [Cap.Programmatic, Cap.SessionBinding, Cap.HeadlessPrompt, Cap.Mcp],
  loopControlTerm: "skill-driven",
  autoResolvesSession: true,
  pluginRootEnvVars: ["OMP_PLUGIN_ROOT"],
  sessionIdEnvVars: ["OMP_SESSION_ID", "AGENT_SESSION_ID"],
  promptCapabilities: ["skills", "slash-commands", "task-tool", "harness-routing", "programmatic-session", "mcp"],
  pluginRootVar: "${OMP_PLUGIN_ROOT}",
  hookDriven: false,
  interactiveToolName: "AskUserQuestion",
  sessionEnvVars: "PID-scoped session marker (authoritative); OMP_SESSION_ID and AGENT_SESSION_ID are fallbacks",
  hasIntentFidelityChecks: false,
  hasNonNegotiables: false,
};

// ---------------------------------------------------------------------------
// Config derivation from agent-mux
// ---------------------------------------------------------------------------

function buildConfig(): AdapterConfig {
  const metadata = getAmuxAdapterMetadata("oh-my-pi");
  if (!metadata) return FALLBACK_CONFIG;

  return deriveAdapterConfig(metadata, {
    name: "oh-my-pi",
    displayName: "oh-my-pi",
    extraActivationEnvVars: ["OMP_SESSION_ID", "OMP_PLUGIN_ROOT"],
    pluginRootEnvVars: ["OMP_PLUGIN_ROOT"],
    sessionIdEnvVars: ["OMP_SESSION_ID", "AGENT_SESSION_ID"],
    pluginRootVar: "${OMP_PLUGIN_ROOT}",
    interactiveToolName: "AskUserQuestion",
    sessionEnvVars: "PID-scoped session marker (authoritative); OMP_SESSION_ID and AGENT_SESSION_ID are fallbacks",
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
    capabilities: [Cap.Programmatic, Cap.SessionBinding, Cap.HeadlessPrompt, Cap.Mcp],
    promptCapabilities: ["skills", "slash-commands", "task-tool", "harness-routing", "programmatic-session", "mcp"],
    loopControlTerm: "skill-driven",
    hookDriven: false,
  });
}

// ---------------------------------------------------------------------------
// Adapter class
// ---------------------------------------------------------------------------

class OhMyPiAdapter extends BaseHarnessAdapter {
  constructor() {
    super(buildConfig());
  }

  override getMissingSessionIdHint(): string {
    return "oh-my-pi should provide OMP_SESSION_ID when the Babysitter package is active.";
  }

  override supportsHookType(_hookType: string): boolean {
    return false;
  }

  override getUnsupportedHookMessage(hookType: string): string {
    return `oh-my-pi does not use babysitter hook:run for "${hookType}". Use the oh-my-pi package skills and extension bridge instead.`;
  }

  override resolveSessionId(parsed: { sessionId?: string }): string | undefined {
    return resolveSessionIdWithMarker("oh-my-pi", parsed, ["OMP_SESSION_ID"]);
  }

  override async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
    const stateDir = normalizeSessionStateDir(
      opts.stateDir ?? process.env.BABYSITTER_STATE_DIR,
    );
    const stateFile = getSessionFilePath(stateDir, opts.sessionId);

    if (await sessionFileExists(stateFile)) {
      const existing = await readSessionFile(stateFile);
      if (existing.state.runId && existing.state.runId !== opts.runId) {
        return {
          harness: "oh-my-pi",
          sessionId: opts.sessionId,
          stateFile,
          error: `Session already associated with run ${existing.state.runId}`,
        };
      }
      await updateSessionState(
        stateFile,
        { active: true, runId: opts.runId },
        existing,
      );
      return { harness: "oh-my-pi", sessionId: opts.sessionId, stateFile };
    }

    const now = getCurrentTimestamp();
    const state: SessionState = {
      active: true,
      iteration: 1,
      maxIterations: opts.maxIterations ?? 256,
      runId: opts.runId,
      runIds: [],
      startedAt: now,
      lastIterationAt: now,
      iterationTimes: [],
    };
    await writeSessionFile(stateFile, state, opts.prompt);

    return { harness: "oh-my-pi", sessionId: opts.sessionId, stateFile };
  }

  override handleStopHook(_args: HookHandlerArgs): Promise<number> {
    process.stdout.write("{}\n");
    return Promise.resolve(0);
  }

  override handleSessionStartHook(_args: HookHandlerArgs): Promise<number> {
    const sessionId =
      process.env.OMP_SESSION_ID || process.env.AGENT_SESSION_ID;
    if (sessionId) {
      try {
        writeSessionMarker("oh-my-pi", sessionId);
      } catch {
        // Non-fatal
      }
    }
    process.stdout.write("{}\n");
    return Promise.resolve(0);
  }

  override getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
    return createPromptContext({
      harness: "oh-my-pi",
      harnessLabel: "oh-my-pi",
      capabilities: ["skills", "slash-commands", "task-tool", "harness-routing", "programmatic-session", "mcp"],
      pluginRootVar: "${OMP_PLUGIN_ROOT}",
      loopControlTerm: "skill-driven",
      sessionBindingFlags: "",
      hookDriven: false,
      interactiveToolName: "AskUserQuestion",
      sessionEnvVars: "PID-scoped session marker (authoritative); OMP_SESSION_ID and AGENT_SESSION_ID are fallbacks",
      resumeFlags: "",
      cliSetupSnippet: createDefaultCliSetupSnippet(),
      iterateFlags: "",
      hasIntentFidelityChecks: false,
      hasNonNegotiables: false,
    }, opts);
  }
}

export function createOhMyPiAdapter(): OhMyPiAdapter {
  return new OhMyPiAdapter();
}
