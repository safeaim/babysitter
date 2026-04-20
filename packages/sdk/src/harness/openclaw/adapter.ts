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
import { createOpenClawContext } from "./promptContext";
import { normalizeSessionStateDir } from "../../config";
import { checkCliAvailable } from "../discovery";
import { installCliViaNpm } from "../installSupport";
import { createHookLogger, initializeSessionState } from "../hooks/utils";
import { bindSession } from "../hooks/sessionBinding";

const HARNESS_NAME = "openclaw";

function resolveStateDirInternal(args: {
  stateDir?: string;
  pluginRoot?: string;
}): string {
  return normalizeSessionStateDir(
    args.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
}

function resolveSessionIdInternal(parsed: {
  sessionId?: string;
}): string | undefined {
  if (parsed.sessionId) return parsed.sessionId;
  if (process.env.AGENT_SESSION_ID)
    return process.env.AGENT_SESSION_ID;
  if (process.env.OPENCLAW_SHELL) return process.env.OPENCLAW_SHELL;
  return undefined;
}

function writeNoopHookResult(): void {
  process.stdout.write("{}\n");
}

async function handleSessionStartHookImpl(
  args: HookHandlerArgs,
): Promise<number> {
  const { verbose } = args;
  const log = createHookLogger("babysitter-openclaw-session-start-hook");
  log.info("handleSessionStartHook started (openclaw)");

  const sessionId =
    process.env.AGENT_SESSION_ID || process.env.OPENCLAW_SHELL || "";

  if (!sessionId) {
    log.info("No session ID — skipping state file creation");
    process.stdout.write("{}\n");
    return 0;
  }

  log.setContext("session", sessionId);
  log.info(`Session ID: ${sessionId}`);

  const stateDir = resolveStateDirInternal(args);
  log.info(`Resolved stateDir: ${stateDir}`);

  await initializeSessionState(sessionId, stateDir, { verbose, log });

  process.stdout.write("{}\n");
  return 0;
}

export function createOpenClawAdapter(): HarnessAdapter {
  return {
    name: HARNESS_NAME,

    isActive(): boolean {
      return !!(process.env.OPENCLAW_SHELL || process.env.OPENCLAW_HOME);
    },

    autoResolvesSessionId(): boolean {
      return true;
    },

    getMissingSessionIdHint(): string {
      return (
        "Session ID is provided by the OpenClaw gateway. " +
        "Ensure you're running inside an OpenClaw agent session."
      );
    },

    supportsHookType(hookType: string): boolean {
      return hookType === "session-start";
    },

    getUnsupportedHookMessage(hookType: string): string {
      if (hookType === "stop") {
        return (
          "OpenClaw does not support a blocking stop hook. " +
          "The daemon manages agent lifecycle via agent_end signals. " +
          "Use the OpenClaw gateway API instead."
        );
      }
      return `Hook type "${hookType}" is not supported by the OpenClaw adapter. OpenClaw hooks are registered programmatically.`;
    },

    getCapabilities(): HarnessCapability[] {
      return [
        HarnessCapability.SessionBinding,
        HarnessCapability.Mcp,
        HarnessCapability.HeadlessPrompt,
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

    resolvePluginRoot(_args: { pluginRoot?: string }): string | undefined {
      return undefined;
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

    handleStopHook(_args: HookHandlerArgs): Promise<number> {
      writeNoopHookResult();
      return Promise.resolve(0);
    },

    handleSessionStartHook(args: HookHandlerArgs): Promise<number> {
      return handleSessionStartHookImpl(args);
    },

    findHookDispatcherPath(_startCwd: string): string | null {
      return null;
    },

    async isCliInstalled(): Promise<boolean> {
      const result = await checkCliAvailable("openclaw");
      return result.available;
    },

    async getCliInfo(): Promise<{
      command: string;
      version?: string;
      path?: string;
    }> {
      const result = await checkCliAvailable("openclaw");
      return {
        command: "openclaw",
        version: result.version,
        path: result.path,
      };
    },

    installHarness(
      options: HarnessInstallOptions,
    ): Promise<HarnessInstallResult> {
      return installCliViaNpm({
        harness: HARNESS_NAME,
        cliCommand: "openclaw",
        packageName: "openclaw",
        summary: "Install the OpenClaw CLI globally via npm.",
        options,
      });
    },

    installPlugin(
      options: HarnessInstallOptions,
    ): Promise<HarnessInstallResult> {
      return installCliViaNpm({
        harness: HARNESS_NAME,
        cliCommand: "openclaw",
        packageName: "@a5c-ai/babysitter-openclaw",
        summary:
          "Install the Babysitter OpenClaw plugin package, then register it via `openclaw plugin install babysitter-openclaw`.",
        options,
      });
    },

    getPromptContext(
      opts?: { interactive?: boolean | undefined },
    ): PromptContext {
      return createOpenClawContext(opts);
    },
  };
}
