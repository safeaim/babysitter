/**
 * @process assimilation/methodologies/sql-tool-agent
 * @description Assimilate the "SQL-Tool-over-MCP for Curated Domain Agents"
 *   methodology from Michael Lugassy's LinkedIn post (2026). Produces a
 *   methodology doc, a reusable babysitter process template that applies the
 *   pattern to any structured-data domain, and scaffold skills/agents.
 *
 *   Follows drift-resistant prompt composition (issue #129): the source spec
 *   is read at runtime via `cat` and interpolated verbatim into agent prompts,
 *   rather than paraphrased into process-file string literals.
 *
 * @inputs {
 *   specPath: string,     // absolute path to the spec markdown
 *   outputDir: string,    // absolute path where artifacts are written
 * }
 *
 * @outputs {
 *   success: boolean,
 *   outputDir: string,
 *   artifactPaths: string[],
 * }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

// ── Phase 1 ── Read the spec at runtime (bytes bypass the authoring compose pass).
const readSpecTask = defineTask('read-spec', (args, taskCtx) => ({
  kind: 'shell',
  title: `Read methodology spec from ${args.specPath}`,
  shell: {
    command: `cat "${args.specPath}"`,
    expectedExitCode: 0,
    timeout: 10000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Phase 2 ── Ensure output directory structure exists (idempotent).
const ensureOutputDirsTask = defineTask('ensure-output-dirs', (args, taskCtx) => ({
  kind: 'shell',
  title: `Create output directories under ${args.outputDir}`,
  shell: {
    command: [
      `mkdir -p "${args.outputDir}"`,
      `mkdir -p "${args.outputDir}/skills/sql-tool-agent"`,
      `mkdir -p "${args.outputDir}/agents/dataset-curator"`,
      `mkdir -p "${args.outputDir}/agents/sql-query-composer"`,
    ].join(' && '),
    expectedExitCode: 0,
    timeout: 5000,
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
  },
}));

// ── Phase 3 ── Synthesize all assimilation artifacts.
// Single agent task: spec is interpolated verbatim; agent writes files via Write tool.
const synthesizeArtifactsTask = defineTask(
  'synthesize-artifacts',
  (args, taskCtx) => ({
    kind: 'agent',
    title: 'Synthesize SQL-Tool-Agent methodology artifacts',
    agent: {
      name: 'general-purpose',
      prompt: {
        role: 'Methodology assimilator',
        task:
          'Produce babysitter methodology artifacts for the SQL-Tool-over-MCP pattern ' +
          'described in the SPEC block at the end of this prompt. Use the Write tool. ' +
          'Do not paraphrase the spec in your outputs — quote verbatim where the spec states claims.',
        context: {
          outputDir: args.outputDir,
        },
        instructions: [
          `Write each of these files under ${args.outputDir} using ABSOLUTE paths.`,
          `All files must be created — the next phase grep-verifies their existence and content.`,
          '',
          'ATTRIBUTION REQUIREMENT: every generated file must include these two URLs verbatim',
          'in its header/JSDoc/frontmatter/comments (whichever is idiomatic for the file type):',
          '  - https://github.com/mluggy',
          '  - https://www.linkedin.com/posts/mluggy_%D7%9B%D7%9E%D7%95-%D7%9E%D7%99%D7%9C%D7%99%D7%95%D7%A0%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%92%D7%9D-%D7%90%D7%A0%D7%97%D7%A0%D7%95-%D7%9E%D7%AA%D7%9B%D7%A0%D7%A0%D7%99%D7%9D-%D7%97%D7%95%D7%A4%D7%A9%D7%95%D7%AA-ugcPost-7448843353275858944-b7d4',
          'The next phase grep-verifies both URLs appear in every artifact.',
          '',
          '1. METHODOLOGY.md — full methodology writeup. Must include:',
          '   - Source attribution (Michael Lugassy LinkedIn post, both Hebrew + English quoted blocks verbatim from SPEC, plus both attribution URLs above)',
          '   - One-line statement',
          '   - Core claims (quoted verbatim from SPEC "Core claims" section)',
          '   - Trade-offs (verbatim)',
          '   - Generalized 5-step methodology (Ingest / Schema / Load / Tool registration / Acceptance)',
          '   - Non-goals',
          '   - "When to use this methodology" — concrete criteria (structured data, read-heavy, single-user or small team, stable schema)',
          '   - "When NOT to use" — writes, side effects, multi-tool composition, unstable schema',
          '',
          '2. build-sql-tool-agent.js — reusable babysitter process template with 5 phases',
          '   parameterized by { domain, dataSources, schemaGoal, sampleQueries, harnessName }.',
          '   Phases:',
          '     Phase 1 (Ingest): kind:\'agent\' — research data sources, output ETL plan JSON',
          '     Phase 2 (Schema): kind:\'agent\' — propose SQLite schema DDL',
          '     Phase 3 (Load):   kind:\'shell\' — execute the ETL script, expectedExitCode 0',
          '     Phase 4 (Tool registration): kind:\'agent\' — write harness-specific SQL tool wiring',
          '     Phase 5 (Acceptance): kind:\'shell\' — run the sampleQueries list via sqlite3 CLI,',
          '                           expectedExitCode 0',
          '   Use defineTask from @a5c-ai/babysitter-sdk. Use kind:\'shell\' for any deterministic check.',
          '   Include a JSDoc header with @process, @description, @inputs, @outputs.',
          '   Keep the file under ~180 lines — structure, not a full implementation.',
          '',
          '3. build-sql-tool-agent-inputs.json — example inputs applying the template to the post\'s',
          '   actual use case (flights domain). Use realistic placeholder values.',
          '',
          '4. skills/sql-tool-agent/SKILL.md — a skill that invokes build-sql-tool-agent.js for a',
          '   user-specified domain. Include frontmatter (name, description) and a brief Workflow section.',
          '',
          '5. agents/dataset-curator/AGENT.md — agent spec. Role: identifies authoritative data sources,',
          '   designs ETL, normalizes into relational schema. Single-paragraph prompt guide.',
          '',
          '6. agents/sql-query-composer/AGENT.md — agent spec. Role: reads schema, composes SQL from',
          '   natural-language questions, explains tradeoffs in plain language. Single-paragraph prompt guide.',
          '',
          'When all six files are written, return a JSON summary: { artifacts: [{path, bytes}], notes: string }.',
          '',
          'SPEC (verbatim, do not paraphrase — read all of this; quote the attributed blocks verbatim into METHODOLOGY.md):',
          '---',
          args.specStdout,
          '---',
        ],
        outputFormat:
          'JSON: { "artifacts": [{"path": "...", "bytes": N}], "notes": "..." }',
      },
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
    },
  }),
);

// ── Phase 4 ── Binary verification: all six files exist and are non-empty.
const verifyArtifactsExistTask = defineTask(
  'verify-artifacts-exist',
  (args, taskCtx) => ({
    kind: 'shell',
    title: 'Verify assimilation artifacts exist and are non-empty',
    shell: {
      command: [
        `test -s "${args.outputDir}/METHODOLOGY.md"`,
        `test -s "${args.outputDir}/build-sql-tool-agent.js"`,
        `test -s "${args.outputDir}/build-sql-tool-agent-inputs.json"`,
        `test -s "${args.outputDir}/skills/sql-tool-agent/SKILL.md"`,
        `test -s "${args.outputDir}/agents/dataset-curator/AGENT.md"`,
        `test -s "${args.outputDir}/agents/sql-query-composer/AGENT.md"`,
      ].join(' && '),
      expectedExitCode: 0,
      timeout: 5000,
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
    },
  }),
);

// ── Phase 5 ── Structural check: the reusable template declares all 5 phases.
const verifyTemplateStructureTask = defineTask(
  'verify-template-structure',
  (args, taskCtx) => ({
    kind: 'shell',
    title: 'Verify reusable template structure (5 phases + SDK imports)',
    shell: {
      command: [
        `grep -q "from '@a5c-ai/babysitter-sdk'" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -q "defineTask" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -qiE "ingest|ingestion" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -qi "schema" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -qi "load" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -qiE "tool[- ]?registration|register.*tool" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -qi "acceptance" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -q "kind: 'shell'" "${args.outputDir}/build-sql-tool-agent.js"`,
        `grep -q "kind: 'agent'" "${args.outputDir}/build-sql-tool-agent.js"`,
      ].join(' && '),
      expectedExitCode: 0,
      timeout: 5000,
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
    },
  }),
);

// ── Phase 6 ── Content provenance check: methodology doc quotes the attributed blocks.
const verifyProvenanceTask = defineTask(
  'verify-provenance',
  (args, taskCtx) => ({
    kind: 'shell',
    title: 'Verify METHODOLOGY.md attributes source and quotes key claims',
    shell: {
      command: [
        `grep -q "Michael Lugassy" "${args.outputDir}/METHODOLOGY.md"`,
        `grep -qi "linkedin" "${args.outputDir}/METHODOLOGY.md"`,
        `grep -q "3,888" "${args.outputDir}/METHODOLOGY.md"`,
        `grep -qi "sql" "${args.outputDir}/METHODOLOGY.md"`,
        `grep -qiE "MCP" "${args.outputDir}/METHODOLOGY.md"`,
        // Attribution URLs must appear in every generated artifact.
        `for f in "${args.outputDir}/METHODOLOGY.md" "${args.outputDir}/build-sql-tool-agent.js" "${args.outputDir}/build-sql-tool-agent-inputs.json" "${args.outputDir}/skills/sql-tool-agent/SKILL.md" "${args.outputDir}/agents/dataset-curator/AGENT.md" "${args.outputDir}/agents/sql-query-composer/AGENT.md"; do grep -q "github.com/mluggy" "$f" || exit 1; grep -q "linkedin.com/posts/mluggy" "$f" || exit 1; done`,
      ].join(' && '),
      expectedExitCode: 0,
      timeout: 5000,
    },
    io: {
      inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
      outputJsonPath: `tasks/${taskCtx.effectId}/output.json`,
    },
  }),
);

export async function process(inputs, ctx) {
  // Phase 1: read spec at runtime (drift defense — spec bytes never touch authoring compose pass)
  const specRead = await ctx.task(readSpecTask, { specPath: inputs.specPath });

  // Phase 2: ensure directory tree
  await ctx.task(ensureOutputDirsTask, { outputDir: inputs.outputDir });

  // Phase 3: synthesize all artifacts from the runtime-read spec
  const synth = await ctx.task(synthesizeArtifactsTask, {
    outputDir: inputs.outputDir,
    specStdout: specRead.stdout,
  });

  // Phase 4-6: binary verification gates
  await ctx.task(verifyArtifactsExistTask, { outputDir: inputs.outputDir });
  await ctx.task(verifyTemplateStructureTask, { outputDir: inputs.outputDir });
  await ctx.task(verifyProvenanceTask, { outputDir: inputs.outputDir });

  return {
    success: true,
    outputDir: inputs.outputDir,
    artifactPaths: [
      `${inputs.outputDir}/METHODOLOGY.md`,
      `${inputs.outputDir}/build-sql-tool-agent.js`,
      `${inputs.outputDir}/build-sql-tool-agent-inputs.json`,
      `${inputs.outputDir}/skills/sql-tool-agent/SKILL.md`,
      `${inputs.outputDir}/agents/dataset-curator/AGENT.md`,
      `${inputs.outputDir}/agents/sql-query-composer/AGENT.md`,
    ],
    synthesisSummary: synth,
  };
}
