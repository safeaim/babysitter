/**
 * @process build-sql-tool-agent
 * @description Build a curated-dataset + SQL-tool agent for a given domain.
 *   Implements the 5-step methodology (ingest, schema, load, tool registration,
 *   acceptance) distilled from Michael Lugassy's linkedin post about giving
 *   Claude SQL access to a curated flight dataset (3,888 airports, 59,079
 *   routes) instead of reaching for MCP.
 *
 * @inputs {
 *   domain: string,
 *   dataSources: Array<{ name: string, url?: string, notes?: string }>,
 *   schemaGoal: string,
 *   sampleQueries: string[],
 *   harnessName: string
 * }
 * @outputs {
 *   dbPath: string,
 *   schemaSql: string,
 *   toolRegistrationNotes: string,
 *   acceptanceReport: object
 * }
 *
 * Attribution (verbatim):
 *   Author (Michael Lugassy / mluggy) GitHub: https://github.com/mluggy
 *   Original post: https://www.linkedin.com/posts/mluggy_%D7%9B%D7%9E%D7%95-%D7%9E%D7%99%D7%9C%D7%99%D7%95%D7%A0%D7%99-%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%92%D7%9D-%D7%90%D7%A0%D7%97%D7%A0%D7%95-%D7%9E%D7%AA%D7%9B%D7%A0%D7%A0%D7%99%D7%9D-%D7%97%D7%95%D7%A4%D7%A9%D7%95%D7%AA-ugcPost-7448843353275858944-b7d4
 */

'use strict';

import { defineTask } from '@a5c-ai/babysitter-sdk';

// Phase 1 — Ingest: identify and gather authoritative sources offline.
const ingestTask = defineTask('sql-tool-agent.ingest', async (args, _ctx) => {
  return {
    kind: 'agent',
    title: `Ingest authoritative data sources for domain: ${args.domain}`,
    prompt: [
      `You are the dataset-curator agent for the domain "${args.domain}".`,
      `Enumerate authoritative data sources. Candidate sources provided:`,
      JSON.stringify(args.dataSources, null, 2),
      `Output: a manifest describing each source, license, refresh cadence,`,
      `row-count estimate, and a deterministic offline fetch command.`,
      `Do NOT assume runtime web-fetch; everything must be reproducible offline.`,
    ].join('\n'),
    io: { inputs: args },
    execution: { harness: args.harnessName },
  };
}, { kind: 'agent' });

// Phase 2 — Schema: design a small, query-friendly relational schema.
const schemaTask = defineTask('sql-tool-agent.schema', async (args, _ctx) => {
  return {
    kind: 'agent',
    title: `Design relational schema for: ${args.schemaGoal}`,
    prompt: [
      `Design a compact SQLite-friendly relational schema for domain`,
      `"${args.domain}". Schema goal: ${args.schemaGoal}.`,
      `Ingest manifest:`,
      JSON.stringify(args.ingestManifest ?? {}, null, 2),
      `Emit a single .sql file with CREATE TABLE statements, explicit join`,
      `keys, and denormalization where it collapses the common query shapes`,
      `implied by these sample questions:`,
      JSON.stringify(args.sampleQueries, null, 2),
    ].join('\n'),
    io: { inputs: args },
    execution: { harness: args.harnessName },
  };
}, { kind: 'agent' });

// Phase 3 — Load: deterministic ETL into SQLite.
const loadTask = defineTask('sql-tool-agent.load', async (args, _ctx) => {
  return {
    kind: 'shell',
    title: 'Load curated dataset into SQLite (deterministic ETL)',
    command: 'bash',
    args: [
      '-lc',
      [
        'set -euo pipefail',
        'mkdir -p build',
        `sqlite3 build/${args.domain}.db < ${args.schemaSqlPath}`,
        `node scripts/etl-${args.domain}.js --out build/${args.domain}.db`,
        `sqlite3 build/${args.domain}.db 'SELECT name FROM sqlite_master WHERE type=\\"table\\";'`,
      ].join(' && '),
    ],
    expectedExitCode: 0,
    io: { inputs: args },
  };
}, { kind: 'node' });

// Phase 4 — Tool registration: expose SQL execution to the harness (not MCP).
const toolRegistrationTask = defineTask('sql-tool-agent.register-tool', async (args, _ctx) => {
  return {
    kind: 'agent',
    title: 'Register SQL execution tool with harness (no MCP wrapper)',
    prompt: [
      `Register a direct SQL-execution tool with the "${args.harnessName}"`,
      `harness pointing at ${args.dbPath}. Include the schema DDL in the`,
      `system prompt so the model can compose queries without discovery.`,
      `Explicitly do NOT wrap this in an MCP server unless multi-client`,
      `access is required; prefer fast, fixed-shape SQL round-trips.`,
      `Document tool name, argument schema, result schema, and row-limit.`,
    ].join('\n'),
    io: { inputs: args },
    execution: { harness: args.harnessName },
  };
}, { kind: 'agent' });

// Phase 5 — Acceptance: binary pass/fail on a fixed NL query set.
const acceptanceTask = defineTask('sql-tool-agent.acceptance', async (args, _ctx) => {
  const checks = (args.sampleQueries || [])
    .map((q, i) => `echo '--- Q${i + 1}: ${q.replace(/'/g, "'\\''")} ---'`)
    .join(' && ');
  return {
    kind: 'shell',
    title: 'Acceptance: run fixed NL query set against sqlite3 CLI',
    command: 'bash',
    args: [
      '-lc',
      [
        'set -euo pipefail',
        `test -f ${args.dbPath}`,
        `sqlite3 ${args.dbPath} '.schema'`,
        checks || 'echo no-sample-queries',
        `sqlite3 ${args.dbPath} 'SELECT COUNT(*) FROM sqlite_master;'`,
      ].join(' && '),
    ],
    expectedExitCode: 0,
    io: { inputs: args },
  };
}, { kind: 'node' });

/**
 * Chain the 5 phases: ingest -> schema -> load -> tool registration -> acceptance.
 */
export async function process(inputs, ctx) {
  const { domain, dataSources, schemaGoal, sampleQueries, harnessName } = inputs;

  const ingestManifest = await ctx.task(ingestTask, {
    domain, dataSources, schemaGoal, sampleQueries, harnessName,
  });

  const schemaResult = await ctx.task(schemaTask, {
    domain, dataSources, schemaGoal, sampleQueries, harnessName, ingestManifest,
  });

  const schemaSqlPath = schemaResult?.schemaSqlPath ?? `build/${domain}.schema.sql`;

  await ctx.task(loadTask, { domain, schemaSqlPath });

  const dbPath = `build/${domain}.db`;

  const toolRegistrationNotes = await ctx.task(toolRegistrationTask, {
    domain, dbPath, harnessName,
  });

  const acceptanceReport = await ctx.task(acceptanceTask, {
    dbPath, sampleQueries,
  });

  return {
    dbPath,
    schemaSql: schemaResult?.schemaSql ?? null,
    toolRegistrationNotes,
    acceptanceReport,
  };
}

// exported above
