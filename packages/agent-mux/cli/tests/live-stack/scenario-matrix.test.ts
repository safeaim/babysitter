import { describe, expect, it } from 'vitest';

import {
  assertEvidenceBundleComplete,
  buildLiveStackScenarioMatrix,
  createEvidenceBundle,
  getScenarioCapabilityStatus,
  primaryLiveStackScenario,
  redactLiveStackArtifact,
} from './scenario-matrix';

describe('live stack scenario matrix primitives', () => {
  it('declares the primary no-mock agent-mux Claude Code transport flow', () => {
    const scenario = primaryLiveStackScenario();

    expect(scenario.scenarioId).toBe('live.agent-mux.claude-code.foundry-openai.gpt-5.5');
    expect(scenario.model.amuxProvider).toBe('foundry');
    expect(scenario.lane).toBe('model-backed-live');
    expect(scenario.agent.integrationType).toBe('third-party-plugin');
    expect(scenario.agent.setupCommands).toEqual([
      'babysitter harness:install claude-code',
      'babysitter harness:install-plugin claude-code',
    ]);
    expect(scenario.layers).toContain('transport-mux route');
    expect(scenario.layers).toContain('hooks-mux normalization');
    expect(scenario.requiredTraceIds).toContain('transportTraceId');
    expect(scenario.requiredTraceIds).toContain('hookMuxEventId');
    expect(scenario.expectedArtifacts).toContain('provider-trace-redacted');
  });

  it('keeps agent-mux plugin paths separate from babysitter-agent runtime paths', () => {
    const matrix = buildLiveStackScenarioMatrix();
    const pluginScenarios = matrix.filter((scenario) => scenario.agent.integrationType === 'third-party-plugin');
    const runtimeScenarios = matrix.filter((scenario) => scenario.agent.integrationType === 'runtime-cli');

    expect(pluginScenarios.length).toBeGreaterThan(0);
    expect(runtimeScenarios.length).toBeGreaterThan(0);
    expect(pluginScenarios.every((scenario) => scenario.agent.setupCommands.some((command) => command.includes('harness:install-plugin')))).toBe(true);
    expect(runtimeScenarios.every((scenario) => scenario.agent.setupCommands.every((command) => !command.includes('harness:install-plugin')))).toBe(true);
    expect(runtimeScenarios.every((scenario) => scenario.layers.includes('agent-core runtime session'))).toBe(true);
  });

  it('separates live model capability gates from deterministic no-credential execution', () => {
    const scenario = primaryLiveStackScenario();

    expect(getScenarioCapabilityStatus(scenario, {})).toEqual({
      runnable: false,
      missingEnv: ['AZURE_API_KEY', 'AMUX_API_BASE'],
      skipReason: 'missing live-model credential env: AZURE_API_KEY, AMUX_API_BASE',
    });

    expect(getScenarioCapabilityStatus(scenario, { AZURE_API_KEY: 'present', AMUX_API_BASE: 'https://example.services.ai.azure.com' })).toEqual({
      runnable: true,
      missingEnv: [],
    });
  });

  it('builds joined evidence bundles and reports missing trace IDs', () => {
    const scenario = primaryLiveStackScenario();
    const incompleteBundle = createEvidenceBundle(
      scenario,
      { agentMuxRunId: 'amux-run-1', agentMuxSessionId: 'amux-session-1' },
      { 'agent-mux-events': 'artifacts/live-stack/agent-mux-events-amux-run-1.ndjson' },
    );

    expect(assertEvidenceBundleComplete(scenario, incompleteBundle)).toEqual([
      'babysitterRunId',
      'babysitterEffectId',
      'hookEventId',
      'hookMuxEventId',
      'transportTraceId',
    ]);
  });

  it('redacts secrets recursively before artifact upload', () => {
    expect(
      redactLiveStackArtifact({
        provider: 'foundry-openai',
        apiKey: 'sk-test-value',
        nested: { Authorization: 'Bearer live-token', endpoint: 'https://example.services.ai.azure.com' },
        events: [{ token: 'abc123' }, { status: 'ok' }],
      }),
    ).toEqual({
      provider: 'foundry-openai',
      apiKey: '[REDACTED]',
      nested: { Authorization: '[REDACTED]', endpoint: 'https://example.services.ai.azure.com' },
      events: [{ token: '[REDACTED]' }, { status: 'ok' }],
    });
  });
});
