import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import {
  buildImage,
  dockerExec,
  exec,
  startContainer,
  stopContainer,
} from "./helpers";

const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_ROOT = path.join(ROOT, "e2e-artifacts", "session-create-internal");
const WORKSPACE = "/workspace/session-create-internal";
const FULL_INTERNAL_RUN_TIMEOUT_MS = 2_700_000;
const HAS_PROVIDER = Boolean(
  process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_PROJECT_NAME,
);
const describeInternalHarness = HAS_PROVIDER ? describe : describe.skip;

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function prepareArtifactDir(): void {
  rmSync(ARTIFACT_ROOT, { recursive: true, force: true });
  mkdirSync(ARTIFACT_ROOT, { recursive: true });
}

function copyArtifacts(): void {
  try {
    exec(`docker cp babysitter-e2e-container:${WORKSPACE} ${ARTIFACT_ROOT}/workspace`, {
      timeout: 120_000,
    });
  } catch {
    // best effort
  }

  try {
    exec(`docker cp babysitter-e2e-container:/tmp/session-create-internal.log ${ARTIFACT_ROOT}/session-create.log`, {
      timeout: 120_000,
    });
  } catch {
    // best effort
  }
}

beforeAll(() => {
  if (!HAS_PROVIDER) return;
  prepareArtifactDir();
  buildImage(ROOT);
  startContainer();
}, 900_000);

afterAll(() => {
  if (!HAS_PROVIDER) return;
  copyArtifacts();
  stopContainer();
});

describeInternalHarness("babysitter-harness call full internal-harness run", () => {
  test("runs the repo-installed sdk CLI non-interactively and completes a real internal harness session", () => {
    const agents = [
      "# Session-create CI guardrails",
      "",
      "- Build the smallest possible local HTML page that satisfies the request.",
      "- Prefer a single HTML file with inline CSS and at most a tiny verification note.",
      "- Keep all work inside the current workspace.",
      "- Finish only when the generated page can be opened locally and basic verification files exist.",
      "",
    ].join("\n");
    writeFileSync(path.join(ARTIFACT_ROOT, "AGENTS.md"), agents, "utf8");

    dockerExec(
      [
        "rm -rf /workspace/session-create-internal",
        "mkdir -p /workspace/session-create-internal",
        "cat > /workspace/session-create-internal/AGENTS.md <<'__AGENTS__'",
        agents,
        "__AGENTS__",
        "cd /workspace/session-create-internal",
        "git init -q",
      ].join("\n"),
      {
        timeout: 120_000,
      },
    );

    try {
      dockerExec(
        [
          "cd /workspace/session-create-internal",
          "set -euo pipefail",
          `export AZURE_OPENAI_API_KEY=${shellEscape(process.env.AZURE_OPENAI_API_KEY || "")}`,
          `export AZURE_OPENAI_PROJECT_NAME=${shellEscape(process.env.AZURE_OPENAI_PROJECT_NAME || "")}`,
          `export AZURE_OPENAI_RESOURCE_NAME=${shellEscape(process.env.AZURE_OPENAI_PROJECT_NAME || "")}`,
          `export AZURE_OPENAI_BASE_URL=${shellEscape(`https://${process.env.AZURE_OPENAI_PROJECT_NAME}.openai.azure.com`)}`,
          `export AZURE_OPENAI_DEPLOYMENT=${shellEscape(process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.4")}`,
          "babysitter-harness call --prompt \"create a single minimal HTML page that says hello\" --harness pi --model gpt-5.4 --workspace /workspace/session-create-internal --runs-dir /workspace/session-create-internal/.a5c/runs --no-interactive --verbose 2>&1 | tee /tmp/session-create-internal.log",
        ].join("\n"),
        {
          timeout: FULL_INTERNAL_RUN_TIMEOUT_MS,
          maxBuffer: 20 * 1024 * 1024,
        },
      );
    } finally {
      copyArtifacts();
    }

    const runIds = dockerExec("ls -1 /workspace/session-create-internal/.a5c/runs").trim().split(/\r?\n/).filter(Boolean);
    expect(runIds.length).toBe(1);

    const runDir = `/workspace/session-create-internal/.a5c/runs/${runIds[0]}`;
    const status = JSON.parse(
      dockerExec(`babysitter run:status ${runDir} --json`, {
        timeout: 120_000,
      }),
    ) as { state?: string; completionProof?: string };
    expect(status.state).toBe("completed");
    expect(status.completionProof).toBeTruthy();

    const processFileExists = dockerExec(
      "find /workspace/session-create-internal/.a5c/processes -maxdepth 1 \\( -name '*.js' -o -name '*.mjs' \\) | grep -q . && echo ok || echo missing",
    ).trim();
    expect(processFileExists).toBe("ok");

    const outputExists = dockerExec(`test -f ${runDir}/state/output.json && echo ok`).trim();
    expect(outputExists).toBe("ok");
  }, FULL_INTERNAL_RUN_TIMEOUT_MS);
});
