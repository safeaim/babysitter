/**
 * Gemini CLI session-start hook handler.
 * Extracted from hooks.ts for max-lines compliance.
 */

import type { SessionState } from "../../session/types";
import {
  getSessionFilePath,
  sessionFileExists,
} from "../../session/parse";
import {
  getCurrentTimestamp,
  writeSessionFile,
} from "../../session/write";
import type { HookHandlerArgs } from "../types";
import {
  createHookLogger,
  parseHookInput,
  readStdin,
  safeStr,
} from "../hooks/utils";
import { writeSessionMarker } from "../../utils/sessionMarker";
import {
  resolveGeminiSessionIdFromEnv,
  resolveGeminiCliStateDir,
} from "./hooks";

const HARNESS_NAME = "gemini-cli";

interface GeminiSessionStartHookInput {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  timestamp?: string;
}

export async function handleGeminiSessionStartHook(
  args: HookHandlerArgs,
): Promise<number> {
  const { verbose } = args;
  const log = createHookLogger("babysitter-session-start-hook");
  log.info("handleSessionStartHook started (gemini-cli)");

  let rawInput: string;
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

  const hookInput = parseHookInput(rawInput) as GeminiSessionStartHookInput;
  const sessionId =
    safeStr(hookInput as Record<string, unknown>, "session_id") ||
    resolveGeminiSessionIdFromEnv() ||
    "";

  if (!sessionId) {
    log.info("No session ID in hook input — skipping state file creation");
    process.stdout.write("{}\n");
    return 0;
  }

  log.setContext("session", sessionId);
  log.info(`Session ID: ${sessionId}`);

  try {
    writeSessionMarker(HARNESS_NAME, sessionId);
  } catch {
    // Non-fatal: marker is a best-effort mechanism
  }

  const stateDir = resolveGeminiCliStateDir(args);
  log.info(`Resolved stateDir: ${stateDir}`);

  const filePath = getSessionFilePath(stateDir, sessionId);
  try {
    if (!(await sessionFileExists(filePath))) {
      const nowTs = getCurrentTimestamp();
      const state: SessionState = {
        active: true,
        iteration: 1,
        maxIterations: 256,
        runId: "",
        runIds: [],
        startedAt: nowTs,
        lastIterationAt: nowTs,
        iterationTimes: [],
      };
      await writeSessionFile(filePath, state, "");
      log.info(`Created session state: ${filePath}`);
      if (verbose) {
        process.stderr.write(
          `[hook:run session-start] Created session state: ${filePath}\n`,
        );
      }
    } else {
      log.info(`Session state already exists: ${filePath}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn(`Failed to create session state: ${message}`);
    if (verbose) {
      process.stderr.write(
        `[hook:run session-start] Failed to create session state: ${message}\n`,
      );
    }
  }

  process.stdout.write("{}\n");
  return 0;
}
