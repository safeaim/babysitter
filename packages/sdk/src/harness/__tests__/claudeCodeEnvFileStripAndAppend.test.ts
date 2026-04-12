/**
 * setBabysitterSessionIdInEnvFile must strip prior BABYSITTER_SESSION_ID
 * lines and append the new one atomically — preserving unrelated exports.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs, writeFileSync as writeFileSyncAsync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { setBabysitterSessionIdInEnvFile } from "../claudeCode";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-envfile-strip-"));
});

afterEach(async () => {
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("setBabysitterSessionIdInEnvFile", () => {
  it("strips prior BABYSITTER_SESSION_ID lines, preserves unrelated ones, appends new", () => {
    const envPath = path.join(tmpDir, "claude.env");
    writeFileSyncAsync(
      envPath,
      [
        `export PATH_ADDITION="/foo/bin"`,
        `export BABYSITTER_SESSION_ID="OLD"`,
        `export SOMETHING="value"`,
        ``,
      ].join("\n"),
    );

    setBabysitterSessionIdInEnvFile(envPath, "NEW");

    const after = readFileSync(envPath, "utf-8");
    const matches = [...after.matchAll(/^export BABYSITTER_SESSION_ID=.*$/gm)];
    expect(matches).toHaveLength(1);
    expect(after).toMatch(/export BABYSITTER_SESSION_ID="NEW"/);
    expect(after).toContain(`export PATH_ADDITION="/foo/bin"`);
    expect(after).toContain(`export SOMETHING="value"`);
    expect(after).not.toContain(`BABYSITTER_SESSION_ID="OLD"`);
  });

  it("creates a new file when target doesn't exist", () => {
    const envPath = path.join(tmpDir, "fresh.env");
    setBabysitterSessionIdInEnvFile(envPath, "FRESH");
    const after = readFileSync(envPath, "utf-8");
    expect(after).toBe(`export BABYSITTER_SESSION_ID="FRESH"\n`);
  });
});
