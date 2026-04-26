import { describe, expect, it } from 'vitest';

import { createTransportMuxApp } from '../src/server.js';
import { createProxyConfig } from '../src/config.js';

function getRoutePaths(app: ReturnType<typeof createTransportMuxApp>) {
  return app.routes.map((route) => route.path);
}

describe('transport-mux server', () => {
  it('mounts health endpoint', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'bedrock',
        targetModel: 'bedrock/claude',
        exposedTransport: 'anthropic',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/health');
  });

  it('mounts models endpoint', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'openai-chat',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/v1/models');
  });

  it('mounts anthropic transport', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'anthropic',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/v1/messages');
  });

  it('mounts openai chat transport', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'anthropic',
        targetModel: 'anthropic/claude',
        exposedTransport: 'openai-chat',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/v1/chat/completions');
  });

  it('mounts openai responses transport', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'anthropic',
        targetModel: 'anthropic/claude',
        exposedTransport: 'openai-responses',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/v1/responses');
  });

  it('mounts google and passthrough routes', () => {
    const googleApp = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'google',
        authToken: 't',
      }),
    });
    const passthroughApp = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'passthrough',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(googleApp)).toContain('/v1beta/models/*');
    expect(getRoutePaths(passthroughApp)).toContain('/passthrough/*');
  });

  it('mounts count tokens endpoint', () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'anthropic',
        authToken: 't',
      }),
    });

    expect(getRoutePaths(app)).toContain('/v1/count_tokens');
  });

  it('returns placeholder count_tokens estimates from the serialized request body', async () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'anthropic',
        authToken: 't',
      }),
    });
    const body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'count these tokens' }],
    };
    const expectedTokens = Math.max(1, Math.ceil(JSON.stringify(body).length / 4));

    const response = await app.request('/v1/count_tokens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 't',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      input_tokens: expectedTokens,
      total_tokens: expectedTokens,
    });
  });

  it('returns the minimum placeholder count_tokens payload when the request body is not valid json', async () => {
    const app = createTransportMuxApp({
      config: createProxyConfig({
        targetProvider: 'openai',
        targetModel: 'openai/gpt-4o',
        exposedTransport: 'anthropic',
        authToken: 't',
      }),
    });

    const response = await app.request('/v1/count_tokens', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer t',
      },
      body: '{not-json',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      input_tokens: 1,
      total_tokens: 1,
    });
  });
});
