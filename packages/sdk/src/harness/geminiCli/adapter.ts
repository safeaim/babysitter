import * as path from "node:path";
import type {
  HarnessAdapter,
  SessionBindOptions,
  SessionBindResult,
  HookHandlerArgs,
} from "../types";
import type { PromptContext } from "../../prompts/types";
import { createGeminiCliContext } from "./promptContext";
import {
  handleGeminiAfterAgentHook,
  handleGeminiSessionStartHook,
  resolveGeminiCliStateDir,
  resolveGeminiSessionIdFromEnv,
} from "./hooks";
import { bindSession } from "../hooks/sessionBinding";

const HARNESS_NAME = "gemini-cli";
const resolveStateDirInternal = resolveGeminiCliStateDir;

export function createGeminiCliAdapter(): HarnessAdapter {
  return {
    name: HARNESS_NAME,

    isActive(): boolean {
      return !!(
        process.env.AGENT_SESSION_ID ||
        process.env.GEMINI_CLI ||
        process.env.GEMINI_SESSION_ID ||
        process.env.GEMINI_PROJECT_DIR ||
        process.env.GEMINI_CWD
      );
    },

    autoResolvesSessionId(): boolean {
      return true;
    },

    resolveSessionId(parsed: { sessionId?: string }): string | undefined {
      if (parsed.sessionId) return parsed.sessionId;
      return resolveGeminiSessionIdFromEnv();
    },

    resolveStateDir(args: {
      stateDir?: string;
      pluginRoot?: string;
    }): string | undefined {
      return resolveStateDirInternal(args);
    },

    resolvePluginRoot(args: { pluginRoot?: string }): string | undefined {
      const root =
        args.pluginRoot ||
        process.env.GEMINI_EXTENSION_PATH ||
        process.env.BABYSITTER_EXTENSION_PATH;
      return root ? path.resolve(root) : undefined;
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
      return handleGeminiAfterAgentHook(args);
    },

    handleSessionStartHook(args: HookHandlerArgs): Promise<number> {
      return handleGeminiSessionStartHook(args);
    },

    findHookDispatcherPath(_startCwd: string): string | null {
      return null;
    },

    getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
      return createGeminiCliContext(opts);
    },
  };
}
