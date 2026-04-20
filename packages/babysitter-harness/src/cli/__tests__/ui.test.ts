import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findObserverWorkspaceRoot, resolveObserverLaunchTarget } from "../ui";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "babysitter-observer-ui-"));
  tempDirs.push(dir);
  return dir;
}

describe("observer launcher resolution", () => {
  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it("finds the observer workspace root by walking up the tree", () => {
    const repoRoot = makeTempDir();
    const observerDir = path.join(repoRoot, "packages", "observer-dashboard");
    const nestedDir = path.join(repoRoot, "packages", "babysitter-harness", "src", "cli");
    mkdirSync(observerDir, { recursive: true });
    mkdirSync(nestedDir, { recursive: true });
    writeFileSync(path.join(observerDir, "package.json"), "{}\n");

    expect(findObserverWorkspaceRoot(nestedDir)).toBe(repoRoot);
  });

  it("prefers the local observer workspace when available", () => {
    const repoRoot = makeTempDir();
    const observerDir = path.join(repoRoot, "packages", "observer-dashboard");
    mkdirSync(observerDir, { recursive: true });
    writeFileSync(path.join(observerDir, "package.json"), "{}\n");

    const target = resolveObserverLaunchTarget({
      cwd: repoRoot,
      hasCommand: () => false,
    });

    expect(target).toEqual({
      command: "npm",
      args: [
        "run",
        "dev:cli",
        "--workspace=@a5c-ai/babysitter-observer-dashboard",
        "--",
        "--dev",
      ],
      cwd: repoRoot,
      shell: true,
      source: "workspace",
    });
  });

  it("falls back to an installed observer binary when no workspace is present", () => {
    const cwd = makeTempDir();

    const target = resolveObserverLaunchTarget({
      cwd,
      packageRoot: cwd,
      hasCommand: (command) => command === "babysitter-observer-dashboard",
    });

    expect(target).toEqual({
      command: "babysitter-observer-dashboard",
      args: [],
      shell: false,
      source: "binary",
    });
  });

  it("returns undefined when neither a workspace nor binary is available", () => {
    const cwd = makeTempDir();

    expect(resolveObserverLaunchTarget({
      cwd,
      packageRoot: cwd,
      hasCommand: () => false,
    })).toBeUndefined();
  });
});
