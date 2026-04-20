import * as path from "node:path";
import type {
  HarnessAdapter,
  SessionBindOptions,
  SessionBindResult,
  HookHandlerArgs,
  HarnessInstallOptions,
  HarnessInstallResult,
} from "../types";
import { HarnessCapability } from "../types";
import type { PromptContext } from "../../prompts/types";
import { createGithubCopilotContext } from "./promptContext";
import { installCliViaNpm } from "../installSupport";
import {
  handleGithubCopilotSessionEndHook,
  handleGithubCopilotSessionStartHook,
  resolveGithubCopilotSessionId,
  resolveGithubCopilotStateDir,
} from "./hooks";
import { bindSession } from "../hooks/sessionBinding";
export { setBabysitterSessionIdInCopilotEnvFile } from "./hooks";

const HARNESS_NAME = "github-copilot";
const resolveStateDirInternal = resolveGithubCopilotStateDir;

function resolvePluginRootInternal(args: { pluginRoot?: string }): string | undefined {
  const root =
    args.pluginRoot ||
    process.env.CLAUDE_PLUGIN_DATA ||
    process.env.COPILOT_PLUGIN_ROOT;
  return root ? path.resolve(root) : undefined;
}

const resolveSessionIdInternal = resolveGithubCopilotSessionId;

export function createGithubCopilotAdapter(): HarnessAdapter {
  return {
    name: HARNESS_NAME,

    isActive(): boolean {
      return !!(
        process.env.AGENT_SESSION_ID ||
        process.env.COPILOT_HOME ||
        process.env.COPILOT_GITHUB_TOKEN
      );
    },

    autoResolvesSessionId(): boolean {
      return false;
    },

    getMissingSessionIdHint(): string {
      return (
        "GitHub Copilot CLI provides session IDs via hook stdin JSON. " +
        "Use --session-id explicitly, or ensure Copilot CLI hooks are configured " +
        "to pass session_id in the stdin payload."
      );
    },

    supportsHookType(hookType: string): boolean {
      const supported = [
        "session-start",
        "session-end",
        "user-prompt-submit",
        "pre-tool-use",
        "post-tool-use",
      ];
      return supported.includes(hookType);
    },

    getCapabilities(): HarnessCapability[] {
      return [
        HarnessCapability.HeadlessPrompt,
        HarnessCapability.SessionBinding,
        HarnessCapability.Mcp,
      ];
    },

    resolveSessionId(parsed: { sessionId?: string }): string | undefined {
      return resolveSessionIdInternal(parsed);
    },

    resolveStateDir(args: {
      stateDir?: string;
      pluginRoot?: string;
    }): string | undefined {
      return resolveStateDirInternal(args);
    },

    resolvePluginRoot(args: { pluginRoot?: string }): string | undefined {
      return resolvePluginRootInternal(args);
    },

    async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
      const stateDir = resolveStateDirInternal({
        stateDir: opts.stateDir,
        pluginRoot: opts.pluginRoot,
      });
      return bindSession({
        harness: HARNESS_NAME,
        stateDir,
        opts,
      });
    },

    handleStopHook(args: HookHandlerArgs): Promise<number> {
      return handleGithubCopilotSessionEndHook(args);
    },

    handleSessionStartHook(args: HookHandlerArgs): Promise<number> {
      return handleGithubCopilotSessionStartHook(args);
    },

    findHookDispatcherPath(_startCwd: string): string | null {
      return null;
    },

    getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
      return createGithubCopilotContext(opts);
    },
  };
}
