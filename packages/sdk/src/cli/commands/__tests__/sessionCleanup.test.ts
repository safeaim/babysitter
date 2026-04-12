/**
 * Tests for session:cleanup — dead marker GC and stale state deactivation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runSessionCleanup } from "../sessionCleanup";
import { writeSessionFile, getSessionFilePath } from "../../../session";
import type { SessionState } from "../../../session";
import { getGlobalStateDir } from "../../../config";

let tmpDir: string;
let stateDir: string;
let savedGlobalStateDir: string | undefined;

function makeState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    active: true,
    iteration: 1,
    maxIterations: 256,
    runId: "",
    runIds: [],
    startedAt: "2020-01-01T00:00:00.000Z",
    lastIterationAt: "2020-01-01T00:00:00.000Z",
    iterationTimes: [],
    ...overrides,
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-cleanup-test-"));
  savedGlobalStateDir = process.env.BABYSITTER_GLOBAL_STATE_DIR;
  process.env.BABYSITTER_GLOBAL_STATE_DIR = tmpDir;
  stateDir = getGlobalStateDir();
  mkdirSync(stateDir, { recursive: true });
});

afterEach(async () => {
  if (savedGlobalStateDir === undefined) {
    delete process.env.BABYSITTER_GLOBAL_STATE_DIR;
  } else {
    process.env.BABYSITTER_GLOBAL_STATE_DIR = savedGlobalStateDir;
  }
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

async function seedFixtures(): Promise<void> {
  // Live marker — current pid, sessionId SESS-A
  writeFileSync(
    path.join(stateDir, `current-session-claude-code-pid-${process.pid}`),
    "SESS-A\n",
  );
  // Dead marker — pid 999999, sessionId SESS-B
  writeFileSync(
    path.join(stateDir, `current-session-claude-code-pid-999999`),
    "SESS-B\n",
  );
  // Active session state referenced by the live marker — should stay untouched
  await writeSessionFile(
    getSessionFilePath(stateDir, "SESS-A"),
    makeState({ runId: "" }),
    "prompt-a",
  );
  // Active session state referenced by the dead marker, lastIterationAt old,
  // no runId — must be deactivated.
  await writeSessionFile(
    getSessionFilePath(stateDir, "SESS-B"),
    makeState({
      runId: "",
      lastIterationAt: "2020-01-01T00:00:00.000Z",
    }),
    "prompt-b",
  );
}

describe("session:cleanup", () => {
  it("removes dead markers and deactivates stale state files", async () => {
    await seedFixtures();

    const result = await runSessionCleanup({
      harness: "claude-code",
      dryRun: false,
      stateDir,
      runsDir: path.join(tmpDir, "nonexistent-runs"),
    });

    expect(result.dryRun).toBe(false);
    expect(result.markersRemoved).toContain(
      "current-session-claude-code-pid-999999",
    );
    // Live marker survives
    expect(
      existsSync(
        path.join(stateDir, `current-session-claude-code-pid-${process.pid}`),
      ),
    ).toBe(true);
    expect(
      existsSync(path.join(stateDir, "current-session-claude-code-pid-999999")),
    ).toBe(false);

    // SESS-A untouched, still active
    const aContent = readFileSync(getSessionFilePath(stateDir, "SESS-A"), "utf8");
    expect(aContent).toMatch(/active: true/);

    // SESS-B now active:false
    expect(result.statesDeactivated).toContain("SESS-B");
    const bContent = readFileSync(getSessionFilePath(stateDir, "SESS-B"), "utf8");
    expect(bContent).toMatch(/active: false/);
    // prompt preserved
    expect(bContent).toContain("prompt-b");
  });

  it("dry-run reports actions without mutating the filesystem", async () => {
    await seedFixtures();

    const result = await runSessionCleanup({
      harness: "claude-code",
      dryRun: true,
      stateDir,
      runsDir: path.join(tmpDir, "nonexistent-runs"),
    });

    expect(result.dryRun).toBe(true);
    expect(result.markersRemoved).toContain(
      "current-session-claude-code-pid-999999",
    );
    expect(result.statesDeactivated).toContain("SESS-B");

    // Nothing actually removed / changed
    expect(
      existsSync(path.join(stateDir, "current-session-claude-code-pid-999999")),
    ).toBe(true);
    const bContent = readFileSync(getSessionFilePath(stateDir, "SESS-B"), "utf8");
    expect(bContent).toMatch(/active: true/);
  });
});
