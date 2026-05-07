import { describe, expect, it } from 'vitest';

import {
  buildCommandsForScenario,
  buildLiveStackMatrixPlans,
  validateStackPermutation,
} from './matrix-runner';
import { buildLiveStackScenarioMatrix } from './scenario-matrix';

describe('live stack matrix runner plans', () => {
  it('plans all model and agent combinations while marking first-lane invalid permutations', () => {
    const plans = buildLiveStackMatrixPlans({
      cwd: '/repo',
      env: {
        AZURE_API_KEY: 'present',
        AMUX_API_BASE: 'https://foundry.example.test',
        ANTHROPIC_API_KEY: 'present',
      },
    });

    expect(plans).toHaveLength(6);
    expect(plans.filter((plan) => plan.executable).map((plan) => plan.scenario.scenarioId)).toEqual([
      'live.agent-mux.claude-code.foundry-openai.gpt-5.5',
      'live.agent-mux.claude-code.anthropic-direct.claude',
      'live.agent-mux.codex.foundry-openai.gpt-5.5',
      'live.babysitter-agent.internal.foundry-openai.gpt-5.5',
    ]);
    expect(plans.filter((plan) => !plan.executable).map((plan) => plan.reason)).toEqual([
      'codex matrix is limited to OpenAI-compatible Foundry provider in the first live lane',
      'babysitter-agent internal runtime starts with Foundry OpenAI; direct Claude is covered through Claude Code plugin path',
    ]);
  });

  it('uses harness plugin setup only for agent-mux third-party paths', () => {
    const scenarios = buildLiveStackScenarioMatrix();
    const claudePlan = buildCommandsForScenario(scenarios.find((scenario) => scenario.scenarioId === 'live.agent-mux.claude-code.foundry-openai.gpt-5.5')!, {
      cwd: '/repo',
      env: { AZURE_API_KEY: 'present', AMUX_API_BASE: 'https://foundry.example.test' },
    });
    const codexPlan = buildCommandsForScenario(scenarios.find((scenario) => scenario.scenarioId === 'live.agent-mux.codex.foundry-openai.gpt-5.5')!, {
      cwd: '/repo',
      env: { AZURE_API_KEY: 'present', AMUX_API_BASE: 'https://foundry.example.test' },
    });
    const runtimePlan = buildCommandsForScenario(scenarios.find((scenario) => scenario.scenarioId === 'live.babysitter-agent.internal.foundry-openai.gpt-5.5')!, {
      cwd: '/repo',
      env: { AZURE_API_KEY: 'present', AMUX_API_BASE: 'https://foundry.example.test' },
    });

    expect(claudePlan.map((command) => [command.command, ...command.args].slice(0, 3))).toEqual([
      ['babysitter', 'harness:install', 'claude-code'],
      ['babysitter', 'harness:install-plugin', 'claude-code'],
      ['amux', 'launch', 'claude'],
    ]);
    expect(codexPlan.map((command) => [command.command, ...command.args].slice(0, 3))).toEqual([
      ['babysitter', 'harness:install', 'codex'],
      ['babysitter', 'harness:install-plugin', 'codex'],
      ['amux', 'launch', 'codex'],
    ]);
    expect(runtimePlan).toHaveLength(1);
    expect(runtimePlan[0]?.command).toBe('babysitter-agent');
    expect(runtimePlan[0]?.args).toContain('create-run');
    expect(runtimePlan[0]?.args).not.toContain('harness:install-plugin');
  });

  it('documents invalid combinations instead of silently generating misleading live jobs', () => {
    const invalid = buildLiveStackScenarioMatrix().filter((scenario) => !validateStackPermutation(scenario).valid);

    expect(invalid.map((scenario) => scenario.scenarioId)).toEqual([
      'live.agent-mux.codex.anthropic-direct.claude',
      'live.babysitter-agent.internal.anthropic-direct.claude',
    ]);
  });
});
