import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForCodex(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'openai':
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    case 'ollama':
      // Codex requires v0.81.0+ for --oss / custom provider support (ref: ollama/cmd/launch/codex.go)
      env['OPENAI_API_KEY'] = 'ollama';
      args.push('--oss');
      return { env, args, proxyRequired: false };
    case 'foundry':
    case 'custom':
    case 'groq':
    case 'fireworks':
    case 'together':
    case 'deepseek':
    case 'mistral':
    case 'cerebras':
    case 'sambanova':
    case 'openrouter':
      if (config.params['apiBase']) env['OPENAI_BASE_URL'] = String(config.params['apiBase']);
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      env['ANTHROPIC_API_KEY'] = '';
      return { env, args, proxyRequired: false };
    default:
      env['ANTHROPIC_API_KEY'] = '';
      return { env, args, proxyRequired: true, proxyExposedTransport: 'openai-responses' };
  }
}
