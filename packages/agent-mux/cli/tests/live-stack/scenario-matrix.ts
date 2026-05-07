export type LiveStackProvider = 'foundry-openai' | 'anthropic-direct';
export type AgentMuxProviderId = 'foundry' | 'anthropic';
export type LiveStackAgentPath = 'agent-mux' | 'babysitter-agent';
export type LiveStackIntegrationType = 'third-party-plugin' | 'runtime-cli';

export interface LiveStackModelEntry {
  readonly provider: LiveStackProvider;
  readonly amuxProvider: AgentMuxProviderId;
  readonly model: string;
  readonly credentialMode: 'github-org-secrets-and-vars' | 'github-org-secrets';
  readonly requiredEnv: readonly string[];
}

export interface LiveStackAgentEntry {
  readonly agentPath: LiveStackAgentPath;
  readonly agent: 'claude-code' | 'codex' | 'internal';
  readonly integrationType: LiveStackIntegrationType;
  readonly setupCommands: readonly string[];
}

export interface LiveStackScenario {
  readonly scenarioId: string;
  readonly lane: 'model-backed-live';
  readonly model: LiveStackModelEntry;
  readonly agent: LiveStackAgentEntry;
  readonly layers: readonly string[];
  readonly requiredTraceIds: readonly string[];
  readonly expectedArtifacts: readonly string[];
}

export interface CapabilityStatus {
  readonly runnable: boolean;
  readonly missingEnv: readonly string[];
  readonly skipReason?: string;
}

export interface LiveStackEvidenceBundle {
  readonly scenarioId: string;
  readonly agentMuxRunId?: string;
  readonly agentMuxSessionId?: string;
  readonly babysitterRunId?: string;
  readonly babysitterEffectId?: string;
  readonly hookEventId?: string;
  readonly hookMuxEventId?: string;
  readonly transportTraceId?: string;
  readonly provider: string;
  readonly model: string;
  readonly artifacts: Record<string, string>;
}

export const LIVE_STACK_MODELS: readonly LiveStackModelEntry[] = [
  {
    provider: 'foundry-openai',
    amuxProvider: 'foundry',
    model: 'gpt-5.5',
    credentialMode: 'github-org-secrets-and-vars',
    requiredEnv: ['AZURE_API_KEY', 'AMUX_API_BASE'],
  },
  {
    provider: 'anthropic-direct',
    amuxProvider: 'anthropic',
    model: 'claude',
    credentialMode: 'github-org-secrets',
    requiredEnv: ['ANTHROPIC_API_KEY'],
  },
];

export const LIVE_STACK_AGENTS: readonly LiveStackAgentEntry[] = [
  {
    agentPath: 'agent-mux',
    agent: 'claude-code',
    integrationType: 'third-party-plugin',
    setupCommands: ['babysitter harness:install claude-code', 'babysitter harness:install-plugin claude-code'],
  },
  {
    agentPath: 'agent-mux',
    agent: 'codex',
    integrationType: 'third-party-plugin',
    setupCommands: ['babysitter harness:install codex', 'babysitter harness:install-plugin codex'],
  },
  {
    agentPath: 'babysitter-agent',
    agent: 'internal',
    integrationType: 'runtime-cli',
    setupCommands: ['babysitter-agent create-run --harness internal'],
  },
];

const BASE_AGENT_MUX_LAYERS = [
  'agent-mux invocation',
  'harness plugin setup',
  'plugin babysitter command dispatch',
  'session persistence',
  'native stop hook',
  'hooks-mux normalization',
  'transport-mux route',
  'provider/model trace',
] as const;

const BASE_BABYSITTER_AGENT_LAYERS = [
  'babysitter-agent create-run',
  'agent-core runtime session',
  'Babysitter SDK run:create',
  'Babysitter SDK run:iterate',
  'Babysitter SDK task:post',
  'session persistence',
  'provider/model trace',
] as const;

export function buildLiveStackScenarioMatrix(): readonly LiveStackScenario[] {
  return LIVE_STACK_AGENTS.flatMap((agent) =>
    LIVE_STACK_MODELS.map((model) => ({
      scenarioId: ['live', agent.agentPath, agent.agent, model.provider, model.model].join('.'),
      lane: 'model-backed-live' as const,
      model,
      agent,
      layers: agent.agentPath === 'agent-mux' ? BASE_AGENT_MUX_LAYERS : BASE_BABYSITTER_AGENT_LAYERS,
      requiredTraceIds: requiredTraceIdsFor(agent.agentPath),
      expectedArtifacts: expectedArtifactsFor(agent.agentPath),
    })),
  );
}

export function primaryLiveStackScenario(): LiveStackScenario {
  const scenario = buildLiveStackScenarioMatrix().find(
    (entry) =>
      entry.agent.agentPath === 'agent-mux' &&
      entry.agent.agent === 'claude-code' &&
      entry.model.provider === 'foundry-openai' &&
      entry.model.model === 'gpt-5.5',
  );
  if (!scenario) throw new Error('primary live stack scenario is missing from matrix');
  return scenario;
}

export function getScenarioCapabilityStatus(scenario: LiveStackScenario, env: Record<string, string | undefined>): CapabilityStatus {
  const missingEnv = scenario.model.requiredEnv.filter((name) => !env[name]);
  return missingEnv.length === 0
    ? { runnable: true, missingEnv }
    : { runnable: false, missingEnv, skipReason: `missing live-model credential env: ${missingEnv.join(', ')}` };
}

export function createEvidenceBundle(
  scenario: LiveStackScenario,
  ids: Partial<Omit<LiveStackEvidenceBundle, 'scenarioId' | 'provider' | 'model' | 'artifacts'>>,
  artifacts: Record<string, string>,
): LiveStackEvidenceBundle {
  return redactLiveStackArtifact({
    scenarioId: scenario.scenarioId,
    provider: scenario.model.provider,
    model: scenario.model.model,
    ...ids,
    artifacts,
  }) as LiveStackEvidenceBundle;
}

export function redactLiveStackArtifact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redactLiveStackArtifact(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        isSecretKey(key) ? '[REDACTED]' : redactLiveStackArtifact(entry),
      ]),
    );
  }
  return typeof value === 'string' && looksLikeSecret(value) ? '[REDACTED]' : value;
}

export function assertEvidenceBundleComplete(scenario: LiveStackScenario, bundle: LiveStackEvidenceBundle): string[] {
  return scenario.requiredTraceIds.filter((traceId) => !bundle[traceId as keyof LiveStackEvidenceBundle]);
}

function requiredTraceIdsFor(agentPath: LiveStackAgentPath): readonly string[] {
  if (agentPath === 'babysitter-agent') return ['babysitterRunId', 'babysitterEffectId'];
  return ['agentMuxRunId', 'agentMuxSessionId', 'babysitterRunId', 'babysitterEffectId', 'hookEventId', 'hookMuxEventId', 'transportTraceId'];
}

function expectedArtifactsFor(agentPath: LiveStackAgentPath): readonly string[] {
  if (agentPath === 'babysitter-agent') return ['babysitter-run-summary', 'babysitter-task-bundle', 'provider-trace-redacted'];
  return [
    'agent-mux-events',
    'plugin-command-transcript',
    'babysitter-run-summary',
    'babysitter-task-bundle',
    'hooks-mux-normalized-event',
    'hooks-mux-handler-result',
    'transport-mux-trace',
    'provider-trace-redacted',
  ];
}

function isSecretKey(key: string): boolean {
  return /(api[_-]?key|token|secret|authorization|password|credential)/i.test(key);
}

function looksLikeSecret(value: string): boolean {
  return /^(sk-|pat_|ghp_|xox|Bearer\s+)/i.test(value) || value.length > 80;
}
