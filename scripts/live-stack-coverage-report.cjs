#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const scenarios = [
  {
    id: 'live.agent-mux.claude-code.foundry-openai.gpt-5.5',
    executable: true,
    layers: ['agent-mux', 'plugin', 'transport-mux', 'hooks-mux', 'babysitter-sdk', 'foundry-openai'],
  },
  {
    id: 'live.agent-mux.claude-code.anthropic-direct.claude',
    executable: true,
    layers: ['agent-mux', 'plugin', 'hooks-mux', 'babysitter-sdk', 'anthropic-direct'],
  },
  {
    id: 'live.agent-mux.codex.foundry-openai.gpt-5.5',
    executable: true,
    layers: ['agent-mux', 'plugin', 'transport-mux', 'hooks-mux', 'babysitter-sdk', 'foundry-openai'],
  },
  {
    id: 'live.babysitter-agent.internal.foundry-openai.gpt-5.5',
    executable: true,
    layers: ['babysitter-agent', 'agent-core', 'babysitter-sdk', 'foundry-openai'],
  },
  {
    id: 'live.agent-mux.codex.anthropic-direct.claude',
    executable: false,
    reason: 'codex matrix is limited to OpenAI-compatible Foundry provider in the first live lane',
  },
  {
    id: 'live.babysitter-agent.internal.anthropic-direct.claude',
    executable: false,
    reason: 'babysitter-agent internal runtime starts with Foundry OpenAI; direct Claude is covered through Claude Code plugin path',
  },
];

const coveredLayers = [...new Set(scenarios.filter((scenario) => scenario.executable).flatMap((scenario) => scenario.layers))].sort();
const report = {
  generatedAt: new Date().toISOString(),
  executableScenarios: scenarios.filter((scenario) => scenario.executable).map((scenario) => scenario.id),
  invalidFirstLaneScenarios: scenarios.filter((scenario) => !scenario.executable).map((scenario) => ({ id: scenario.id, reason: scenario.reason })),
  coveredLayers,
  requiredArtifacts: [
    'agent-mux-events',
    'plugin-command-transcript',
    'babysitter-run-summary',
    'babysitter-task-bundle',
    'hooks-mux-normalized-event',
    'hooks-mux-handler-result',
    'transport-mux-trace',
    'provider-trace-redacted',
  ],
};

const outDir = path.join('artifacts', 'live-stack');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'coverage-summary.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
