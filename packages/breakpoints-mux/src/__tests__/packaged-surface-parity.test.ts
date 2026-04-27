import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const packageJson = JSON.parse(
  readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as {
  version: string;
  bin: Record<string, string>;
  exports: Record<string, unknown>;
  files: string[];
};

const cliIndexSource = readFileSync(
  path.join(packageRoot, "src/cli/index.ts"),
  "utf8",
);
const cliProgramSource = readFileSync(
  path.join(packageRoot, "src/cli/program.ts"),
  "utf8",
);
const mcpServerSource = readFileSync(
  path.join(packageRoot, "src/mcp/server.ts"),
  "utf8",
);
const commandSources = {
  ask: readFileSync(path.join(packageRoot, "src/cli/commands/ask.ts"), "utf8"),
  responders: readFileSync(path.join(packageRoot, "src/cli/commands/responders.ts"), "utf8"),
  breakpoints: readFileSync(path.join(packageRoot, "src/cli/commands/breakpoints.ts"), "utf8"),
  responderLoop: readFileSync(path.join(packageRoot, "src/cli/commands/responder-loop.ts"), "utf8"),
  server: readFileSync(path.join(packageRoot, "src/cli/commands/server.ts"), "utf8"),
  auth: readFileSync(path.join(packageRoot, "src/cli/commands/auth.ts"), "utf8"),
} as const;

const docFiles = [
  "README.md",
  "docs/setup-guide.md",
  "docs/expert-guide.md",
  "skills/ask-expert/SKILL.md",
  "skills/pending-questions/SKILL.md",
  "specs/architecture.md",
] as const;

const docs = new Map(
  docFiles.map((file) => [
    file,
    readFileSync(path.join(packageRoot, file), "utf8"),
  ]),
);

const staleSurfaceTokens = [
  "bmux",
  "submit_breakpoint",
  "respond_to_breakpoint",
  "cancel_breakpoint",
  "questionId",
  "expertId",
  "expertName",
  "requiredExpertise",
  "packages/server",
  "packages/mcp-tool",
  "src/cli.ts",
] as const;

const mcpToolParamFiles = {
  ask_breakpoint: "src/mcp/tools/ask-breakpoint.ts",
  check_breakpoint_status: "src/mcp/tools/check-status.ts",
  list_breakpoints: "src/mcp/tools/list-breakpoints.ts",
  answer_breakpoint: "src/mcp/tools/answer-breakpoint.ts",
  verify_breakpoint_answer: "src/mcp/tools/verify-answer.ts",
  list_responders: "src/mcp/tools/list-responders.ts",
  claim_breakpoint: "src/mcp/tools/claim-breakpoint.ts",
  poll_breakpoints: "src/mcp/tools/poll-breakpoints.ts",
} as const;

const mcpToolParams = Object.fromEntries(
  Object.entries(mcpToolParamFiles).map(([toolName, relativePath]) => {
    const source = readFileSync(path.join(packageRoot, relativePath), "utf8");
    return [toolName, extractObjectKeys(source, /export const \w+Params = \{([\s\S]*?)\n\};/)];
  }),
) as Record<keyof typeof mcpToolParamFiles, string[]>;

const expectedCliCommandPaths = [
  "ask",
  "responders list",
  "responders show",
  "breakpoints pending",
  "breakpoints answer",
  "breakpoints status",
  "breakpoints poll",
  "server start",
  "responder-loop",
  "auth login",
  "auth logout",
  "auth status",
  "auth server set",
  "auth server clear",
  "auth token set",
  "auth token clear",
  "auth keygen",
  "auth key-push",
  "auth keys",
] as const;

function extractObjectKeys(source: string, pattern: RegExp): string[] {
  const match = source.match(pattern);
  assert.ok(match, `Could not find object literal in source`);

  const keys: string[] = [];
  let depth = 0;

  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    const keyMatch = trimmed.match(/^([A-Za-z0-9_]+):/);
    if (depth === 0 && keyMatch) {
      keys.push(keyMatch[1]);
    }

    for (const char of line) {
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
    }
  }

  return keys;
}

function cliProgramNameFromSource(): string {
  const match = cliProgramSource.match(/\.name\("([^"]+)"\)/);
  assert.ok(match, "Could not find CLI program name in src/cli/program.ts");
  return match[1];
}

function cliProgramVersionFromSource(): string {
  const match = cliProgramSource.match(/\.version\("([^"]+)"\)/);
  assert.ok(match, "Could not find CLI program version in src/cli/program.ts");
  return match[1];
}

function flattenCommandPaths(programName: string): string[] {
  assert.equal(cliProgramNameFromSource(), programName);

  const commandPaths = [
    extractNewCommandName(commandSources.ask),
    ...extractNestedCommandPaths(
      extractNewCommandName(commandSources.responders),
      commandSources.responders,
    ),
    ...extractNestedCommandPaths(
      extractNewCommandName(commandSources.breakpoints),
      commandSources.breakpoints,
    ),
    extractNewCommandName(commandSources.responderLoop),
    ...extractNestedCommandPaths(
      extractNewCommandName(commandSources.server),
      commandSources.server,
    ),
    ...extractAuthCommandPaths(commandSources.auth),
  ];

  return commandPaths.sort();
}

function extractNewCommandName(source: string): string {
  const match = source.match(/new Command\("([^"]+)"\)/);
  assert.ok(match, "Could not find new Command(...) in source");
  return match[1];
}

function extractNestedCommandPaths(prefix: string, source: string): string[] {
  return [...source.matchAll(/\.command\("([^"]+)"\)/g)]
    .map((match) => `${prefix} ${match[1]}`);
}

function extractAuthCommandPaths(source: string): string[] {
  const directCommands = [...source.matchAll(/new Command\("([^"]+)"\)/g)]
    .map((match) => match[1])
    .filter((name) => !["auth", "server", "token"].includes(name))
    .map((name) => `auth ${name}`);

  const serverSection = source.match(/function createServerConfigCommand\(\): Command \{([\s\S]*?)return cmd;\n\}/);
  assert.ok(serverSection, "Could not find createServerConfigCommand in auth.ts");
  const tokenSection = source.match(/function createTokenCommand\(\): Command \{([\s\S]*?)return cmd;\n\}/);
  assert.ok(tokenSection, "Could not find createTokenCommand in auth.ts");

  return [
    "auth",
    ...directCommands,
    "auth server",
    ...extractNestedCommandPaths("auth server", serverSection[1]),
    "auth token",
    ...extractNestedCommandPaths("auth token", tokenSection[1]),
  ];
}

function cliVersionFromIndexSource(): string {
  const match = cliIndexSource.match(/CLI_VERSION\s*=\s*"([^"]+)"/);
  assert.ok(match, "Could not find CLI_VERSION in src/cli/index.ts");
  return match[1];
}

function mcpIdentityVersionFromSource(): string {
  const match = mcpServerSource.match(/version:\s*"([^"]+)"/);
  assert.ok(match, "Could not find MCP server identity version in src/mcp/server.ts");
  return match[1];
}

function registeredToolNamesFromSource(): string[] {
  return [...mcpServerSource.matchAll(/server\.tool\(\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .sort();
}

function parseToolArgsBlocks(markdown: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const blocks = [...markdown.matchAll(/Tool:\s*`([^`]+)`\s*```json\s*([\s\S]*?)```/g)];
  return blocks.map((match) => ({
    tool: match[1],
    args: JSON.parse(match[2]) as Record<string, unknown>,
  }));
}

function main(): void {
  assert.equal(packageJson.version, "5.0.0");
  assert.equal(cliProgramVersionFromSource(), packageJson.version);
  assert.equal(cliVersionFromIndexSource(), packageJson.version);
  assert.equal(mcpIdentityVersionFromSource(), "0.1.0");

  assert.deepEqual(Object.keys(packageJson.bin), ["breakpoints-mux"]);
  assert.deepEqual(Object.keys(packageJson.exports), [
    ".",
    "./backends",
    "./proven",
    "./mcp",
    "./harness",
    "./auth",
    "./config",
  ]);
  assert.deepEqual(packageJson.files, ["dist", "responder", "README.md"]);

  const commandPaths = flattenCommandPaths("breakpoints-mux");
  assert.deepEqual(
    commandPaths.filter((value) => value !== "auth" && value !== "auth server" && value !== "auth token"),
    [...expectedCliCommandPaths].sort(),
  );
  assert.ok(!commandPaths.includes("breakpoints cancel"));

  assert.ok(docs.get("README.md")?.includes("npx @a5c-ai/breakpoints-mux --help"));
  assert.ok(docs.get("docs/setup-guide.md")?.includes("breakpoints-mux server start"));
  assert.ok(
    docs.get("docs/expert-guide.md")?.includes(
      "breakpoints-mux responder-loop --responder security-responder",
    ),
  );

  const expectedTools = Object.keys(mcpToolParams).sort();
  assert.deepEqual(registeredToolNamesFromSource(), expectedTools);

  const combinedDocs = [...docs.values()].join("\n");
  for (const toolName of expectedTools) {
    assert.ok(combinedDocs.includes(toolName), `Expected docs to mention ${toolName}`);
  }

  for (const file of [
    "docs/expert-guide.md",
    "skills/ask-expert/SKILL.md",
    "skills/pending-questions/SKILL.md",
  ] as const) {
    const examples = parseToolArgsBlocks(docs.get(file)!);
    assert.ok(examples.length > 0, `Expected at least one tool example in ${file}`);

    for (const example of examples) {
      const allowedKeys = new Set(mcpToolParams[example.tool as keyof typeof mcpToolParams]);
      assert.ok(allowedKeys.size > 0, `Unknown MCP tool example: ${example.tool}`);
      for (const key of Object.keys(example.args)) {
        assert.ok(
          allowedKeys.has(key),
          `${file} documents ${example.tool}.${key}, which is not a current parameter`,
        );
      }
    }
  }

  for (const [file, content] of docs.entries()) {
    for (const token of staleSurfaceTokens) {
      assert.ok(!content.includes(token), `${file} should not mention ${token}`);
    }
  }

  process.stdout.write("packaged surface parity ok\n");
}

main();
