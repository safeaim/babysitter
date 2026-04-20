import * as path from "node:path";
import * as os from "node:os";
import { existsSync } from "node:fs";
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
import { createOpenCodeContext } from "./promptContext";
import {
  handleOpenCodeSessionStartHook,
  handleOpenCodeStopHook,
  resolveOpenCodeSessionId,
  resolveOpenCodeStateDir,
} from "./hooks";
import { bindSession } from "../hooks/sessionBinding";

const HARNESS_NAME = "opencode";
const resolveStateDirInternal = resolveOpenCodeStateDir;
const resolveSessionIdInternal = resolveOpenCodeSessionId;

function installOpenCodePlugin(
  _options: HarnessInstallOptions,
): HarnessInstallResult {
  return {
    harness: HARNESS_NAME,
    summary: "OpenCode plugin installation is not yet automated. " +
      "Place babysitter plugin files in .opencode/plugins/babysitter/ manually.",
  };
}

function getAccomplishDataDirs(): string[] {
  const dirs: string[] = [];
  const configDir = process.env.OPENCODE_CONFIG_DIR;
  if (configDir) {
    const parent = path.dirname(configDir);
    if (parent && parent !== configDir) {
      dirs.push(parent);
    }
  }

  const home = os.homedir();
  const platform = process.platform;

  if (platform === "darwin") {
    dirs.push(path.join(home, "Library", "Application Support", "Accomplish"));
  } else if (platform === "win32") {
    if (process.env.APPDATA) {
      dirs.push(path.join(process.env.APPDATA, "Accomplish"));
    }
    if (process.env.LOCALAPPDATA) {
      dirs.push(path.join(process.env.LOCALAPPDATA, "Accomplish"));
    }
  } else {
    dirs.push(path.join(home, ".config", "Accomplish"));
  }

  return dirs;
}

export function createOpenCodeAdapter(): HarnessAdapter {
  return {
    name: HARNESS_NAME,

    isActive(): boolean {
      return !!(
        process.env.AGENT_SESSION_ID ||
        process.env.OPENCODE_CONFIG ||
        process.env.ACCOMPLISH_TASK_ID
      );
    },

    autoResolvesSessionId(): boolean {
      return false;
    },

    getMissingSessionIdHint(): string {
      return (
        "OpenCode does not auto-inject session IDs. Use --session-id explicitly, " +
        "or ensure the babysitter plugin's shell.env hook is configured to set " +
        "AGENT_SESSION_ID."
      );
    },

    supportsHookType(hookType: string): boolean {
      const supported = [
        "session-start",
        "pre-tool-use",
        "post-tool-use",
      ];
      return supported.includes(hookType);
    },

    getUnsupportedHookMessage(hookType: string): string {
      if (hookType === "stop") {
        return (
          "OpenCode does not support a blocking stop hook. " +
          "The session.idle event is fire-and-forget. " +
          "Use in-turn orchestration or the SDK loop driver instead."
        );
      }
      return `Hook type "${hookType}" is not supported by the OpenCode adapter.`;
    },

    getCapabilities(): HarnessCapability[] {
      return [HarnessCapability.HeadlessPrompt];
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
      if (args.pluginRoot) return path.resolve(args.pluginRoot);
      if (process.env.OPENCODE_PLUGIN_ROOT) {
        return path.resolve(process.env.OPENCODE_PLUGIN_ROOT);
      }
      const configDir = process.env.OPENCODE_CONFIG_DIR;
      if (configDir) {
        const candidate = path.resolve(configDir, "plugins", "babysitter");
        if (existsSync(candidate)) return candidate;
      }
      for (const dataDir of getAccomplishDataDirs()) {
        const candidate = path.join(dataDir, "opencode", "plugins", "babysitter");
        if (existsSync(candidate)) return candidate;
      }

      return undefined;
    },

    async bindSession(opts: SessionBindOptions): Promise<SessionBindResult> {
      const stateDir = resolveStateDirInternal({
        stateDir: opts.stateDir,
        pluginRoot: opts.pluginRoot,
      });
      const accomplishTaskId = process.env.ACCOMPLISH_TASK_ID;
      return bindSession({
        harness: HARNESS_NAME,
        stateDir,
        opts,
        extraState: accomplishTaskId ? { metadata: { accomplishTaskId } } : undefined,
      });
    },

    handleStopHook(args: HookHandlerArgs): Promise<number> {
      return handleOpenCodeStopHook(args);
    },

    handleSessionStartHook(args: HookHandlerArgs): Promise<number> {
      return handleOpenCodeSessionStartHook(args);
    },

    findHookDispatcherPath(_startCwd: string): string | null {
      return null;
    },

    installPlugin(options: HarnessInstallOptions): Promise<HarnessInstallResult> {
      return Promise.resolve(installOpenCodePlugin(options));
    },

    getPromptContext(opts?: { interactive?: boolean | undefined }): PromptContext {
      return createOpenCodeContext(opts);
    },
  };
}
