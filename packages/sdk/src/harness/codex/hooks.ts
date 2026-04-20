import type { HarnessAdapter, HookHandlerArgs } from "../types";
import {
  readStdin,
  resolveCodexPluginRoot,
  resolveCodexStateDir,
} from "./shared";
import { initializeSessionState, parseHookInput, safeStr } from "../hooks/utils";
import { writeSessionMarker } from "../../utils/sessionMarker";

export async function handleCodexStopHook(
  args: HookHandlerArgs,
  claude: Pick<HarnessAdapter, "handleStopHook">,
): Promise<number> {
  let rawInput = "";
  try {
    rawInput = await readStdin();
  } catch {
    rawInput = "";
  }

  // hooks-proxy now handles all input normalization.
  // Pass the raw input directly to the stop hook handler.
  return claude.handleStopHook({
    ...args,
    pluginRoot: resolveCodexPluginRoot({ pluginRoot: args.pluginRoot }),
    stateDir: resolveCodexStateDir({
      stateDir: args.stateDir,
      pluginRoot: args.pluginRoot,
    }),
    stdinPayload: rawInput,
  });
}

export async function handleCodexSessionStartHook(
  args: HookHandlerArgs,
): Promise<number> {
  const { verbose } = args;

  let rawInput = "";
  try {
    rawInput = await readStdin();
  } catch {
    process.stdout.write("{}\n");
    return 0;
  } finally {
    if (typeof process.stdin.unref === "function") {
      process.stdin.unref();
    }
  }

  // hooks-proxy now handles all input normalization.
  const parsed = parseHookInput(rawInput);
  const sessionId = safeStr(parsed, "session_id");
  if (!sessionId) {
    process.stdout.write("{}\n");
    return 0;
  }

  try {
    writeSessionMarker("codex", sessionId);
  } catch {
    // Non-fatal: marker is a best-effort mechanism
  }

  const stateDir = resolveCodexStateDir({
    stateDir: args.stateDir,
    pluginRoot: args.pluginRoot,
  });

  await initializeSessionState(sessionId, stateDir, { verbose });

  process.stdout.write("{}\n");
  return 0;
}
