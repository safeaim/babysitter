import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForPi(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'openai':
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    case 'foundry':
    case 'azure': {
      // Pi's Azure provider uses the Responses API path which isn't supported
      // by all Azure AI Services deployments. Route through the transport-mux
      // proxy which exposes standard Chat Completions. Pass --base-url so Pi
      // connects to the local proxy instead of api.openai.com.
      env['ANTHROPIC_API_KEY'] = '';
      env['OPENAI_API_KEY'] = '';
      return { env, args, proxyRequired: true, proxyExposedTransport: 'openai-chat' };
    }
    case 'anthropic':
      if (config.auth.apiKey) env['ANTHROPIC_API_KEY'] = config.auth.apiKey;
      args.push('--provider', 'anthropic');
      return { env, args, proxyRequired: false };
    case 'custom':
    case 'ollama':
    case 'local':
    case 'lmstudio':
    case 'vllm': {
      if (config.params['apiBase']) {
        env['OPENAI_BASE_URL'] = String(config.params['apiBase']);
        env['OPENAI_API_BASE'] = String(config.params['apiBase']);
      }
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      env['ANTHROPIC_API_KEY'] = '';
      return { env, args, proxyRequired: false };
    }
    default:
      env['ANTHROPIC_API_KEY'] = '';
      env['OPENAI_API_KEY'] = '';
      return { env, args, proxyRequired: true, proxyExposedTransport: 'openai-chat' };
  }
}
