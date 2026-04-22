import type { AgentName, ProviderConfig } from '@a5c-ai/agent-mux-core';
import { getHarnessDefaultTransport } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from './provider-translation.js';
import { translateForClaude } from './translations/claude-translation.js';
import { translateForCodex } from './translations/codex-translation.js';
import { translateForGemini } from './translations/gemini-translation.js';
import { translateForOpenCode } from './translations/opencode-translation.js';
import { translateForGenericOpenAI } from './translations/generic-openai-translation.js';

export function translateForHarness(agent: AgentName, config: ProviderConfig, adapter?: { translateProvider?(config: Record<string, unknown>): any }): HarnessProviderTranslation {
  // Check adapter-level override first
  if (adapter?.translateProvider) {
    return adapter.translateProvider(config as unknown as Record<string, unknown>);
  }
  switch (agent) {
    case 'claude': return translateForClaude(config);
    case 'codex': return translateForCodex(config);
    case 'gemini': return translateForGemini(config);
    case 'qwen': return translateForGemini(config);
    case 'opencode': return translateForOpenCode(config);
    case 'cursor':
    case 'pi':
    case 'omp':
    case 'openclaw':
    case 'hermes':
    case 'droid':
    case 'amp':
      return translateForGenericOpenAI(config);
    // copilot stays with the default (proxy-always, GitHub-locked)
    default:
      return {
        env: {},
        args: [],
        proxyRequired: true,
        proxyExposedTransport: getHarnessDefaultTransport(agent),
      };
  }
}
