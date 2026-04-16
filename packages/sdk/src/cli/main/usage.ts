import type { HelpSurface } from "./types";

const AGENT_COMMAND_USAGE = `  babysitter run:create --process-id <id> --entry <path#export> [--runs-dir <dir>] [--inputs <file>] [--run-id <id>] [--process-revision <rev>] [--request <id>] [--prompt <text>] [--harness <name>] [--session-id <id>] [--plugin-root <dir>] [--non-interactive] [--json] [--dry-run]
  babysitter run:status <runDir> [--runs-dir <dir>] [--json]
  babysitter run:events <runDir> [--runs-dir <dir>] [--json] [--limit <n>] [--reverse] [--filter-type <type>]
  babysitter run:rebuild-state <runDir> [--runs-dir <dir>] [--json] [--dry-run]
  babysitter run:repair-journal <runDir> [--runs-dir <dir>] [--json] [--dry-run]
  babysitter run:iterate <runDir> [--runs-dir <dir>] [--json] [--verbose] [--iteration <n>]
  babysitter task:post <runDir> <effectId> --status <ok|error> [--runs-dir <dir>] [--json] [--dry-run] [--value <file>] [--value-inline <json>] [--error <file>] [--stdout-ref <ref>] [--stderr-ref <ref>] [--stdout-file <file>] [--stderr-file <file>] [--started-at <iso8601>] [--finished-at <iso8601>] [--metadata <file>] [--invocation-key <key>]
  babysitter task:list <runDir> [--runs-dir <dir>] [--pending] [--kind <kind>] [--json]
  babysitter task:show <runDir> <effectId> [--runs-dir <dir>] [--json]
  babysitter session:resume --session-id <id> --run-id <id> [--max-iterations <n>] [--runs-dir <dir>] [--json]
  babysitter session:iteration-message --iteration <n> [--run-id <id>] [--runs-dir <dir>] [--plugin-root <dir>] [--json]
  babysitter skill:discover --plugin-root <dir> [--run-id <id>] [--cache-ttl <seconds>] [--runs-dir <dir>] [--include-remote] [--summary-only] [--process-path <path>] [--json]
  babysitter process-library:active [--run-id <id>] [--session-id <id>] [--state-dir <dir>] [--json]
  babysitter profile:read --user|--project [--dir <dir>] [--json]
  babysitter profile:write --user|--project --input <file> [--dir <dir>] [--json]
  babysitter profile:merge --user|--project --input <file> [--dir <dir>] [--json]
  babysitter profile:render --user|--project [--dir <dir>] [--json]
  babysitter instructions:babysit-skill --harness <name> [--interactive|--no-interactive] [--json]`;

const HUMAN_COMMAND_USAGE = `  babysitter session:init --session-id <id> [--max-iterations <n>] [--run-id <id>] [--prompt <text>] [--json]
  babysitter session:associate --session-id <id> --run-id <id> [--force] [--runs-dir <dir>] [--json]
  babysitter session:state --session-id <id> [--json]
  babysitter session:update --session-id <id> [--iteration <n>] [--last-iteration-at <iso8601>] [--iteration-times <csv>] [--delete] [--json]
  babysitter session:check-iteration --session-id <id> [--json]
  babysitter session:last-message --transcript-path <file> [--json]
  babysitter log --type <process|hook|cli> --message <msg> [--run-id <id>] [--label <label>] [--level <level>] [--source <src>] [--json]
  babysitter hook:log --hook-type <type> --log-file <path> [--json]
  babysitter hook:run --hook-type <stop|session-start|user-prompt-submit|pre-tool-use> [--harness <claude-code|gemini-cli>] [--plugin-root <dir>] [--state-dir <dir>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter compress-output <command and args...>
  babysitter skill:fetch-remote --source-type <github|well-known> --url <url> [--json]
  babysitter process-library:clone [--repo <url>] [--dir <path>] [--ref <ref>] [--state-dir <dir>] [--json]
  babysitter process-library:update [--dir <path>] [--ref <ref>] [--state-dir <dir>] [--json]
  babysitter process-library:use [--dir <path>] [--run-id <id>] [--session-id <id>] [--state-dir <dir>] [--ref <ref>] [--json]
  babysitter plugin:install [<pluginName>] [--plugin-name <name>] [--plugin-version <ver>] [--global|--project] [--json] [--verbose]
  babysitter plugin:uninstall [<pluginName>] [--plugin-name <name>] [--global|--project] [--json] [--verbose]
  babysitter plugin:update [<pluginName>] [--plugin-name <name>] [--plugin-version <ver>] [--global|--project] [--json] [--verbose]
  babysitter plugin:configure [<pluginName>] [--plugin-name <name>] [--global|--project] [--json] [--verbose]
  babysitter plugin:list-installed [--global|--project] [--json] [--verbose]
  babysitter plugin:list-plugins --marketplace-name <name> [--global|--project] [--json] [--verbose]
  babysitter plugin:add-marketplace --marketplace-url <url> [--marketplace-path <path>] [--marketplace-branch <ref>] [--force] [--global|--project] [--json] [--verbose]
  babysitter plugin:update-marketplace --marketplace-name <name> [--marketplace-branch <ref>] [--global|--project] [--json] [--verbose]
  babysitter plugin:update-registry [<pluginName>] [--plugin-name <name>] [--plugin-version <ver>] [--global|--project] [--json] [--verbose]
  babysitter plugin:remove-from-registry [<pluginName>] [--plugin-name <name>] [--global|--project] [--json] [--verbose]
  babysitter tokens:stats [runId] [--all] [--runs-dir <dir>] [--json]
  babysitter cost:stats [runId] [--all] [--runs-dir <dir>] [--json]
  babysitter compression:status [--json]
  babysitter compression:toggle <layer> <on|off> [--json]
  babysitter compression:set <layer.key> <value> [--json]
  babysitter compression:reset [--json]
  babysitter harness:create-run [--prompt <text>] [--harness <name>] [--process <path>] [--workspace <dir>] [--model <model>] [--max-iterations <n>] [--runs-dir <dir>] [--interactive|--no-interactive|--non-interactive] [--json] [--verbose]
  babysitter harness:call [...]                  (alias for harness:create-run)
  babysitter harness:yolo [...]                  (alias for harness:create-run --non-interactive)
  babysitter harness:plan [...]                  (alias for harness:create-run, stops after Phase 1)
  babysitter harness:forever [...]               (alias for harness:create-run, infinite loop process)
  babysitter harness:resume-run [--run-id <id>] [--runs-dir <dir>] [--harness <name>] [--workspace <dir>] [--model <model>] [--max-iterations <n>] [--interactive|--no-interactive] [--json] [--verbose]
  babysitter harness:resume [...]                (alias for harness:resume-run)
  babysitter harness:retrospect [--run-id <id>...] [--all] [--prompt <text>] [--harness <name>] [--workspace <dir>] [--model <model>] [--max-iterations <n>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:cleanup [--dry-run] [--keep-days <n>] [--prompt <text>] [--harness <name>] [--workspace <dir>] [--model <model>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:assimilate [--prompt <text>] [--harness <name>] [--workspace <dir>] [--model <model>] [--max-iterations <n>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:doctor [--run-id <id>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:contrib [--prompt <text>] [--harness <name>] [--workspace <dir>] [--model <model>] [--max-iterations <n>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:anycli --service <name> [--scope <scopes>] [--mcp] [--auth-file <path>] [--transport <type>] [--prompt <text>] [--workspace <dir>] [--json] [--verbose]
  babysitter harness:session-history --session-id <id> --state-dir <dir> [--run-id <id>] [--json]
  babysitter harness:help [<topic>]
  babysitter harness:observe [--workspace <dir>]
  babysitter harness:user-install [--harness <name>] [--workspace <dir>] [--model <model>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:project-install [--harness <name>] [--workspace <dir>] [--model <model>] [--runs-dir <dir>] [--json] [--verbose]
  babysitter harness:discover [--json]
  babysitter harness:list [--json]
  babysitter harness:install <name> [--workspace <dir>] [--json] [--dry-run] [--verbose]
  babysitter harness:install-plugin <name> [--workspace <dir>] [--json] [--dry-run] [--verbose]
  babysitter harness:invoke <name> --prompt <text> [--workspace <dir>] [--model <model>] [--timeout <ms>] [--json]
  babysitter instructions:process-create --harness <name> [--interactive|--no-interactive] [--json]
  babysitter instructions:orchestrate --harness <name> [--interactive|--no-interactive] [--json]
  babysitter instructions:breakpoint-handling --harness <name> [--interactive|--no-interactive] [--json]
  babysitter mcp:serve [--json]
  babysitter jsonl:interactive [--runs-dir <dir>]
  babysitter breakpoint:approve-rule <pattern> [--action auto-approve|never-auto-approve] [--source <source>] [--note <note>] [--json]
  babysitter breakpoint:remove-rule <ruleId> [--json]
  babysitter breakpoint:list-rules [--json]
  babysitter breakpoint:should-auto-approve <breakpointId> [--tags <csv>] [--expert <expert>] [--json]
  babysitter breakpoint:history [--breakpoint-id <id>] [--runs-dir <dir>] [--limit <n>] [--json]
  babysitter health [--json] [--verbose]
  babysitter configure [show|validate|paths] [--json] [--defaults-only]
  babysitter version`;

const GLOBAL_FLAGS_USAGE = `Global flags:
  --runs-dir <dir>   Override the runs directory (defaults to .a5c/runs).
  --json             Emit JSON output when supported by the command.
  --dry-run          Describe planned mutations without changing on-disk state.
  --verbose          Log resolved paths and options to stderr for debugging.
  --show-config      Show current configuration before executing command.
  --help, -h         Show agent-facing help text.
  --help-human       Show human-facing help text.
  --version, -v      Show CLI version.`;

export const AGENT_USAGE = `Usage:
Agent commands:
${AGENT_COMMAND_USAGE}

${GLOBAL_FLAGS_USAGE}`;

export const HUMAN_USAGE = `Usage:
Human commands:
${HUMAN_COMMAND_USAGE}

${GLOBAL_FLAGS_USAGE}`;

export const USAGE = AGENT_USAGE;

export function formatUsage(surface: HelpSurface): string {
  return surface === "human" ? HUMAN_USAGE : AGENT_USAGE;
}
