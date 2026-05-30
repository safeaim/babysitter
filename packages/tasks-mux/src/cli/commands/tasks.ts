import { Command } from "commander";
import { GitNativeBackend } from "../../backends/git-native.js";
import type { BreakpointStatus, TaskPriority } from "../../types.js";
import { formatTable, printError } from "../output.js";

interface GlobalOpts {
  json?: boolean;
}

interface LocalBackendOpts {
  breakpointsDir?: string;
}

function backend(opts: LocalBackendOpts): GitNativeBackend {
  return new GitNativeBackend({ breakpointsDir: opts.breakpointsDir });
}

function splitCsv<T extends string>(value: string | undefined): T[] | undefined {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) as T[] | undefined;
}

function printResult(value: unknown, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

export function createTasksCommand(): Command {
  const cmd = new Command("tasks")
    .description("Manage task-like breakpoints with git-native task-management features")
    .option("--breakpoints-dir <path>", "Path to .breakpoints directory");

  cmd
    .command("search")
    .description("Search task-like breakpoints")
    .option("-q, --query <text>", "Text query")
    .option("--status <csv>", "Comma-separated statuses")
    .option("--priority <csv>", "Comma-separated priorities")
    .option("--assignee <id>", "Assignee responder id")
    .option("--responder <id>", "Target/claimed/answering responder id")
    .option("--tag <csv>", "Comma-separated tags")
    .option("--domain <domain>", "Domain filter")
    .option("--limit <n>", "Maximum result count")
    .action(async (opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        const result = await backend(allOpts).searchBreakpoints({
          query: opts.query,
          status: splitCsv<BreakpointStatus>(opts.status),
          priority: splitCsv<TaskPriority>(opts.priority),
          assigneeId: opts.assignee,
          responderId: opts.responder,
          tags: splitCsv<string>(opts.tag),
          domain: opts.domain,
          limit: opts.limit ? Number.parseInt(opts.limit, 10) : undefined,
        });
        if (jsonMode) {
          printResult(result, true);
        } else {
          const rows = result.items.map((task) => [
            task.id,
            task.status,
            task.priority ?? "medium",
            task.assigneeId ?? "",
            task.text,
          ]);
          console.log(formatTable(rows, ["ID", "Status", "Priority", "Assignee", "Task"]));
        }
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  cmd
    .command("assign")
    .description("Assign or reassign a task-like breakpoint")
    .argument("<taskId>")
    .requiredOption("--assignee <id>", "Assignee responder id")
    .option("--assignee-name <name>", "Assignee display name")
    .option("--actor <id>", "Actor id")
    .action(async (taskId: string, opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        const result = await backend(allOpts).assignBreakpoint(taskId, {
          assigneeId: opts.assignee ?? "",
          assigneeName: opts.assigneeName,
          actorId: opts.actor,
        });
        printResult(result, jsonMode);
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  cmd
    .command("close")
    .description("Mark a task-like breakpoint completed")
    .argument("<taskId>")
    .option("--actor <id>", "Actor id")
    .option("--message <text>", "History message")
    .action(async (taskId: string, opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        const result = await backend(allOpts).transitionBreakpoint(taskId, {
          status: "completed",
          actorId: opts.actor,
          message: opts.message,
        });
        printResult(result, jsonMode);
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  cmd
    .command("comment")
    .description("Add a discussion comment to a task-like breakpoint")
    .argument("<taskId>")
    .requiredOption("--author <id>", "Author id")
    .requiredOption("--text <text>", "Comment text")
    .option("--author-name <name>", "Author display name")
    .action(async (taskId: string, opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        const result = await backend(allOpts).addBreakpointComment(taskId, {
          authorId: opts.author ?? "",
          authorName: opts.authorName,
          text: opts.text ?? "",
        });
        printResult(result, jsonMode);
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  cmd
    .command("stats")
    .description("Show task metrics grouped by status and priority")
    .action(async (_opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        printResult(await backend(allOpts).getBreakpointMetrics(), jsonMode);
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  cmd
    .command("export")
    .description("Export task-like breakpoints with credential redaction")
    .action(async (_opts: Record<string, string | undefined>, command: Command) => {
      const allOpts: GlobalOpts & LocalBackendOpts = command.optsWithGlobals();
      const jsonMode = allOpts.json === true;
      try {
        printResult(await backend(allOpts).exportBreakpoints(), jsonMode);
      } catch (error) {
        printError(error, jsonMode);
        process.exitCode = 1;
      }
    });

  return cmd;
}
