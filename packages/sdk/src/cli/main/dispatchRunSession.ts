import { getAdapter, getAdapterByName } from "../../harness";
import type { ParsedArgs } from "./types";
import { USAGE } from "./usage";
import { handleBreakpointCommand } from "../commands/breakpointRules";
import type { BreakpointCommandArgs } from "../commands/breakpointRules";
import { handleHookLog } from "../commands/hookLog";
import { handleHookRun } from "../commands/hookRun";
import { handleInstructionsCommand } from "../commands/instructions";
import type { InstructionsCommandArgs } from "../commands/instructions";
import { handleLog } from "../commands/log";
import { handleProcessLibraryCommand } from "../commands/processLibrary";
import type { ProcessLibraryCommandArgs } from "../commands/processLibrary";
import { handleProfileCommand } from "../commands/profile";
import type { ProfileCommandArgs } from "../commands/profile";
import {
  handlePluginAddMarketplace,
  handlePluginConfigure,
  handlePluginInstall,
  handlePluginListInstalled,
  handlePluginListPlugins,
  handlePluginRemoveFromRegistry,
  handlePluginUninstall,
  handlePluginUpdate,
  handlePluginUpdateMarketplace,
  handlePluginUpdateRegistry,
} from "../commands/plugin";
import type { PluginCommandArgs } from "../commands/plugin";
import {
  handleSessionAssociate,
  handleSessionCheckIteration,
  handleSessionInit,
  handleSessionIterationMessage,
  handleSessionLastMessage,
  handleSessionResume,
  handleSessionState,
  handleSessionUpdate,
} from "../commands/session";
import { handleSessionCleanup } from "../commands/sessionCleanup";
import { handleSessionWhoami } from "../commands/sessionWhoami";
import { handleSkillDiscover, handleSkillFetchRemote } from "../commands/skill";
import {
  handleRunCreate,
  handleRunEvents,
  handleRunIterate,
  handleRunRebuildState,
  handleRunRepairJournal,
  handleRunStatus,
} from "./runCommands";
import {
  handleTaskCancel,
  handleTaskList,
  handleTaskPost,
  handleTaskShow,
} from "./taskCommands";

export async function executeRunSessionCommand(parsed: ParsedArgs): Promise<number | undefined> {
  const runTaskResult = await executeRunTaskCommand(parsed);
  if (runTaskResult !== undefined) {
    return runTaskResult;
  }
  const sessionResult = await executeSessionCommand(parsed);
  if (sessionResult !== undefined) {
    return sessionResult;
  }
  return await executeSupportCommand(parsed);
}

async function executeRunTaskCommand(parsed: ParsedArgs): Promise<number | undefined> {
  switch (parsed.command) {
    case "run:create":
      return await handleRunCreate(parsed);
    case "run:rebuild-state":
      return await handleRunRebuildState(parsed);
    case "run:repair-journal":
      return await handleRunRepairJournal(parsed);
    case "run:status":
      return await handleRunStatus(parsed);
    case "run:iterate":
      return await handleRunIterate(parsed);
    case "run:events":
      return await handleRunEvents(parsed);
    case "task:post":
      return await handleTaskPost(parsed);
    case "task:cancel":
      return await handleTaskCancel(parsed);
    case "task:list":
      return await handleTaskList(parsed);
    case "task:show":
      return await handleTaskShow(parsed);
    default:
      return undefined;
  }
}

async function executeSessionCommand(parsed: ParsedArgs): Promise<number | undefined> {
  if (!parsed.command?.startsWith("session:")) {
    return undefined;
  }

  if (parsed.stateDir) {
    const message =
      `The "${parsed.command}" command no longer accepts --state-dir. ` +
      "Session commands always use the configured global session state directory.";
    if (parsed.json) {
      console.log(JSON.stringify({ error: "UNSUPPORTED_FLAG", message }));
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    return 1;
  }

  const sessionAdapter = parsed.harness ? getAdapterByName(parsed.harness) : getAdapter();
  if (parsed.sessionId && sessionAdapter?.autoResolvesSessionId?.()) {
    const message =
      `The "${sessionAdapter.name}" harness auto-detects session IDs from environment variables. ` +
      `Do not pass --session-id explicitly when running inside ${sessionAdapter.name}.`;
    if (parsed.json) {
      console.log(JSON.stringify({ error: "SESSION_ID_CONFLICT", message }));
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    return 1;
  }
  if (!parsed.sessionId && sessionAdapter) {
    parsed.sessionId = sessionAdapter.resolveSessionId(parsed) ?? parsed.sessionId;
  }

  switch (parsed.command) {
    case "session:init":
      return await handleSessionInit({
        sessionId: parsed.sessionId,
        maxIterations: parsed.maxIterations,
        runId: parsed.runIdOverride,
        prompt: parsed.prompt,
        json: parsed.json,
      });
    case "session:associate":
      return await handleSessionAssociate({
        sessionId: parsed.sessionId,
        runId: parsed.runIdOverride,
        force: parsed.sessionForce,
        runsDir: parsed.runsDir,
        json: parsed.json,
      });
    case "session:resume":
      return await handleSessionResume({
        sessionId: parsed.sessionId,
        runId: parsed.runIdOverride,
        maxIterations: parsed.maxIterations,
        runsDir: parsed.runsDir,
        json: parsed.json,
      });
    case "session:state":
      return await handleSessionState({ sessionId: parsed.sessionId, json: parsed.json });
    case "session:update":
      return await handleSessionUpdate({
        sessionId: parsed.sessionId,
        iteration: parsed.iteration,
        lastIterationAt: parsed.lastIterationAt,
        iterationTimes: parsed.iterationTimes,
        delete: parsed.deleteSession,
        json: parsed.json,
      });
    case "session:check-iteration":
      return await handleSessionCheckIteration({ sessionId: parsed.sessionId, json: parsed.json });
    case "session:last-message":
      if (!parsed.transcriptPath) {
        console.error("--transcript-path is required for session:last-message");
        console.error(USAGE);
        return 1;
      }
      return handleSessionLastMessage({ transcriptPath: parsed.transcriptPath, json: parsed.json });
    case "session:iteration-message":
      return await handleSessionIterationMessage({
        iteration: parsed.iteration,
        runId: parsed.runIdOverride,
        runsDir: parsed.runsDir,
        pluginRoot: parsed.pluginRoot,
        json: parsed.json,
      });
    case "session:whoami":
      return handleSessionWhoami({ harness: parsed.harness, json: parsed.json });
    case "session:cleanup":
      return await handleSessionCleanup({ harness: parsed.harness, dryRun: parsed.dryRun, runsDir: parsed.runsDir, json: parsed.json });
    default:
      return undefined;
  }
}

async function executeSupportCommand(parsed: ParsedArgs): Promise<number | undefined> {
  if (parsed.command === "log") {
    return await handleLog({
      logType: parsed.logType ?? "",
      message: parsed.logMessage ?? "",
      runId: parsed.runIdOverride,
      processId: parsed.processId,
      label: parsed.logLabel,
      level: parsed.logLevel,
      source: parsed.logSource,
      json: parsed.json,
    });
  }
  if (parsed.command === "hook:log") {
    return await handleHookLog({ hookType: parsed.hookType ?? "", logFile: parsed.logFile ?? "", json: parsed.json });
  }
  if (parsed.command === "hook:run") {
    const { detectCallerHarness } = await import("../../harness/discovery");
    return await handleHookRun({
      hookType: parsed.hookType ?? "",
      harness: parsed.harness ?? detectCallerHarness()?.name ?? "claude-code",
      pluginRoot: parsed.pluginRoot,
      stateDir: parsed.stateDir,
      runsDir: parsed.runsDir,
      json: parsed.json,
      verbose: parsed.verbose,
    });
  }
  if (parsed.command === "skill:discover") {
    return await handleSkillDiscover({
      pluginRoot: parsed.pluginRoot,
      runId: parsed.runIdOverride,
      cacheTtl: parsed.cacheTtl,
      runsDir: parsed.runsDir,
      json: parsed.json,
      includeRemote: parsed.includeRemote,
      summaryOnly: parsed.summaryOnly,
      processPath: parsed.processPath,
    });
  }
  if (parsed.command === "skill:fetch-remote") {
    return await handleSkillFetchRemote({ sourceType: parsed.sourceType, url: parsed.url, json: parsed.json });
  }
  if (parsed.command?.startsWith("process-library:")) {
    const args: ProcessLibraryCommandArgs = {
      subcommand: parsed.command.split(":")[1] as ProcessLibraryCommandArgs["subcommand"],
      repo: parsed.processLibraryRepo,
      dir: parsed.processLibraryDir,
      ref: parsed.processLibraryRef,
      runId: parsed.runIdOverride,
      sessionId: parsed.sessionId,
      stateDir: parsed.stateDir,
      json: parsed.json,
    };
    return await handleProcessLibraryCommand(args);
  }
  if (parsed.command?.startsWith("instructions:")) {
    if (!parsed.harness) {
      const message = "instructions commands require --harness <name>";
      if (parsed.json) {
        console.log(JSON.stringify({ error: "missing_flag", message }));
      } else {
        console.error(`[instructions] ${message}`);
      }
      return 1;
    }
    const args: InstructionsCommandArgs = {
      subcommand: parsed.command.split(":")[1] as InstructionsCommandArgs["subcommand"],
      harness: parsed.harness,
      interactive: parsed.interactive,
      json: parsed.json,
      showStrata: parsed.showStrata,
    };
    return await handleInstructionsCommand(args);
  }
  if (parsed.command?.startsWith("breakpoint:")) {
    const args: BreakpointCommandArgs = {
      subcommand: parsed.command.split(":")[1],
      pattern: parsed.breakpointPattern,
      ruleId: parsed.breakpointRuleId,
      breakpointId: parsed.breakpointIdArg,
      action: parsed.breakpointAction,
      source: parsed.breakpointSource ?? parsed.logSource,
      note: parsed.breakpointNote,
      tags: parsed.breakpointTags,
      expert: parsed.breakpointExpert,
      runsDir: parsed.runsDir,
      limit: parsed.limit,
      json: parsed.json,
    };
    return await handleBreakpointCommand(args);
  }
  if (parsed.command?.startsWith("profile:")) {
    const args: ProfileCommandArgs = {
      subcommand: parsed.command.split(":")[1] as ProfileCommandArgs["subcommand"],
      user: parsed.profileUser ?? false,
      project: parsed.profileProject ?? false,
      inputPath: parsed.profileInputPath,
      dir: parsed.profileDir,
      json: parsed.json,
    };
    return await handleProfileCommand(parsed.command.split(":")[1], args);
  }
  if (parsed.command?.startsWith("plugin:")) {
    const args: PluginCommandArgs = {
      pluginName: parsed.pluginName,
      marketplaceName: parsed.marketplaceName,
      marketplaceUrl: parsed.marketplaceUrl,
      marketplacePath: parsed.marketplacePath,
      marketplaceBranch: parsed.marketplaceBranch,
      pluginVersion: parsed.pluginVersion,
      scope: parsed.pluginScope,
      force: parsed.pluginForce,
      json: parsed.json,
      verbose: parsed.verbose,
      runsDir: parsed.runsDir,
    };
    switch (parsed.command) {
      case "plugin:add-marketplace":
        return await handlePluginAddMarketplace(args);
      case "plugin:update-marketplace":
        return await handlePluginUpdateMarketplace(args);
      case "plugin:list-plugins":
        return await handlePluginListPlugins(args);
      case "plugin:install":
        return await handlePluginInstall(args);
      case "plugin:uninstall":
        return await handlePluginUninstall(args);
      case "plugin:update":
        return await handlePluginUpdate(args);
      case "plugin:configure":
        return await handlePluginConfigure(args);
      case "plugin:list-installed":
        return await handlePluginListInstalled(args);
      case "plugin:update-registry":
        return await handlePluginUpdateRegistry(args);
      case "plugin:remove-from-registry":
        return await handlePluginRemoveFromRegistry(args);
    }
  }
  return undefined;
}
