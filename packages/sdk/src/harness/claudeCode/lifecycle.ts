import {
  execFilePromise,
  getClaudeInstalledPluginsPath,
  installCliViaNpm,
  isClaudePluginInstalled,
  renderCommand,
} from "../installSupport";
import type {
  HarnessInstallOptions,
  HarnessInstallResult,
  SessionBindOptions,
  SessionBindResult,
} from "../types";
import { normalizeSessionStateDir } from "../../config";
import { BabysitterRuntimeError, ErrorCategory } from "../../runtime/exceptions";
import { bindSession } from "../hooks/sessionBinding";

export async function bindClaudeCodeSession(
  opts: SessionBindOptions,
): Promise<SessionBindResult> {
  const stateDir = normalizeSessionStateDir(
    opts.stateDir ?? process.env.BABYSITTER_STATE_DIR,
  );
  return bindSession({
    harness: "claude-code",
    stateDir,
    opts,
    autoReleaseStale: true,
  });
}

export async function installClaudeCodeHarness(
  options: HarnessInstallOptions,
): Promise<HarnessInstallResult> {
  return installCliViaNpm({
    harness: "claude-code",
    cliCommand: "claude",
    packageName: "@anthropic-ai/claude-code",
    summary: "Install the Claude Code CLI globally via npm.",
    options,
  });
}

export async function installClaudeCodePlugin(
  options: HarnessInstallOptions,
): Promise<HarnessInstallResult> {
  if (isClaudePluginInstalled()) {
    return {
      harness: "claude-code",
      warning: "The Claude Code Babysitter plugin already appears in installed_plugins.json; skipping reinstall.",
      location: getClaudeInstalledPluginsPath(),
    };
  }

  if (options.dryRun) {
    return {
      harness: "claude-code",
      dryRun: true,
      summary: "Add the published Babysitter Claude Code plugin to the marketplace and install it at user scope.",
      command: [
        renderCommand("claude", ["plugin", "marketplace", "add", "a5c-ai/babysitter"]),
        renderCommand("claude", ["plugin", "install", "--scope", "user", "babysitter@a5c.ai"]),
      ].join(" && "),
    };
  }

  const marketplaceArgs = ["plugin", "marketplace", "add", "a5c-ai/babysitter"];
  const marketplaceResult = await execFilePromise("claude", marketplaceArgs);
  if (marketplaceResult.exitCode !== 0) {
    throw new BabysitterRuntimeError(
      "ClaudePluginMarketplaceAddFailed",
      "claude plugin marketplace add a5c-ai/babysitter failed",
      {
        category: ErrorCategory.External,
        details: {
          stdout: marketplaceResult.stdout,
          stderr: marketplaceResult.stderr,
          exitCode: marketplaceResult.exitCode,
        },
      },
    );
  }

  const installArgs = ["plugin", "install", "--scope", "user", "babysitter@a5c.ai"];
  const installResult = await execFilePromise("claude", installArgs);
  if (installResult.exitCode !== 0) {
    throw new BabysitterRuntimeError(
      "ClaudePluginInstallFailed",
      `${renderCommand("claude", installArgs)} failed`,
      {
        category: ErrorCategory.External,
        details: {
          stdout: installResult.stdout,
          stderr: installResult.stderr,
          exitCode: installResult.exitCode,
        },
      },
    );
  }

  return {
    harness: "claude-code",
    summary: "Added the published Babysitter Claude Code plugin to the marketplace and installed it at user scope.",
    command: [
      renderCommand("claude", marketplaceArgs),
      renderCommand("claude", installArgs),
    ].join(" && "),
    output: [
      marketplaceResult.stdout.trim(),
      marketplaceResult.stderr.trim(),
      installResult.stdout.trim(),
      installResult.stderr.trim(),
    ].filter(Boolean).join("\n"),
  };
}
