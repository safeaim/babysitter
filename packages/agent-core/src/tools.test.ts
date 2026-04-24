import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("@a5c-ai/babysitter-sdk", () => ({
  nextUlid: vi.fn(() => "background-task-id"),
  CONFIG_ENV_VARS: {
    RUNS_DIR: "BABYSITTER_RUNS_DIR",
    MAX_ITERATIONS: "BABYSITTER_MAX_ITERATIONS",
    QUALITY_THRESHOLD: "BABYSITTER_QUALITY_THRESHOLD",
    TIMEOUT: "BABYSITTER_TIMEOUT",
    LOG_LEVEL: "BABYSITTER_LOG_LEVEL",
    ALLOW_SECRET_LOGS: "BABYSITTER_ALLOW_SECRET_LOGS",
    HOOK_TIMEOUT: "BABYSITTER_HOOK_TIMEOUT",
    NODE_TASK_TIMEOUT: "BABYSITTER_NODE_TASK_TIMEOUT",
  },
  DEFAULTS: {
    runsDir: ".a5c/runs",
    maxIterations: 5,
    qualityThreshold: 0.8,
    timeout: 60_000,
    logLevel: "info",
    allowSecretLogs: false,
    hookTimeout: 30_000,
    nodeTaskTimeout: 30_000,
    clockStepMs: 1,
    clockStartMs: 0,
    layoutVersion: "test",
    largeResultPreviewLimit: 1000,
  },
  getConfig: vi.fn(() => ({
    runsDir: ".a5c/runs",
    maxIterations: 5,
    qualityThreshold: 0.8,
    timeout: 60_000,
    logLevel: "info",
    allowSecretLogs: false,
    hookTimeout: 30_000,
    nodeTaskTimeout: 30_000,
    clockStepMs: 1,
    clockStartMs: 0,
    layoutVersion: "test",
    largeResultPreviewLimit: 1000,
  })),
}));

import * as childProcess from "node:child_process";

import {
  createAgentCoreToolDefinitions,
  extractTextFromHtml,
  filterByRelevance,
  parseSearchResults,
  stripHtmlTags,
} from "./tools";
import {
  createAgentCoreToolDefinitions as createAgentCoreToolDefinitionsFromIndex,
  DeferredToolRegistry,
} from "./index";

function getText(result: Awaited<ReturnType<ReturnType<typeof getTool>["execute"]>>) {
  return result.content[0]?.text ?? "";
}

function getTool(name: string, workspace: string, onToolUse?: (toolName: string, params: unknown) => void) {
  const definitions = createAgentCoreToolDefinitions({
    workspace,
    interactive: false,
    onToolUse,
    deferredToolRegistry: new DeferredToolRegistry(),
  });
  const tool = definitions.find((definition) => definition.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }
  return tool;
}

describe("agent-core tools", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("wraps tool definitions and records onToolUse for file-system flows", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "agent-core-tools-"));
    const filePath = path.join(workspace, "note.txt");
    writeFileSync(filePath, "first line\nsecond line\n", "utf8");
    const onToolUse = vi.fn();

    const readTool = getTool("read", workspace, onToolUse);
    const editTool = getTool("edit", workspace, onToolUse);

    const readResult = await readTool.execute("call-read", { path: "note.txt", offset: 2, limit: 1 });
    const editResult = await editTool.execute("call-edit", {
      path: "note.txt",
      old_string: "second line",
      new_string: "updated line",
    });
    const failedEdit = await editTool.execute("call-edit-fail", {
      path: "note.txt",
      old_string: "missing text",
      new_string: "ignored",
    });

    expect(getText(readResult)).toBe("2\tsecond line");
    expect(getText(editResult)).toContain("File edited:");
    expect(readFileSync(filePath, "utf8")).toContain("updated line");
    expect(getText(failedEdit)).toBe("Error: old_string not found in note.txt. Ensure it matches exactly.");
    expect(onToolUse).toHaveBeenNthCalledWith(1, "read", { path: "note.txt", offset: 2, limit: 1 });
    expect(onToolUse).toHaveBeenNthCalledWith(2, "edit", {
      path: "note.txt",
      old_string: "second line",
      new_string: "updated line",
    });
  });

  it("executes the bash wrapper and returns combined output with exit code", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "agent-core-bash-"));
    vi.mocked(childProcess.spawn).mockImplementation(() => {
      const processHandle = new PassThrough() as unknown as childProcess.ChildProcessWithoutNullStreams;
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      Object.assign(processHandle, { stdout, stderr });
      setTimeout(() => {
        stdout.write("stdout text");
        stderr.write("stderr text");
        stdout.end();
        stderr.end();
        (processHandle as unknown as PassThrough).emit("close", 7);
      }, 0);
      return processHandle;
    });

    const bashTool = getTool("bash", workspace);
    const result = await bashTool.execute("call-bash", { command: "echo test" });
    const parsed = JSON.parse(getText(result)) as { output: string; exitCode: number };

    expect(childProcess.spawn).toHaveBeenCalledOnce();
    expect(parsed).toEqual({
      output: "stdout text\nstderr text",
      exitCode: 7,
    });
  });

  it("processes fetched html content and exposes helper exports directly", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "agent-core-web-"));
    const fetchMock = vi.fn(async () => ({
      headers: {
        get: (name: string) => (name === "content-type" ? "text/html; charset=utf-8" : null),
      },
      text: async () => "<html><body><h1>Title &amp; Stuff</h1><p>Alpha topic</p><p>Beta only</p></body></html>",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const fetchProcessTool = getTool("fetch_process", workspace);
    const result = await fetchProcessTool.execute("call-fetch-process", {
      url: "https://example.com",
      prompt: "Alpha",
      format: "markdown",
    });
    const parsed = JSON.parse(getText(result)) as { content: string; format: string };

    expect(parsed.format).toBe("markdown");
    expect(parsed.content).toContain("Alpha topic");
    expect(parsed.content).not.toContain("Beta only");

    const searchResults = parseSearchResults(
      '<a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com%2Fdoc">Doc &amp; More</a>'
        + '<a class="result__snippet">Snippet &lt;strong&gt;text&lt;/strong&gt;</a>',
      5,
    );
    expect(searchResults).toEqual([
      {
        title: "Doc & More",
        url: "https://example.com/doc",
        snippet: "Snippet <strong>text</strong>",
      },
    ]);
    expect(stripHtmlTags("<p>A &amp; B</p>")).toBe("A & B");
    expect(
      extractTextFromHtml("<div><h1>Title &amp; Stuff</h1><p>One</p><p>Two</p></div>", "markdown"),
    ).toContain("# Title & Stuff");
    expect(filterByRelevance("Alpha text\n\nBeta text", "Alpha focus")).toBe("Alpha text");
    expect(createAgentCoreToolDefinitionsFromIndex).toBe(createAgentCoreToolDefinitions);
  });
});
