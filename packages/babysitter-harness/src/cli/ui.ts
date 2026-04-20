import * as path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import {
  BabysitterRuntimeError,
  ErrorCategory,
  formatErrorWithContext,
  isBabysitterError,
  suggestCommand,
  toStructuredError,
} from "@a5c-ai/babysitter-sdk";
import { HARNESS_PROGRAM } from "./program";

export function supportsColors(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return Boolean(process.stderr?.isTTY);
}

export function handleUnknownCommand(command: string, json: boolean): number {
  const error = new BabysitterRuntimeError("UnknownCommandError", `Unknown command: ${command}`, {
    category: ErrorCategory.Validation,
    suggestions: suggestCommand(command) ? [`Did you mean: ${suggestCommand(command)}?`] : [],
    nextSteps: [
      `Run ${HARNESS_PROGRAM.commandName} --help to see available harness runtime commands.`,
      'Use "babysitter harness:install" or "babysitter harness:install-plugin" for installation commands.',
    ],
    details: { command, program: HARNESS_PROGRAM.commandName },
  });
  if (json) {
    console.error(JSON.stringify(toStructuredError(error), null, 2));
  } else {
    console.error(formatErrorWithContext(error, { colors: supportsColors() }));
  }
  return 1;
}

export function outputError(error: Error, options: { json: boolean; verbose?: boolean }): void {
  const { json, verbose = false } = options;
  if (json) {
    console.error(JSON.stringify(toStructuredError(error, verbose)));
    return;
  }
  const colors = supportsColors();
  if (isBabysitterError(error)) {
    console.error(formatErrorWithContext(error, { colors, includeStack: verbose }));
    return;
  }
  const wrappedError = new BabysitterRuntimeError(error.name || "Error", error.message, {
    category: ErrorCategory.Internal,
    nextSteps: ["If this error persists, please report it as a bug."],
  });
  console.error(formatErrorWithContext(wrappedError, { colors, includeStack: verbose }));
}

export async function readCliVersion(): Promise<string> {
  const candidatePaths = [
    path.join(__dirname, "..", "..", "package.json"),
    path.join(__dirname, "..", "..", "..", "package.json"),
  ];
  for (const packagePath of candidatePaths) {
    try {
      const raw = await fs.readFile(packagePath, "utf8");
      return (JSON.parse(raw) as { version?: string }).version ?? "unknown";
    } catch {
      // try the next candidate
    }
  }
  return "unknown";
}

export interface ObserverLaunchTarget {
  command: string;
  args: string[];
  cwd?: string;
  shell: boolean;
  source: "workspace" | "binary";
}

export function findObserverWorkspaceRoot(startDir: string): string | undefined {
  let current = path.resolve(startDir);
  for (;;) {
    const candidate = path.join(current, "packages", "observer-dashboard", "package.json");
    try {
      if (existsSync(candidate)) {
        return current;
      }
    } catch {
      // Keep walking up.
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

function commandExists(command: string): boolean {
  const locator = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(locator, [command], { stdio: "ignore", shell: false });
  return result.status === 0;
}

export function resolveObserverLaunchTarget(options: {
  workspace?: string;
  cwd?: string;
  packageRoot?: string;
  hasCommand?: (command: string) => boolean;
} = {}): ObserverLaunchTarget | undefined {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const packageRoot = path.resolve(options.packageRoot ?? path.resolve(__dirname, "..", ".."));
  const searchRoots = [
    options.workspace ? path.resolve(options.workspace) : undefined,
    cwd,
    packageRoot,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  for (const root of searchRoots) {
    const repoRoot = findObserverWorkspaceRoot(root);
    if (repoRoot) {
      return {
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
      };
    }
  }

  const hasCommand = options.hasCommand ?? commandExists;
  if (hasCommand("babysitter-observer-dashboard")) {
    return {
      command: "babysitter-observer-dashboard",
      args: [],
      shell: false,
      source: "binary",
    };
  }

  return undefined;
}

export async function launchObserver(workspace?: string): Promise<number> {
  const watchDir = path.resolve(workspace ?? process.cwd());
  const colors = supportsColors();
  const bold = colors ? "\x1b[1m" : "";
  const dim = colors ? "\x1b[2m" : "";
  const reset = colors ? "\x1b[0m" : "";
  const target = resolveObserverLaunchTarget({ workspace, cwd: process.cwd() });

  if (!target) {
    process.stderr.write(`${bold}Unable to launch the observer dashboard.${reset}\n`);
    process.stderr.write("No local observer workspace or installed `babysitter-observer-dashboard` binary was found.\n");
    process.stderr.write("Try running this from a babysitter repository checkout, or use `babysitter-harness observe --tui`.\n");
    return 1;
  }

  process.stderr.write(`${bold}Launching babysitter observer dashboard...${reset}\n`);
  process.stderr.write(`${dim}Watching: ${watchDir}${reset}\n\n`);
  if (target.source === "workspace") {
    process.stderr.write(`${dim}Using local observer workspace.${reset}\n\n`);
  }

  const child = spawn(target.command, [...target.args, "--watch-dir", watchDir], {
    stdio: "inherit",
    cwd: target.cwd,
    shell: target.shell,
  });

  return await new Promise<number>((resolve) => {
    child.on("close", (code) => resolve(code ?? 0));
    child.on("error", (err) => {
      process.stderr.write(`Failed to launch observer: ${err.message}\n`);
      resolve(1);
    });
  });
}
