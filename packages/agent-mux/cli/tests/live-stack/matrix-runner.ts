import type { CommandExecution, PrimaryLiveRunOptions } from './primary-live-runner';
import type { LiveStackScenario } from './scenario-matrix';
import { buildLiveStackScenarioMatrix, getScenarioCapabilityStatus } from './scenario-matrix';

export interface MatrixScenarioPlan {
  readonly scenario: LiveStackScenario;
  readonly executable: boolean;
  readonly reason?: string;
  readonly commands: readonly CommandExecution[];
}

export function buildLiveStackMatrixPlans(
  options: Pick<PrimaryLiveRunOptions, 'env' | 'cwd' | 'timeoutMs'>,
): readonly MatrixScenarioPlan[] {
  return buildLiveStackScenarioMatrix().map((scenario) => {
    const capability = getScenarioCapabilityStatus(scenario, options.env);
    const validity = validateStackPermutation(scenario);
    return {
      scenario,
      executable: capability.runnable && validity.valid,
      reason: capability.skipReason ?? validity.reason,
      commands: buildCommandsForScenario(scenario, options),
    };
  });
}

export function validateStackPermutation(scenario: LiveStackScenario): { valid: boolean; reason?: string } {
  if (scenario.agent.agent === 'codex' && scenario.model.provider !== 'foundry-openai') {
    return { valid: false, reason: 'codex matrix is limited to OpenAI-compatible Foundry provider in the first live lane' };
  }

  if (scenario.agent.agent === 'internal' && scenario.model.provider === 'anthropic-direct') {
    return { valid: false, reason: 'babysitter-agent internal runtime starts with Foundry OpenAI; direct Claude is covered through Claude Code plugin path' };
  }

  return { valid: true };
}

export function buildCommandsForScenario(
  scenario: LiveStackScenario,
  options: Pick<PrimaryLiveRunOptions, 'env' | 'cwd' | 'timeoutMs'>,
): readonly CommandExecution[] {
  const env = buildCommandEnv(scenario, options.env);
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
  const prompt = buildPrompt(scenario, env['LIVE_STACK_TRACE_ID'] ?? scenario.scenarioId);

  if (scenario.agent.integrationType === 'runtime-cli') {
    return [
      {
        ...commandParts(env, 'LIVE_STACK_BABYSITTER_AGENT_BIN', 'babysitter-agent', ['create-run', '--harness', 'internal', '--workspace', options.cwd, '--model', scenario.model.model, '--prompt', prompt, '--json']),
        env,
        cwd: options.cwd,
        timeoutMs,
      },
    ];
  }

  const harnessName = scenario.agent.agent;
  const launchHarness = harnessName === 'claude-code' ? 'claude' : harnessName;
  return [
    { ...commandParts(env, 'LIVE_STACK_BABYSITTER_BIN', 'babysitter', ['harness:install', harnessName, '--workspace', options.cwd, '--json']), env, cwd: options.cwd, timeoutMs },
    { ...commandParts(env, 'LIVE_STACK_BABYSITTER_BIN', 'babysitter', ['harness:install-plugin', harnessName, '--workspace', options.cwd, '--json']), env, cwd: options.cwd, timeoutMs },
    { ...commandParts(env, 'LIVE_STACK_AMUX_BIN', 'amux', ['launch', launchHarness, scenario.model.amuxProvider, '--model', scenario.model.model, '--with-proxy-if-needed', '--prompt', prompt, '--max-turns', '1']), env, cwd: options.cwd, timeoutMs },
  ];
}

function commandParts(env: Record<string, string>, overrideKey: string, fallbackCommand: string, args: readonly string[]): Pick<CommandExecution, 'command' | 'args'> {
  const overrideBin = env[overrideKey];
  return overrideBin ? { command: process.execPath, args: [overrideBin, ...args] } : { command: fallbackCommand, args };
}

function buildCommandEnv(scenario: LiveStackScenario, env: Record<string, string | undefined>): Record<string, string> {
  const traceId = env['LIVE_STACK_TRACE_ID'] ?? `live-stack-${scenario.scenarioId}`;
  return Object.fromEntries(
    Object.entries({
      ...env,
      AMUX_PROVIDER: scenario.model.amuxProvider,
      AMUX_MODEL: scenario.model.model,
      LIVE_STACK_TRACE_ID: traceId,
      AGENT_SESSION_ID: env['AGENT_SESSION_ID'] ?? traceId,
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function buildPrompt(scenario: LiveStackScenario, traceId: string): string {
  if (scenario.agent.integrationType === 'runtime-cli') {
    return `Create a tiny Babysitter proof run for ${scenario.scenarioId}. trace=${traceId}. Return run id, effect id, and terminal status.`;
  }

  return `/babysitter:call Create a tiny proof run for ${scenario.scenarioId}. trace=${traceId}. Return Babysitter run id, effect id, hook status, and stop-hook status.`;
}
