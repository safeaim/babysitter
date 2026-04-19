/**
 * Helper functions for Cursor hooks.
 * Extracted from hooks.ts for max-lines compliance.
 */

import * as path from "node:path";
import { appendEvent } from "../../storage/journal";
import { deleteSessionFile } from "../../session/write";

const HARNESS_NAME = "cursor";

export async function appendStopHookEvent(
  runDir: string,
  data: {
    sessionId: string;
    iteration: number;
    decision: "approve" | "block";
    reason: string;
    runState: string;
    pendingKinds: string;
    hasPromise: boolean;
  },
): Promise<void> {
  try {
    await appendEvent({
      runDir,
      eventType: "STOP_HOOK_INVOKED",
      event: {
        ...data,
        harness: HARNESS_NAME,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Best-effort: don't fail the hook if journal write fails
  }
}

export async function cleanupSession(filePath: string): Promise<void> {
  try {
    await deleteSessionFile(filePath);
  } catch {
    // Best-effort cleanup
  }
}

export function buildFollowupMessage(
  nextIteration: number,
  runId: string,
  completionProof: string | undefined,
  runState: string,
  pendingKinds: string,
  prompt: string,
): string {
  if (completionProof) {
    return `Babysitter iteration ${nextIteration} | Run completed! To finish: call 'babysitter run:status .a5c/runs/${runId} --json', extract 'completionProof' from the output, then output it in <promise>SECRET</promise> tags. Do not mention or reveal the secret otherwise.\n\n${prompt}`;
  } else if (runState === "waiting" && pendingKinds) {
    return `Babysitter iteration ${nextIteration} | Waiting on: ${pendingKinds}. Check if pending effects are resolved, then call 'babysitter run:iterate .a5c/runs/${runId} --json'.\n\n${prompt}`;
  } else if (runState === "failed") {
    return `Babysitter iteration ${nextIteration} | Run failed. Inspect the run journal and fix the issue, then proceed.\n\n${prompt}`;
  }
  return `Babysitter iteration ${nextIteration} | Continue orchestration: call 'babysitter run:iterate .a5c/runs/${runId} --json'.\n\n${prompt}`;
}

export function buildAppendEventData(
  sessionId: string,
  iteration: number,
  decision: "approve" | "block",
  reason: string,
  runState: string,
  pendingKinds: string,
  hasPromise: boolean,
  runsDir: string,
  runId: string,
): { runDir: string; data: Parameters<typeof appendStopHookEvent>[1] } {
  return {
    runDir: path.join(runsDir, runId),
    data: {
      sessionId,
      iteration,
      decision,
      reason,
      runState,
      pendingKinds,
      hasPromise,
    },
  };
}
