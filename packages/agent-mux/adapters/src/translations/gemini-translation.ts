import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForGemini(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'google':
      if (config.auth.apiKey) env['GEMINI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    case 'vertex':
      env['GOOGLE_GENAI_USE_VERTEXAI'] = 'true';
      if (config.params['project']) env['GOOGLE_CLOUD_PROJECT'] = String(config.params['project']);
      if (config.params['region']) env['GOOGLE_CLOUD_LOCATION'] = String(config.params['region']);
      return { env, args, proxyRequired: false };
    default:
      return { env, args, proxyRequired: true, proxyExposedTransport: 'google' };
  }
}
