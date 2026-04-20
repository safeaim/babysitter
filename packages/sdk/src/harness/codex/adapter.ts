import { createClaudeCodeAdapter } from "../claudeCode";
import type {
  HarnessAdapter,
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { createCodexContext } from "./promptContext";
import { handleCodexSessionStartHook, handleCodexStopHook } from "./hooks";
import {
  resolveCodexPluginRoot,
  resolveCodexSessionId,
  resolveCodexStateDir,
} from "./shared";
import { bindSession } from "../hooks/sessionBinding";

export function createCodexAdapter(): HarnessAdapter {
  const claude = createClaudeCodeAdapter();

  return {
    name: "codex",

    isActive(): boolean {
      return !!(
        process.env.AGENT_SESSION_ID ||
        process.env.CODEX_THREAD_ID ||
        process.env.CODEX_SESSION_ID ||
        process.env.CODEX_PLUGIN_ROOT
      );
    },

    autoResolvesSessionId(): boolean {
      return true;
    },

    resolveSessionId(parsed: { sessionId?: string }): string | undefined {
      return resolveCodexSessionId(parsed);
    },

    resolveStateDir(args: {
      stateDir?: string;
      pluginRoot?: string;
    }): string | undefined {
      return resolveCodexStateDir(args);
    },

    resolvePluginRoot(args: { pluginRoot?: string }): string | undefined {
      return resolveCodexPluginRoot(args);
    },

    getMissingSessionIdHint(): string {
      return (
        "Use --session-id explicitly, or launch through a Codex hook callback " +
        "that provides a stable session/thread ID."
      );
    },

    supportsHookType(hookType: string): boolean {
      void hookType;
      return true;
    },

    async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
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
    },

    handleStopHook(args) {
      return handleCodexStopHook(args, claude);
    },

    handleSessionStartHook(args) {
      return handleCodexSessionStartHook(args);
    },

    findHookDispatcherPath(_startCwd: string): string | null {
      return null;
    },

    getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
      return createCodexContext(opts);
    },
  };
}
