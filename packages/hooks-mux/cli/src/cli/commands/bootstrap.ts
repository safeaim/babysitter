/**
 * bootstrap command — Dedicated no-op context bootstrap.
 *
 * Spec section 18.3.
 *
 * Delegates to invoke with --bootstrap-only flag internally.
 * Reads stdin for session discovery, creates/loads session, and persists it.
 */

import type { CommandModule } from 'yargs';
import {
  normalizeEvent,
  loadSession,
  saveSession,
} from '@a5c-ai/hooks-mux-core';
import { loadAdapter } from '../adapter-loader';
import { createHooksLogger } from '../hooks-logger';
import { readStdin } from '../stdin';

interface BootstrapArgs {
  adapter: string;
  'session-id'?: string;
  json?: boolean;
}

function tryParseJson(raw: string): unknown | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function resolveSessionId(
  adapterSessionResolver: ReturnType<typeof loadAdapter>['sessionResolver'],
  explicitSessionId: string | undefined,
  normalizedSessionId: string | null | undefined,
  stdinData: Record<string, unknown> | undefined,
  env: Record<string, string>,
): string | null {
  if (adapterSessionResolver) {
    const resolved = adapterSessionResolver(stdinData ?? {}, env, explicitSessionId);
    const adapterSessionId = typeof resolved === 'string'
      ? resolved
      : resolved?.sessionId;
    if (adapterSessionId) {
      return adapterSessionId;
    }
  }

  if (explicitSessionId) return explicitSessionId;
  if (env['AGENT_SESSION_ID']) return env['AGENT_SESSION_ID'];
  if (normalizedSessionId) return normalizedSessionId;
  if (stdinData && typeof stdinData['session_id'] === 'string') {
    return stdinData['session_id'] as string;
  }
  return null;
}

export const bootstrapCommand: CommandModule<object, BootstrapArgs> = {
  command: 'bootstrap',
  describe: 'No-op context bootstrap — initialize session without running handlers',
  builder: (yargs) =>
    yargs
      .option('adapter', {
        type: 'string',
        demandOption: true,
        describe: 'Adapter name (e.g. claude, codex, copilot) or "auto" to detect from environment',
      })
      .option('session-id', {
        type: 'string',
        describe: 'Explicit session ID override',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        describe: 'Output JSON format',
      }),
  handler: async (args) => {
    const logger = createHooksLogger('bootstrap');
    const loaded = loadAdapter(args.adapter);
    const env = process.env as Record<string, string>;
    const rawStdin = await readStdin();
    const stdinPayload = tryParseJson(rawStdin);
    const stdinData = (typeof stdinPayload === 'object' && stdinPayload !== null && !Array.isArray(stdinPayload))
      ? stdinPayload as Record<string, unknown>
      : undefined;

    const rawEventName = loaded.capabilities.name === 'claude'
      ? 'SessionStart'
      : 'bootstrap';

    const event = loaded.normalizer
      ? loaded.normalizer(rawEventName, stdinPayload, env)
      : normalizeEvent({
        adapter: args.adapter,
        rawEventName,
        stdinPayload,
        env,
        adapterMappings: loaded.phaseMappings,
      });

    const sessionId = resolveSessionId(
      loaded.sessionResolver,
      args['session-id'],
      event.execution.sessionId,
      stdinData,
      env,
    ) ?? `bootstrap-${Date.now()}`;

    // Load or create session
    let session = await loadSession(sessionId);
    if (!session) {
      session = {
        version: 'a5c.hooks.session.v1',
        sessionId,
        adapter: args.adapter,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cwd: event.execution.cwd ?? undefined,
        persistedEnv: { ...event.env.persisted },
        contextVars: {},
        contextFragments: [],
        metadata: {},
      };
    }

    await saveSession(session);
    await logger.info('bootstrap completed', {
      adapter: args.adapter,
      sessionId,
      createdAt: session.createdAt,
    });

    const output = {
      status: 'bootstrapped',
      sessionId,
      adapter: args.adapter,
      createdAt: session.createdAt,
    };

    if (args.json) {
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } else {
      console.log(`Session bootstrapped: ${sessionId} (adapter: ${args.adapter})`);
    }
  },
};
