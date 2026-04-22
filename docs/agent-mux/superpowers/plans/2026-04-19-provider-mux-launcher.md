# Provider Mux & Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unified provider configuration, `amux launch` CLI command with stdin/stdout passthrough, and the `amux-proxy` Python transport bridge package — so any coding agent harness can use any LLM provider.

**Architecture:** Three layers built bottom-up: (1) core provider config types + resolution logic in `@a5c-ai/agent-mux-core`, (2) per-adapter `translateProvider()` methods in `@a5c-ai/agent-mux-adapters`, (3) `amux launch` CLI command that orchestrates proxy + harness. The `amux-proxy` Python package is a separate deliverable built in parallel.

**Tech Stack:** TypeScript (core/adapters/CLI), Python 3.11+ (amux-proxy with LiteLLM + FastAPI + Ollama), Vitest (TS tests), Pytest (Python tests)

**Specs:** `docs/launcher.md`, `docs/amux-provider-config.md`, `docs/provider-mux.md`

---

## Phase 1: Core Provider Config Types & Resolution

### Task 1: Provider config types

**Files:**
- Create: `packages/core/src/provider-config.ts`
- Test: `packages/core/tests/provider-config.test.ts`

- [ ] **Step 1: Write the failing test for provider config types**

```typescript
// packages/core/tests/provider-config.test.ts
import { describe, it, expect } from 'vitest';
import type { ProviderConfig, ProviderId, TransportId, ProviderAuth } from '../src/provider-config.js';
import { PROVIDER_DEFAULTS } from '../src/provider-config.js';

describe('ProviderConfig types', () => {
  it('has defaults for all built-in providers', () => {
    const expected: ProviderId[] = [
      'anthropic', 'openai', 'google', 'bedrock', 'vertex',
      'azure', 'foundry', 'ollama', 'local', 'openrouter',
      'groq', 'fireworks', 'together', 'deepseek', 'mistral',
      'cerebras', 'sambanova', 'custom',
    ];
    for (const id of expected) {
      expect(PROVIDER_DEFAULTS[id]).toBeDefined();
      expect(PROVIDER_DEFAULTS[id].transport).toBeTruthy();
    }
  });

  it('anthropic defaults to anthropic transport with api_key auth', () => {
    const d = PROVIDER_DEFAULTS['anthropic'];
    expect(d.transport).toBe('anthropic');
    expect(d.authType).toBe('api_key');
  });

  it('bedrock defaults to anthropic transport with iam auth', () => {
    const d = PROVIDER_DEFAULTS['bedrock'];
    expect(d.transport).toBe('anthropic');
    expect(d.authType).toBe('iam');
  });

  it('ollama defaults to openai-chat transport with no auth', () => {
    const d = PROVIDER_DEFAULTS['ollama'];
    expect(d.transport).toBe('openai-chat');
    expect(d.authType).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/tests/provider-config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement provider config types and defaults**

```typescript
// packages/core/src/provider-config.ts

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'bedrock'
  | 'vertex'
  | 'azure'
  | 'foundry'
  | 'ollama'
  | 'local'
  | 'openrouter'
  | 'groq'
  | 'fireworks'
  | 'together'
  | 'deepseek'
  | 'mistral'
  | 'cerebras'
  | 'sambanova'
  | 'custom';

export type TransportId =
  | 'anthropic'
  | 'openai-chat'
  | 'openai-responses'
  | 'google'
  | 'a2a';

export interface ProviderAuth {
  type: 'api_key' | 'oauth' | 'iam' | 'adc' | 'service_account' | 'spn' | 'bearer' | 'none' | 'command';
  apiKey?: string;
  token?: string;
  command?: string;
  awsProfile?: string;
  awsRoleArn?: string;
  awsSessionToken?: string;
  gcpCredentialsFile?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
}

export interface ProviderConfig {
  provider: ProviderId;
  model: string;
  transport: TransportId;
  auth: ProviderAuth;
  params: Record<string, string>;
}

export interface ProviderDefaults {
  transport: TransportId;
  authType: ProviderAuth['type'];
  apiBase: string;
  defaultModel: string;
  envKey?: string;
}

export const PROVIDER_DEFAULTS: Record<ProviderId, ProviderDefaults> = {
  anthropic: { transport: 'anthropic', authType: 'api_key', apiBase: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4-20250514', envKey: 'ANTHROPIC_API_KEY' },
  openai: { transport: 'openai-responses', authType: 'api_key', apiBase: 'https://api.openai.com', defaultModel: 'gpt-4o', envKey: 'OPENAI_API_KEY' },
  google: { transport: 'google', authType: 'api_key', apiBase: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-pro', envKey: 'GEMINI_API_KEY' },
  bedrock: { transport: 'anthropic', authType: 'iam', apiBase: 'https://bedrock-runtime.{region}.amazonaws.com', defaultModel: 'anthropic.claude-sonnet-4-20250514-v1:0' },
  vertex: { transport: 'google', authType: 'adc', apiBase: 'https://{region}-aiplatform.googleapis.com', defaultModel: 'claude-sonnet-4@20250514' },
  azure: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://{resource}.openai.azure.com', defaultModel: '', envKey: 'AZURE_API_KEY' },
  foundry: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://{resource}.services.ai.azure.com', defaultModel: '', envKey: 'AZURE_API_KEY' },
  ollama: { transport: 'openai-chat', authType: 'none', apiBase: 'http://localhost:11434', defaultModel: 'qwen3:latest' },
  local: { transport: 'openai-chat', authType: 'none', apiBase: 'http://localhost:8080', defaultModel: '' },
  openrouter: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://openrouter.ai/api', defaultModel: 'anthropic/claude-sonnet-4', envKey: 'OPENROUTER_API_KEY' },
  groq: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.groq.com/openai', defaultModel: 'llama-4-scout-17b-16e-instruct', envKey: 'GROQ_API_KEY' },
  fireworks: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.fireworks.ai/inference', defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct', envKey: 'FIREWORKS_API_KEY' },
  together: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.together.xyz', defaultModel: 'meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo', envKey: 'TOGETHER_API_KEY' },
  deepseek: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
  mistral: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.mistral.ai', defaultModel: 'mistral-large-latest', envKey: 'MISTRAL_API_KEY' },
  cerebras: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.cerebras.ai', defaultModel: 'llama-4-scout-17b-16e-instruct', envKey: 'CEREBRAS_API_KEY' },
  sambanova: { transport: 'openai-chat', authType: 'api_key', apiBase: 'https://api.sambanova.ai', defaultModel: 'Meta-Llama-3.3-70B-Instruct', envKey: 'SAMBANOVA_API_KEY' },
  custom: { transport: 'openai-chat', authType: 'api_key', apiBase: '', defaultModel: '' },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/tests/provider-config.test.ts`
Expected: PASS

- [ ] **Step 5: Export from core index**

Add to `packages/core/src/index.ts`:
```typescript
export type { ProviderConfig, ProviderId, TransportId, ProviderAuth, ProviderDefaults } from './provider-config.js';
export { PROVIDER_DEFAULTS } from './provider-config.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/provider-config.ts packages/core/tests/provider-config.test.ts packages/core/src/index.ts
git commit -m "feat: add provider config types and defaults"
```

---

### Task 2: Provider resolution from env vars, profiles, and CLI flags

**Files:**
- Create: `packages/core/src/provider-resolver.ts`
- Test: `packages/core/tests/provider-resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/tests/provider-resolver.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveProvider } from '../src/provider-resolver.js';
import type { ProviderConfig } from '../src/provider-config.js';

describe('resolveProvider', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it('resolves anthropic provider with api key from env', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    const config = resolveProvider({ provider: 'anthropic' });
    expect(config.provider).toBe('anthropic');
    expect(config.transport).toBe('anthropic');
    expect(config.auth.type).toBe('api_key');
    expect(config.auth.apiKey).toBe('sk-ant-test');
    expect(config.model).toBe('claude-sonnet-4-20250514');
  });

  it('explicit model overrides default', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    const config = resolveProvider({ provider: 'anthropic', model: 'claude-opus-4-20250514' });
    expect(config.model).toBe('claude-opus-4-20250514');
  });

  it('explicit api key overrides env', () => {
    process.env['ANTHROPIC_API_KEY'] = 'env-key';
    const config = resolveProvider({ provider: 'anthropic', apiKey: 'flag-key' });
    expect(config.auth.apiKey).toBe('flag-key');
  });

  it('resolves bedrock with region', () => {
    process.env['AWS_ACCESS_KEY_ID'] = 'AKIA...';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'secret';
    const config = resolveProvider({ provider: 'bedrock', region: 'us-east-1' });
    expect(config.provider).toBe('bedrock');
    expect(config.transport).toBe('anthropic');
    expect(config.auth.type).toBe('iam');
    expect(config.params['region']).toBe('us-east-1');
  });

  it('resolves ollama with no auth', () => {
    const config = resolveProvider({ provider: 'ollama', model: 'qwen3:32b' });
    expect(config.auth.type).toBe('none');
    expect(config.model).toBe('qwen3:32b');
    expect(config.transport).toBe('openai-chat');
  });

  it('explicit transport overrides default', () => {
    const config = resolveProvider({ provider: 'openai', transport: 'openai-chat' });
    expect(config.transport).toBe('openai-chat');
  });

  it('resolves vertex with project and region', () => {
    const config = resolveProvider({
      provider: 'vertex',
      project: 'my-project',
      region: 'us-central1',
    });
    expect(config.params['project']).toBe('my-project');
    expect(config.params['region']).toBe('us-central1');
    expect(config.auth.type).toBe('adc');
  });

  it('resolves custom provider requiring all fields', () => {
    const config = resolveProvider({
      provider: 'custom',
      model: 'my-model',
      transport: 'openai-chat',
      apiKey: 'my-key',
      apiBase: 'https://my-llm.corp.net/v1',
    });
    expect(config.provider).toBe('custom');
    expect(config.params['apiBase']).toBe('https://my-llm.corp.net/v1');
  });

  it('resolves auth command', () => {
    const config = resolveProvider({
      provider: 'custom',
      model: 'my-model',
      transport: 'openai-chat',
      authCommand: 'get-token --scope llm',
      apiBase: 'https://my-llm.corp.net/v1',
    });
    expect(config.auth.type).toBe('command');
    expect(config.auth.command).toBe('get-token --scope llm');
  });

  it('resolves from AMUX_PROVIDER env var', () => {
    process.env['AMUX_PROVIDER'] = 'groq';
    process.env['GROQ_API_KEY'] = 'gsk-test';
    const config = resolveProvider({});
    expect(config.provider).toBe('groq');
    expect(config.auth.apiKey).toBe('gsk-test');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/tests/provider-resolver.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement provider resolver**

```typescript
// packages/core/src/provider-resolver.ts

import { PROVIDER_DEFAULTS } from './provider-config.js';
import type { ProviderConfig, ProviderId, TransportId, ProviderAuth } from './provider-config.js';

export interface ResolveProviderInput {
  provider?: ProviderId | string;
  model?: string;
  transport?: TransportId;
  apiKey?: string;
  apiBase?: string;
  region?: string;
  project?: string;
  resourceGroup?: string;
  endpointName?: string;
  authCommand?: string;
  profile?: string;
}

const ENV_PROVIDER_MAP: Record<string, string> = {
  ANTHROPIC_API_KEY: 'anthropic',
  OPENAI_API_KEY: 'openai',
  GEMINI_API_KEY: 'google',
  GOOGLE_API_KEY: 'google',
  GROQ_API_KEY: 'groq',
  OPENROUTER_API_KEY: 'openrouter',
  FIREWORKS_API_KEY: 'fireworks',
  TOGETHER_API_KEY: 'together',
  TOGETHERAI_API_KEY: 'together',
  DEEPSEEK_API_KEY: 'deepseek',
  MISTRAL_API_KEY: 'mistral',
  CEREBRAS_API_KEY: 'cerebras',
  SAMBANOVA_API_KEY: 'sambanova',
};

function resolveProviderId(input: ResolveProviderInput): ProviderId {
  if (input.provider && input.provider in PROVIDER_DEFAULTS) {
    return input.provider as ProviderId;
  }
  const envProvider = process.env['AMUX_PROVIDER'];
  if (envProvider && envProvider in PROVIDER_DEFAULTS) {
    return envProvider as ProviderId;
  }
  return 'anthropic';
}

function resolveApiKey(providerId: ProviderId, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const amuxKey = process.env['AMUX_API_KEY'];
  if (amuxKey) return amuxKey;
  const defaults = PROVIDER_DEFAULTS[providerId];
  if (defaults.envKey) {
    return process.env[defaults.envKey];
  }
  return undefined;
}

function resolveAuth(providerId: ProviderId, input: ResolveProviderInput): ProviderAuth {
  const defaults = PROVIDER_DEFAULTS[providerId];

  if (input.authCommand) {
    return { type: 'command', command: input.authCommand };
  }

  const authType = defaults.authType;
  const apiKey = resolveApiKey(providerId, input.apiKey);

  switch (authType) {
    case 'api_key':
      return { type: 'api_key', apiKey };
    case 'iam':
      return {
        type: 'iam',
        awsProfile: process.env['AWS_PROFILE'],
        awsSessionToken: process.env['AWS_SESSION_TOKEN'],
      };
    case 'adc':
      return {
        type: 'adc',
        gcpCredentialsFile: process.env['GOOGLE_APPLICATION_CREDENTIALS'],
      };
    case 'none':
      return { type: 'none' };
    default:
      return { type: authType, apiKey };
  }
}

export function resolveProvider(input: ResolveProviderInput): ProviderConfig {
  const providerId = resolveProviderId(input);
  const defaults = PROVIDER_DEFAULTS[providerId];

  const transport: TransportId = (input.transport as TransportId) ?? defaults.transport;
  const model = input.model
    ?? process.env['AMUX_MODEL']
    ?? defaults.defaultModel;

  const auth = resolveAuth(providerId, input);

  const params: Record<string, string> = {};
  const region = input.region ?? process.env['AMUX_REGION'] ?? process.env['AWS_REGION'] ?? process.env['AWS_REGION_NAME'];
  const project = input.project ?? process.env['AMUX_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? process.env['VERTEXAI_PROJECT'];
  const apiBase = input.apiBase ?? process.env['AMUX_API_BASE'];

  if (region) params['region'] = region;
  if (project) params['project'] = project;
  if (apiBase) params['apiBase'] = apiBase;
  if (input.resourceGroup) params['resourceGroup'] = input.resourceGroup;
  if (input.endpointName) params['endpointName'] = input.endpointName;

  return { provider: providerId, model, transport, auth, params };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/tests/provider-resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Export from core index**

Add to `packages/core/src/index.ts`:
```typescript
export type { ResolveProviderInput } from './provider-resolver.js';
export { resolveProvider } from './provider-resolver.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/provider-resolver.ts packages/core/tests/provider-resolver.test.ts packages/core/src/index.ts
git commit -m "feat: add provider resolver with env var and CLI flag support"
```

---

### Task 3: Harness ↔ provider native support matrix

**Files:**
- Create: `packages/core/src/provider-support-matrix.ts`
- Test: `packages/core/tests/provider-support-matrix.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/tests/provider-support-matrix.test.ts
import { describe, it, expect } from 'vitest';
import {
  isNativelySupported,
  getRequiredProxyTransport,
  type NativeSupportEntry,
} from '../src/provider-support-matrix.js';

describe('provider support matrix', () => {
  it('claude supports anthropic natively', () => {
    expect(isNativelySupported('claude', 'anthropic')).toBe(true);
  });

  it('claude supports bedrock natively', () => {
    expect(isNativelySupported('claude', 'bedrock')).toBe(true);
  });

  it('claude supports vertex natively', () => {
    expect(isNativelySupported('claude', 'vertex')).toBe(true);
  });

  it('claude does NOT support openai natively', () => {
    expect(isNativelySupported('claude', 'openai')).toBe(false);
  });

  it('codex supports openai natively', () => {
    expect(isNativelySupported('codex', 'openai')).toBe(true);
  });

  it('codex supports ollama natively', () => {
    expect(isNativelySupported('codex', 'ollama')).toBe(true);
  });

  it('codex does NOT support bedrock natively', () => {
    expect(isNativelySupported('codex', 'bedrock')).toBe(false);
  });

  it('gemini supports google natively', () => {
    expect(isNativelySupported('gemini', 'google')).toBe(true);
  });

  it('gemini supports vertex natively', () => {
    expect(isNativelySupported('gemini', 'vertex')).toBe(true);
  });

  it('proxy transport for codex targeting bedrock is openai-responses', () => {
    expect(getRequiredProxyTransport('codex', 'bedrock')).toBe('openai-responses');
  });

  it('proxy transport for claude targeting openai is anthropic', () => {
    expect(getRequiredProxyTransport('claude', 'openai')).toBe('anthropic');
  });

  it('proxy transport for gemini targeting anthropic is google', () => {
    expect(getRequiredProxyTransport('gemini', 'anthropic')).toBe('google');
  });

  it('returns null proxy transport when natively supported', () => {
    expect(getRequiredProxyTransport('claude', 'anthropic')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/tests/provider-support-matrix.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement support matrix**

```typescript
// packages/core/src/provider-support-matrix.ts

import type { ProviderId, TransportId } from './provider-config.js';
import type { AgentName } from './types.js';

export interface NativeSupportEntry {
  agent: string;
  provider: ProviderId;
  mechanism: string;
}

const NATIVE_SUPPORT: NativeSupportEntry[] = [
  // Claude Code
  { agent: 'claude', provider: 'anthropic', mechanism: 'ANTHROPIC_API_KEY' },
  { agent: 'claude', provider: 'bedrock', mechanism: 'CLAUDE_CODE_USE_BEDROCK' },
  { agent: 'claude', provider: 'vertex', mechanism: 'CLAUDE_CODE_USE_VERTEX' },
  { agent: 'claude', provider: 'foundry', mechanism: 'CLAUDE_CODE_USE_FOUNDRY' },
  { agent: 'claude', provider: 'ollama', mechanism: 'ANTHROPIC_BASE_URL (partial)' },
  // Codex
  { agent: 'codex', provider: 'openai', mechanism: 'OPENAI_API_KEY' },
  { agent: 'codex', provider: 'ollama', mechanism: '--oss flag' },
  // Gemini
  { agent: 'gemini', provider: 'google', mechanism: 'GEMINI_API_KEY' },
  { agent: 'gemini', provider: 'vertex', mechanism: 'GOOGLE_GENAI_USE_VERTEXAI' },
  // OpenCode (supports many providers natively via AI SDK)
  { agent: 'opencode', provider: 'anthropic', mechanism: '@ai-sdk/anthropic' },
  { agent: 'opencode', provider: 'openai', mechanism: '@ai-sdk/openai' },
  { agent: 'opencode', provider: 'google', mechanism: '@ai-sdk/google' },
  { agent: 'opencode', provider: 'vertex', mechanism: '@ai-sdk/google-vertex' },
  { agent: 'opencode', provider: 'bedrock', mechanism: '@ai-sdk/amazon-bedrock' },
  { agent: 'opencode', provider: 'azure', mechanism: '@ai-sdk/azure' },
  { agent: 'opencode', provider: 'ollama', mechanism: '@ai-sdk/openai-compatible' },
  { agent: 'opencode', provider: 'groq', mechanism: '@ai-sdk/openai-compatible' },
  { agent: 'opencode', provider: 'openrouter', mechanism: '@openrouter/ai-sdk-provider' },
  // Copilot — locked to GitHub
  { agent: 'copilot', provider: 'openai', mechanism: 'GitHub OAuth (restricted)' },
];

const HARNESS_DEFAULT_TRANSPORT: Record<string, TransportId> = {
  claude: 'anthropic',
  codex: 'openai-responses',
  gemini: 'google',
  opencode: 'openai-chat',
  copilot: 'openai-chat',
  cursor: 'openai-chat',
  pi: 'openai-chat',
  omp: 'openai-chat',
  openclaw: 'openai-chat',
  hermes: 'openai-chat',
  droid: 'openai-chat',
  amp: 'openai-chat',
  qwen: 'google',
};

export function isNativelySupported(agent: AgentName, provider: ProviderId): boolean {
  return NATIVE_SUPPORT.some(e => e.agent === agent && e.provider === provider);
}

export function getNativeMechanism(agent: AgentName, provider: ProviderId): string | null {
  const entry = NATIVE_SUPPORT.find(e => e.agent === agent && e.provider === provider);
  return entry?.mechanism ?? null;
}

export function getRequiredProxyTransport(agent: AgentName, provider: ProviderId): TransportId | null {
  if (isNativelySupported(agent, provider)) return null;
  return HARNESS_DEFAULT_TRANSPORT[agent] ?? 'openai-chat';
}

export function getHarnessDefaultTransport(agent: AgentName): TransportId {
  return HARNESS_DEFAULT_TRANSPORT[agent] ?? 'openai-chat';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/tests/provider-support-matrix.test.ts`
Expected: PASS

- [ ] **Step 5: Export from core index**

Add to `packages/core/src/index.ts`:
```typescript
export { isNativelySupported, getNativeMechanism, getRequiredProxyTransport, getHarnessDefaultTransport } from './provider-support-matrix.js';
export type { NativeSupportEntry } from './provider-support-matrix.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/provider-support-matrix.ts packages/core/tests/provider-support-matrix.test.ts packages/core/src/index.ts
git commit -m "feat: add harness/provider native support matrix"
```

---

### Task 4: Add `providerConfig` to `RunOptions`

**Files:**
- Modify: `packages/core/src/run-options.ts`
- Test: `packages/core/tests/provider-resolver.test.ts` (extend existing)

- [ ] **Step 1: Write the failing test**

Add to `packages/core/tests/provider-resolver.test.ts`:

```typescript
import type { RunOptions } from '../src/run-options.js';

describe('RunOptions.providerConfig', () => {
  it('accepts providerConfig field', () => {
    const opts: RunOptions = {
      agent: 'claude',
      prompt: 'hello',
      providerConfig: {
        provider: 'bedrock',
        model: 'anthropic.claude-sonnet-4-20250514-v1:0',
        transport: 'anthropic',
        auth: { type: 'iam' },
        params: { region: 'us-east-1' },
      },
    };
    expect(opts.providerConfig?.provider).toBe('bedrock');
  });

  it('accepts providerProfile field', () => {
    const opts: RunOptions = {
      agent: 'claude',
      prompt: 'hello',
      providerProfile: 'work-bedrock',
    };
    expect(opts.providerProfile).toBe('work-bedrock');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/tests/provider-resolver.test.ts`
Expected: FAIL — `providerConfig` not a known property of `RunOptions`

- [ ] **Step 3: Add fields to RunOptions**

In `packages/core/src/run-options.ts`, add after the `invocation` field (line ~193):

```typescript
  // --- Provider Configuration ---

  /** Provider configuration for model/provider selection. */
  providerConfig?: import('./provider-config.js').ProviderConfig;

  /** Named provider profile from ~/.amux/providers.json. */
  providerProfile?: string;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/tests/provider-resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/run-options.ts packages/core/tests/provider-resolver.test.ts
git commit -m "feat: add providerConfig and providerProfile to RunOptions"
```

---

## Phase 2: Per-Adapter Provider Translation

### Task 5: Harness translation interface and Claude translator

**Files:**
- Create: `packages/adapters/src/provider-translation.ts`
- Create: `packages/adapters/src/translations/claude-translation.ts`
- Test: `packages/adapters/tests/claude-translation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/adapters/tests/claude-translation.test.ts
import { describe, it, expect } from 'vitest';
import { translateForClaude } from '../src/translations/claude-translation.js';
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';

function makeConfig(overrides: Partial<ProviderConfig>): ProviderConfig {
  return {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    transport: 'anthropic',
    auth: { type: 'api_key', apiKey: 'sk-ant-test' },
    params: {},
    ...overrides,
  };
}

describe('translateForClaude', () => {
  it('anthropic direct: sets ANTHROPIC_API_KEY', () => {
    const result = translateForClaude(makeConfig({}));
    expect(result.proxyRequired).toBe(false);
    expect(result.env['ANTHROPIC_API_KEY']).toBe('sk-ant-test');
  });

  it('bedrock: sets CLAUDE_CODE_USE_BEDROCK and region', () => {
    const result = translateForClaude(makeConfig({
      provider: 'bedrock',
      transport: 'anthropic',
      auth: { type: 'iam' },
      params: { region: 'us-east-1' },
    }));
    expect(result.proxyRequired).toBe(false);
    expect(result.env['CLAUDE_CODE_USE_BEDROCK']).toBe('1');
    expect(result.env['AWS_REGION']).toBe('us-east-1');
  });

  it('vertex: sets CLAUDE_CODE_USE_VERTEX, project, location', () => {
    const result = translateForClaude(makeConfig({
      provider: 'vertex',
      transport: 'google',
      auth: { type: 'adc' },
      params: { project: 'my-project', region: 'us-central1' },
    }));
    expect(result.proxyRequired).toBe(false);
    expect(result.env['CLAUDE_CODE_USE_VERTEX']).toBe('1');
    expect(result.env['GOOGLE_CLOUD_PROJECT']).toBe('my-project');
    expect(result.env['GOOGLE_CLOUD_LOCATION']).toBe('us-central1');
  });

  it('foundry: sets CLAUDE_CODE_USE_FOUNDRY', () => {
    const result = translateForClaude(makeConfig({
      provider: 'foundry',
      auth: { type: 'api_key', apiKey: 'foundry-key' },
    }));
    expect(result.proxyRequired).toBe(false);
    expect(result.env['CLAUDE_CODE_USE_FOUNDRY']).toBe('1');
  });

  it('ollama via ANTHROPIC_BASE_URL: sets base url and dummy keys', () => {
    const result = translateForClaude(makeConfig({
      provider: 'ollama',
      model: 'qwen3:32b',
      transport: 'openai-chat',
      auth: { type: 'none' },
      params: { apiBase: 'http://localhost:11434' },
    }));
    expect(result.proxyRequired).toBe(true);
    expect(result.proxyExposedTransport).toBe('anthropic');
  });

  it('openai: proxy required, exposes anthropic', () => {
    const result = translateForClaude(makeConfig({
      provider: 'openai',
      transport: 'openai-responses',
      auth: { type: 'api_key', apiKey: 'sk-openai' },
    }));
    expect(result.proxyRequired).toBe(true);
    expect(result.proxyExposedTransport).toBe('anthropic');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/adapters/tests/claude-translation.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement translation interface and Claude translator**

```typescript
// packages/adapters/src/provider-translation.ts
import type { TransportId, ProviderConfig } from '@a5c-ai/agent-mux-core';

export interface HarnessProviderTranslation {
  env: Record<string, string>;
  args: string[];
  configContent?: string;
  configPath?: string;
  proxyRequired: boolean;
  proxyExposedTransport?: TransportId;
}
```

```typescript
// packages/adapters/src/translations/claude-translation.ts
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForClaude(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'anthropic': {
      if (config.auth.apiKey) env['ANTHROPIC_API_KEY'] = config.auth.apiKey;
      if (config.model) env['ANTHROPIC_MODEL'] = config.model;
      return { env, args, proxyRequired: false };
    }
    case 'bedrock': {
      env['CLAUDE_CODE_USE_BEDROCK'] = '1';
      if (config.params['region']) env['AWS_REGION'] = config.params['region'];
      if (config.auth.awsProfile) env['AWS_PROFILE'] = config.auth.awsProfile;
      return { env, args, proxyRequired: false };
    }
    case 'vertex': {
      env['CLAUDE_CODE_USE_VERTEX'] = '1';
      if (config.params['project']) env['GOOGLE_CLOUD_PROJECT'] = config.params['project'];
      if (config.params['region']) env['GOOGLE_CLOUD_LOCATION'] = config.params['region'];
      return { env, args, proxyRequired: false };
    }
    case 'foundry': {
      env['CLAUDE_CODE_USE_FOUNDRY'] = '1';
      if (config.auth.apiKey) env['AZURE_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    }
    default: {
      return { env, args, proxyRequired: true, proxyExposedTransport: 'anthropic' };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/adapters/tests/claude-translation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/adapters/src/provider-translation.ts packages/adapters/src/translations/claude-translation.ts packages/adapters/tests/claude-translation.test.ts
git commit -m "feat: add provider translation interface and Claude translator"
```

---

### Task 6: Codex, Gemini, and OpenCode translators

**Files:**
- Create: `packages/adapters/src/translations/codex-translation.ts`
- Create: `packages/adapters/src/translations/gemini-translation.ts`
- Create: `packages/adapters/src/translations/opencode-translation.ts`
- Test: `packages/adapters/tests/codex-translation.test.ts`
- Test: `packages/adapters/tests/gemini-translation.test.ts`
- Test: `packages/adapters/tests/opencode-translation.test.ts`

- [ ] **Step 1: Write the failing tests for Codex translator**

```typescript
// packages/adapters/tests/codex-translation.test.ts
import { describe, it, expect } from 'vitest';
import { translateForCodex } from '../src/translations/codex-translation.js';
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';

function makeConfig(overrides: Partial<ProviderConfig>): ProviderConfig {
  return {
    provider: 'openai', model: 'gpt-4o', transport: 'openai-responses',
    auth: { type: 'api_key', apiKey: 'sk-openai' }, params: {},
    ...overrides,
  };
}

describe('translateForCodex', () => {
  it('openai direct: sets OPENAI_API_KEY', () => {
    const r = translateForCodex(makeConfig({}));
    expect(r.proxyRequired).toBe(false);
    expect(r.env['OPENAI_API_KEY']).toBe('sk-openai');
  });

  it('ollama: uses --oss flag', () => {
    const r = translateForCodex(makeConfig({
      provider: 'ollama', model: 'qwen3:32b', transport: 'openai-chat',
      auth: { type: 'none' },
    }));
    expect(r.proxyRequired).toBe(false);
    expect(r.args).toContain('--oss');
  });

  it('bedrock: proxy required, exposes openai-responses', () => {
    const r = translateForCodex(makeConfig({
      provider: 'bedrock', auth: { type: 'iam' },
      params: { region: 'us-east-1' },
    }));
    expect(r.proxyRequired).toBe(true);
    expect(r.proxyExposedTransport).toBe('openai-responses');
  });

  it('custom openai-compat: sets OPENAI_BASE_URL', () => {
    const r = translateForCodex(makeConfig({
      provider: 'custom', transport: 'openai-chat',
      auth: { type: 'api_key', apiKey: 'my-key' },
      params: { apiBase: 'https://my-llm.corp.net/v1' },
    }));
    expect(r.proxyRequired).toBe(false);
    expect(r.env['OPENAI_BASE_URL']).toBe('https://my-llm.corp.net/v1');
    expect(r.env['OPENAI_API_KEY']).toBe('my-key');
  });
});
```

- [ ] **Step 2: Write the failing tests for Gemini translator**

```typescript
// packages/adapters/tests/gemini-translation.test.ts
import { describe, it, expect } from 'vitest';
import { translateForGemini } from '../src/translations/gemini-translation.js';
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';

function makeConfig(overrides: Partial<ProviderConfig>): ProviderConfig {
  return {
    provider: 'google', model: 'gemini-2.5-pro', transport: 'google',
    auth: { type: 'api_key', apiKey: 'gemini-key' }, params: {},
    ...overrides,
  };
}

describe('translateForGemini', () => {
  it('google direct: sets GEMINI_API_KEY', () => {
    const r = translateForGemini(makeConfig({}));
    expect(r.proxyRequired).toBe(false);
    expect(r.env['GEMINI_API_KEY']).toBe('gemini-key');
  });

  it('vertex: sets GOOGLE_GENAI_USE_VERTEXAI', () => {
    const r = translateForGemini(makeConfig({
      provider: 'vertex', auth: { type: 'adc' },
      params: { project: 'proj', region: 'us-c1' },
    }));
    expect(r.proxyRequired).toBe(false);
    expect(r.env['GOOGLE_GENAI_USE_VERTEXAI']).toBe('true');
    expect(r.env['GOOGLE_CLOUD_PROJECT']).toBe('proj');
  });

  it('anthropic: proxy required, exposes google', () => {
    const r = translateForGemini(makeConfig({
      provider: 'anthropic', transport: 'anthropic',
      auth: { type: 'api_key', apiKey: 'sk-ant' },
    }));
    expect(r.proxyRequired).toBe(true);
    expect(r.proxyExposedTransport).toBe('google');
  });
});
```

- [ ] **Step 3: Write the failing tests for OpenCode translator**

```typescript
// packages/adapters/tests/opencode-translation.test.ts
import { describe, it, expect } from 'vitest';
import { translateForOpenCode } from '../src/translations/opencode-translation.js';
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';

function makeConfig(overrides: Partial<ProviderConfig>): ProviderConfig {
  return {
    provider: 'anthropic', model: 'claude-sonnet-4-20250514', transport: 'anthropic',
    auth: { type: 'api_key', apiKey: 'sk-ant' }, params: {},
    ...overrides,
  };
}

describe('translateForOpenCode', () => {
  it('anthropic: generates OPENCODE_CONFIG_CONTENT with @ai-sdk/anthropic', () => {
    const r = translateForOpenCode(makeConfig({}));
    expect(r.proxyRequired).toBe(false);
    expect(r.env['ANTHROPIC_API_KEY']).toBe('sk-ant');
    const cfg = JSON.parse(r.env['OPENCODE_CONFIG_CONTENT']);
    expect(cfg.provider.amux.npm).toBe('@ai-sdk/anthropic');
    expect(cfg.model.default).toContain('claude-sonnet-4-20250514');
  });

  it('groq: generates config with @ai-sdk/openai-compatible', () => {
    const r = translateForOpenCode(makeConfig({
      provider: 'groq', model: 'llama-4-scout-17b-16e-instruct',
      transport: 'openai-chat',
      auth: { type: 'api_key', apiKey: 'gsk-test' },
    }));
    expect(r.proxyRequired).toBe(false);
    const cfg = JSON.parse(r.env['OPENCODE_CONFIG_CONTENT']);
    expect(cfg.provider.amux.npm).toBe('@ai-sdk/openai-compatible');
  });
});
```

- [ ] **Step 4: Run all three tests to verify they fail**

Run: `npx vitest run packages/adapters/tests/codex-translation.test.ts packages/adapters/tests/gemini-translation.test.ts packages/adapters/tests/opencode-translation.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement Codex translator**

```typescript
// packages/adapters/src/translations/codex-translation.ts
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForCodex(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'openai': {
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    }
    case 'ollama': {
      args.push('--oss');
      return { env, args, proxyRequired: false };
    }
    case 'custom':
    case 'groq':
    case 'fireworks':
    case 'together':
    case 'deepseek':
    case 'mistral':
    case 'cerebras':
    case 'sambanova':
    case 'openrouter': {
      if (config.params['apiBase']) env['OPENAI_BASE_URL'] = config.params['apiBase'];
      if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    }
    default: {
      return { env, args, proxyRequired: true, proxyExposedTransport: 'openai-responses' };
    }
  }
}
```

- [ ] **Step 6: Implement Gemini translator**

```typescript
// packages/adapters/src/translations/gemini-translation.ts
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

export function translateForGemini(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  switch (config.provider) {
    case 'google': {
      if (config.auth.apiKey) env['GEMINI_API_KEY'] = config.auth.apiKey;
      return { env, args, proxyRequired: false };
    }
    case 'vertex': {
      env['GOOGLE_GENAI_USE_VERTEXAI'] = 'true';
      if (config.params['project']) env['GOOGLE_CLOUD_PROJECT'] = config.params['project'];
      if (config.params['region']) env['GOOGLE_CLOUD_LOCATION'] = config.params['region'];
      return { env, args, proxyRequired: false };
    }
    default: {
      return { env, args, proxyRequired: true, proxyExposedTransport: 'google' };
    }
  }
}
```

- [ ] **Step 7: Implement OpenCode translator**

```typescript
// packages/adapters/src/translations/opencode-translation.ts
import type { ProviderConfig, ProviderId } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from '../provider-translation.js';

const OPENCODE_SDK_MAP: Partial<Record<ProviderId, string>> = {
  anthropic: '@ai-sdk/anthropic',
  openai: '@ai-sdk/openai',
  google: '@ai-sdk/google',
  vertex: '@ai-sdk/google-vertex',
  bedrock: '@ai-sdk/amazon-bedrock',
  azure: '@ai-sdk/azure',
};

function buildOpenCodeConfig(npm: string, model: string, options?: Record<string, string>): string {
  return JSON.stringify({
    $schema: 'https://opencode.ai/config.json',
    provider: { amux: { npm, options: options ?? {} } },
    model: { default: `amux/${model}` },
  });
}

export function translateForOpenCode(config: ProviderConfig): HarnessProviderTranslation {
  const env: Record<string, string> = {};
  const args: string[] = [];

  const nativeSdk = OPENCODE_SDK_MAP[config.provider];

  if (nativeSdk) {
    if (config.auth.apiKey) {
      const envKeyMap: Partial<Record<ProviderId, string>> = {
        anthropic: 'ANTHROPIC_API_KEY',
        openai: 'OPENAI_API_KEY',
        google: 'GOOGLE_GENERATIVE_AI_API_KEY',
      };
      const envKey = envKeyMap[config.provider];
      if (envKey) env[envKey] = config.auth.apiKey;
    }
    env['OPENCODE_CONFIG_CONTENT'] = buildOpenCodeConfig(nativeSdk, config.model);
    return { env, args, proxyRequired: false };
  }

  // For providers not natively supported, use openai-compatible
  const apiBase = config.params['apiBase'] ?? '';
  env['OPENCODE_CONFIG_CONTENT'] = buildOpenCodeConfig(
    '@ai-sdk/openai-compatible',
    config.model,
    apiBase ? { baseURL: apiBase } : undefined,
  );
  if (config.auth.apiKey) env['OPENAI_API_KEY'] = config.auth.apiKey;

  return { env, args, proxyRequired: false };
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `npx vitest run packages/adapters/tests/codex-translation.test.ts packages/adapters/tests/gemini-translation.test.ts packages/adapters/tests/opencode-translation.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/adapters/src/translations/ packages/adapters/tests/*-translation.test.ts
git commit -m "feat: add Codex, Gemini, and OpenCode provider translators"
```

---

### Task 7: Unified `translateForHarness` dispatcher

**Files:**
- Create: `packages/adapters/src/translate-for-harness.ts`
- Test: `packages/adapters/tests/translate-for-harness.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/adapters/tests/translate-for-harness.test.ts
import { describe, it, expect } from 'vitest';
import { translateForHarness } from '../src/translate-for-harness.js';
import type { ProviderConfig } from '@a5c-ai/agent-mux-core';

const anthropicConfig: ProviderConfig = {
  provider: 'anthropic', model: 'claude-sonnet-4-20250514', transport: 'anthropic',
  auth: { type: 'api_key', apiKey: 'test' }, params: {},
};

describe('translateForHarness', () => {
  it('dispatches to claude translator', () => {
    const r = translateForHarness('claude', anthropicConfig);
    expect(r.env['ANTHROPIC_API_KEY']).toBe('test');
  });

  it('dispatches to codex translator', () => {
    const config: ProviderConfig = { ...anthropicConfig, provider: 'openai', transport: 'openai-responses', auth: { type: 'api_key', apiKey: 'sk-oi' } };
    const r = translateForHarness('codex', config);
    expect(r.env['OPENAI_API_KEY']).toBe('sk-oi');
  });

  it('dispatches to gemini translator', () => {
    const config: ProviderConfig = { ...anthropicConfig, provider: 'google', transport: 'google', auth: { type: 'api_key', apiKey: 'gk' } };
    const r = translateForHarness('gemini', config);
    expect(r.env['GEMINI_API_KEY']).toBe('gk');
  });

  it('dispatches to opencode translator', () => {
    const r = translateForHarness('opencode', anthropicConfig);
    expect(r.env['OPENCODE_CONFIG_CONTENT']).toBeTruthy();
  });

  it('unknown harness defaults to proxy required', () => {
    const r = translateForHarness('unknown-agent', anthropicConfig);
    expect(r.proxyRequired).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/adapters/tests/translate-for-harness.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dispatcher**

```typescript
// packages/adapters/src/translate-for-harness.ts
import type { AgentName, ProviderConfig } from '@a5c-ai/agent-mux-core';
import { getHarnessDefaultTransport } from '@a5c-ai/agent-mux-core';
import type { HarnessProviderTranslation } from './provider-translation.js';
import { translateForClaude } from './translations/claude-translation.js';
import { translateForCodex } from './translations/codex-translation.js';
import { translateForGemini } from './translations/gemini-translation.js';
import { translateForOpenCode } from './translations/opencode-translation.js';

export function translateForHarness(agent: AgentName, config: ProviderConfig): HarnessProviderTranslation {
  switch (agent) {
    case 'claude': return translateForClaude(config);
    case 'codex': return translateForCodex(config);
    case 'gemini': return translateForGemini(config);
    case 'qwen': return translateForGemini(config);
    case 'opencode': return translateForOpenCode(config);
    default: {
      return {
        env: {},
        args: [],
        proxyRequired: true,
        proxyExposedTransport: getHarnessDefaultTransport(agent),
      };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/adapters/tests/translate-for-harness.test.ts`
Expected: PASS

- [ ] **Step 5: Export from adapters index**

Add to `packages/adapters/src/index.ts`:
```typescript
export type { HarnessProviderTranslation } from './provider-translation.js';
export { translateForHarness } from './translate-for-harness.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/adapters/src/translate-for-harness.ts packages/adapters/src/provider-translation.ts packages/adapters/tests/translate-for-harness.test.ts packages/adapters/src/index.ts
git commit -m "feat: add unified translateForHarness dispatcher"
```

---

## Phase 3: `amux launch` CLI Command

### Task 8: Launch command skeleton with flag parsing

**Files:**
- Create: `packages/cli/src/commands/launch.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/parse-args.ts` (add `'launch'` to COMMANDS set)

- [ ] **Step 1: Create launch command with flags and basic validation**

```typescript
// packages/cli/src/commands/launch.ts
import type { AgentMuxClient } from '@a5c-ai/agent-mux-core';
import type { ParsedArgs, FlagDef } from '../parse-args.js';
import { flagStr, flagNum, flagBool } from '../parse-args.js';
import { ExitCode } from '../exit-codes.js';
import { printError, printJsonError } from '../output.js';

export const LAUNCH_FLAGS: Record<string, FlagDef> = {
  'model': { short: 'm', type: 'string' },
  'api-key': { type: 'string' },
  'api-base': { type: 'string' },
  'region': { type: 'string' },
  'project': { type: 'string' },
  'resource-group': { type: 'string' },
  'endpoint-name': { type: 'string' },
  'transport': { short: 't', type: 'string' },
  'profile': { type: 'string' },
  'auth-command': { type: 'string' },
  'with-proxy-if-needed': { type: 'boolean' },
  'with-proxy': { type: 'boolean' },
  'no-proxy': { type: 'boolean' },
  'proxy-port': { type: 'number' },
  'proxy-log-level': { type: 'string' },
  'resume': { short: 'r', type: 'string' },
  'session-id': { short: 's', type: 'string' },
  'prompt': { short: 'p', type: 'string' },
  'max-turns': { type: 'number' },
  'max-budget-usd': { type: 'number' },
  'dry-run': { type: 'boolean' },
};

export async function launchCommand(client: AgentMuxClient, args: ParsedArgs): Promise<number> {
  const jsonMode = flagBool(args.flags, 'json') === true;
  const harness = args.positionals[0];
  const provider = args.positionals[1];

  if (!harness) {
    const msg = 'Usage: amux launch <harness> [provider] [flags...]\nRun "amux launch --help" for details.';
    if (jsonMode) printJsonError('VALIDATION_ERROR', msg);
    else printError(msg);
    return ExitCode.USAGE_ERROR;
  }

  // Validate harness exists in adapter registry
  const adapter = client.adapters.get(harness);
  if (!adapter) {
    const available = Array.from(client.adapters.keys()).join(', ');
    const msg = `Unknown harness '${harness}'. Available: ${available}`;
    if (jsonMode) printJsonError('AGENT_NOT_FOUND', msg);
    else printError(msg);
    return ExitCode.USAGE_ERROR;
  }

  // Validate mutual exclusion: --with-proxy vs --no-proxy
  const withProxy = flagBool(args.flags, 'with-proxy') === true;
  const withProxyIfNeeded = flagBool(args.flags, 'with-proxy-if-needed') === true;
  const noProxy = flagBool(args.flags, 'no-proxy') === true;
  if ((withProxy || withProxyIfNeeded) && noProxy) {
    const msg = 'Cannot use --with-proxy/--with-proxy-if-needed with --no-proxy';
    if (jsonMode) printJsonError('VALIDATION_ERROR', msg);
    else printError(msg);
    return ExitCode.USAGE_ERROR;
  }

  // TODO: Phase 3 tasks 9-10 will fill in the launch logic
  console.log(`[amux launch] harness=${harness} provider=${provider ?? 'default'}`);
  return ExitCode.SUCCESS;
}
```

- [ ] **Step 2: Register the command in the CLI entry point**

In `packages/cli/src/index.ts`, add import (after line 44):
```typescript
import { launchCommand, LAUNCH_FLAGS } from './commands/launch.js';
```

Extend the parseArgs flags merge (line 59) to include `...LAUNCH_FLAGS`:
```typescript
const args = parseArgs(rawArgs, { ...RUN_FLAGS, ...INSTALL_FLAGS, ...REMOTE_FLAGS, ...HOOKS_FLAGS, ...SKILL_FLAGS, ...AGENT_FLAGS, ...GATEWAY_FLAGS, ...LAUNCH_FLAGS });
```

Add case in the switch statement (after `case 'gateway':`, before `default:`):
```typescript
      case 'launch':
        return await launchCommand(client, args);
```

- [ ] **Step 3: Add 'launch' to the COMMANDS set**

In `packages/cli/src/parse-args.ts`, add `'launch'` to the COMMANDS set (around line 58-60).

- [ ] **Step 4: Build and verify the command is registered**

Run: `cd packages/cli && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/launch.ts packages/cli/src/index.ts packages/cli/src/parse-args.ts
git commit -m "feat: add amux launch command skeleton with flag parsing"
```

---

### Task 9: Launch resolution logic (provider resolve + proxy decision + harness env)

**Files:**
- Modify: `packages/cli/src/commands/launch.ts`
- Test: `packages/cli/tests/launch-resolution.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/cli/tests/launch-resolution.test.ts
import { describe, it, expect } from 'vitest';
import { resolveLaunchPlan, type LaunchPlan } from '../src/commands/launch.js';

describe('resolveLaunchPlan', () => {
  it('claude + anthropic: no proxy needed', () => {
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      apiKey: 'sk-ant-test',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(false);
    expect(plan.env['ANTHROPIC_API_KEY']).toBe('sk-ant-test');
  });

  it('codex + bedrock: proxy needed', () => {
    const plan = resolveLaunchPlan({
      harness: 'codex',
      provider: 'bedrock',
      model: 'anthropic.claude-sonnet-4-20250514-v1:0',
      region: 'us-east-1',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(true);
    expect(plan.proxy!.exposedTransport).toBe('openai-responses');
    expect(plan.proxy!.targetProvider).toBe('bedrock');
  });

  it('codex + bedrock + no-proxy: throws', () => {
    expect(() => resolveLaunchPlan({
      harness: 'codex',
      provider: 'bedrock',
      model: 'x',
      proxyMode: 'never',
    })).toThrow(/proxy/i);
  });

  it('claude + bedrock: no proxy (native)', () => {
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'bedrock',
      region: 'us-east-1',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(false);
    expect(plan.env['CLAUDE_CODE_USE_BEDROCK']).toBe('1');
  });

  it('dry-run produces JSON plan', () => {
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'anthropic',
      apiKey: 'test',
      proxyMode: 'if-needed',
    });
    expect(plan.harness).toBe('claude');
    expect(plan.command).toBe('claude');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/cli/tests/launch-resolution.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the resolution logic**

Add to `packages/cli/src/commands/launch.ts`:

```typescript
import {
  resolveProvider,
  isNativelySupported,
  getRequiredProxyTransport,
} from '@a5c-ai/agent-mux-core';
import type { ProviderId, TransportId } from '@a5c-ai/agent-mux-core';
import { translateForHarness } from '@a5c-ai/agent-mux-adapters';

export interface LaunchPlanInput {
  harness: string;
  provider?: string;
  model?: string;
  transport?: string;
  apiKey?: string;
  apiBase?: string;
  region?: string;
  project?: string;
  resourceGroup?: string;
  endpointName?: string;
  authCommand?: string;
  proxyMode: 'always' | 'if-needed' | 'never';
  proxyPort?: number;
}

export interface ProxyPlan {
  targetProvider: string;
  targetModel: string;
  exposedTransport: TransportId;
  port: number;
}

export interface LaunchPlan {
  harness: string;
  provider: string;
  transport: string;
  model: string;
  proxyNeeded: boolean;
  proxyReason: string;
  proxy?: ProxyPlan;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export function resolveLaunchPlan(input: LaunchPlanInput): LaunchPlan {
  const providerId = (input.provider ?? 'anthropic') as ProviderId;

  const providerConfig = resolveProvider({
    provider: providerId,
    model: input.model,
    transport: input.transport as TransportId | undefined,
    apiKey: input.apiKey,
    apiBase: input.apiBase,
    region: input.region,
    project: input.project,
    resourceGroup: input.resourceGroup,
    endpointName: input.endpointName,
    authCommand: input.authCommand,
  });

  const translation = translateForHarness(input.harness, providerConfig);

  let proxyNeeded = translation.proxyRequired;
  let proxyReason: string;

  if (!translation.proxyRequired) {
    if (input.proxyMode === 'always') {
      proxyNeeded = true;
      proxyReason = 'Proxy forced via --with-proxy';
    } else {
      proxyNeeded = false;
      proxyReason = `${input.harness} supports ${providerId} natively`;
    }
  } else {
    if (input.proxyMode === 'never') {
      throw new Error(
        `${input.harness} does not support ${providerId} natively. ` +
        `Use --with-proxy-if-needed to auto-launch the proxy.`
      );
    }
    proxyReason = `${input.harness} does not support ${providerId} natively; ` +
      `proxy bridges ${providerId} → ${translation.proxyExposedTransport}`;
  }

  const proxy: ProxyPlan | undefined = proxyNeeded
    ? {
        targetProvider: providerId,
        targetModel: providerConfig.model,
        exposedTransport: translation.proxyExposedTransport ?? 'openai-chat',
        port: input.proxyPort ?? 0,
      }
    : undefined;

  return {
    harness: input.harness,
    provider: providerId,
    transport: providerConfig.transport,
    model: providerConfig.model,
    proxyNeeded,
    proxyReason,
    proxy,
    command: input.harness,
    args: translation.args,
    env: translation.env,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/cli/tests/launch-resolution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/launch.ts packages/cli/tests/launch-resolution.test.ts
git commit -m "feat: implement launch resolution logic with proxy decision"
```

---

### Task 10: Launch command process spawn, proxy lifecycle, and stdin/stdout passthrough

**Files:**
- Modify: `packages/cli/src/commands/launch.ts`

- [ ] **Step 1: Implement the full launch flow**

Replace the `TODO` placeholder in the `launchCommand` function with the full implementation:

```typescript
// In launchCommand function body, after the validation section:

  const dryRun = flagBool(args.flags, 'dry-run') === true;
  const proxyMode = noProxy ? 'never' as const
    : withProxy ? 'always' as const
    : withProxyIfNeeded ? 'if-needed' as const
    : 'if-needed' as const;

  let plan: LaunchPlan;
  try {
    plan = resolveLaunchPlan({
      harness,
      provider: provider as ProviderId | undefined,
      model: flagStr(args.flags, 'model'),
      transport: flagStr(args.flags, 'transport'),
      apiKey: flagStr(args.flags, 'api-key'),
      apiBase: flagStr(args.flags, 'api-base'),
      region: flagStr(args.flags, 'region'),
      project: flagStr(args.flags, 'project'),
      resourceGroup: flagStr(args.flags, 'resource-group'),
      endpointName: flagStr(args.flags, 'endpoint-name'),
      authCommand: flagStr(args.flags, 'auth-command'),
      proxyMode,
      proxyPort: flagNum(args.flags, 'proxy-port'),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (jsonMode) printJsonError('VALIDATION_ERROR', msg);
    else printError(msg);
    return ExitCode.USAGE_ERROR;
  }

  // Dry-run: print plan and exit
  if (dryRun) {
    const output = { ...plan };
    // Mask API keys in dry-run output
    for (const [k, v] of Object.entries(output.env)) {
      if (k.toLowerCase().includes('key') || k.toLowerCase().includes('token')) {
        output.env[k] = v.slice(0, 8) + '***';
      }
    }
    console.log(JSON.stringify(output, null, 2));
    return ExitCode.SUCCESS;
  }

  // Build session args
  const resumeId = flagStr(args.flags, 'resume');
  const sessionId = flagStr(args.flags, 'session-id');
  const prompt = flagStr(args.flags, 'prompt');
  const maxTurns = flagNum(args.flags, 'max-turns');

  // Append session/prompt args per harness
  appendHarnessSessionArgs(plan, { resumeId, sessionId, prompt, maxTurns });

  // Append any -- passthrough args
  const dashDashIdx = process.argv.indexOf('--');
  if (dashDashIdx >= 0) {
    plan.args.push(...process.argv.slice(dashDashIdx + 1));
  }

  // Launch proxy if needed
  let proxyProcess: import('node:child_process').ChildProcess | undefined;
  if (plan.proxyNeeded && plan.proxy) {
    try {
      proxyProcess = await launchProxy(plan.proxy, plan.env, {
        logLevel: flagStr(args.flags, 'proxy-log-level') ?? 'warn',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (jsonMode) printJsonError('SPAWN_ERROR', `Failed to launch proxy: ${msg}`);
      else printError(`Failed to launch proxy: ${msg}`);
      return ExitCode.GENERAL_ERROR;
    }
  }

  // Spawn harness process
  const { spawn } = await import('node:child_process');
  const isInteractive = !prompt;

  const child = spawn(plan.command, plan.args, {
    stdio: isInteractive ? 'inherit' : ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, ...plan.env },
    cwd: process.cwd(),
    shell: false,
  });

  // Wire signals
  const forwardSignal = (sig: NodeJS.Signals) => { child.kill(sig); };
  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);

  // Non-interactive: pipe prompt to stdin and close
  if (!isInteractive && prompt && child.stdin) {
    child.stdin.write(prompt);
    child.stdin.end();
  }

  // Wait for harness exit
  const exitCode = await new Promise<number>((resolve) => {
    child.on('exit', (code, signal) => {
      resolve(signal ? 128 + (signal === 'SIGINT' ? 2 : 15) : (code ?? 1));
    });
  });

  // Cleanup
  process.off('SIGINT', forwardSignal);
  process.off('SIGTERM', forwardSignal);
  if (proxyProcess) {
    proxyProcess.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => { proxyProcess!.kill('SIGKILL'); resolve(); }, 5000);
      proxyProcess!.on('exit', () => { clearTimeout(timeout); resolve(); });
    });
  }

  return exitCode;
```

- [ ] **Step 2: Add helper functions for session args and proxy launch**

Add to `packages/cli/src/commands/launch.ts`:

```typescript
interface SessionArgs {
  resumeId?: string;
  sessionId?: string;
  prompt?: string;
  maxTurns?: number;
}

function appendHarnessSessionArgs(plan: LaunchPlan, session: SessionArgs): void {
  switch (plan.harness) {
    case 'claude': {
      if (session.resumeId) plan.args.push('--resume', session.resumeId);
      if (session.sessionId) plan.args.push('--session-id', session.sessionId);
      if (session.prompt) plan.args.push('--print', session.prompt);
      if (session.maxTurns) plan.args.push('--max-turns', String(session.maxTurns));
      break;
    }
    case 'codex': {
      if (session.resumeId) {
        plan.args.unshift('resume', session.resumeId);
      } else if (session.prompt) {
        plan.args.unshift('exec', session.prompt);
      }
      break;
    }
    case 'gemini': {
      if (session.prompt) plan.args.push('--prompt', session.prompt);
      break;
    }
    case 'opencode': {
      if (session.resumeId) plan.args.push('--session', session.resumeId);
      break;
    }
  }
}

async function launchProxy(
  proxy: ProxyPlan,
  harnessEnv: Record<string, string>,
  opts: { logLevel: string },
): Promise<import('node:child_process').ChildProcess> {
  const { spawn } = await import('node:child_process');

  const proxyEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    AMUX_PROXY_TARGET_PROVIDER: proxy.targetProvider,
    AMUX_PROXY_TARGET_MODEL: `${proxy.targetProvider}/${proxy.targetModel}`,
    AMUX_PROXY_EXPOSED_TRANSPORT: proxy.exposedTransport,
    AMUX_PROXY_PORT: String(proxy.port),
    AMUX_PROXY_LOG_LEVEL: opts.logLevel,
  };

  const proc = spawn('amux-proxy', [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: proxyEnv,
    detached: false,
  });

  // Wait for ready signal
  return new Promise<import('node:child_process').ChildProcess>((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Proxy health check timed out after 15s'));
    }, 15_000);

    let buffer = '';
    proc.stdout!.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const newlineIdx = buffer.indexOf('\n');
      if (newlineIdx >= 0) {
        const line = buffer.slice(0, newlineIdx);
        try {
          const msg = JSON.parse(line);
          if (msg.event === 'ready') {
            clearTimeout(timeout);
            // Update harness env with proxy URL and token
            const proxyUrl = msg.url as string;
            const authToken = msg.auth_token as string;
            updateEnvForProxy(harnessEnv, proxy.exposedTransport, proxyUrl, authToken);
            // Redirect remaining stdout to stderr
            proc.stdout!.pipe(process.stderr);
            resolve(proc);
          }
        } catch { /* not JSON, ignore */ }
      }
    });

    proc.on('error', (err) => { clearTimeout(timeout); reject(err); });
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Proxy exited with code ${code} before becoming ready`));
    });
    proc.stderr!.pipe(process.stderr);
  });
}

function updateEnvForProxy(
  env: Record<string, string>,
  transport: TransportId,
  proxyUrl: string,
  authToken: string,
): void {
  switch (transport) {
    case 'anthropic':
      env['ANTHROPIC_BASE_URL'] = proxyUrl;
      env['ANTHROPIC_API_KEY'] = authToken;
      env['ANTHROPIC_AUTH_TOKEN'] = authToken;
      break;
    case 'openai-chat':
    case 'openai-responses':
      env['OPENAI_BASE_URL'] = proxyUrl;
      env['OPENAI_API_KEY'] = authToken;
      break;
    case 'google':
      env['CODE_ASSIST_ENDPOINT'] = proxyUrl;
      env['GEMINI_API_KEY'] = authToken;
      break;
  }
}
```

- [ ] **Step 3: Build and verify types**

Run: `cd packages/cli && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/launch.ts
git commit -m "feat: implement full amux launch with proxy lifecycle and passthrough"
```

---

## Phase 4: `amux-proxy` Python Package

### Task 11: Python package scaffold

**Files:**
- Create: `packages/amux-proxy/pyproject.toml`
- Create: `packages/amux-proxy/src/amux_proxy/__init__.py`
- Create: `packages/amux-proxy/src/amux_proxy/__main__.py`
- Create: `packages/amux-proxy/src/amux_proxy/config.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
# packages/amux-proxy/pyproject.toml
[project]
name = "amux-proxy"
version = "0.1.0"
description = "Transport protocol bridge for coding agent harnesses"
requires-python = ">=3.11"
license = { text = "MIT" }
authors = [{ name = "A5C AI", email = "eng@a5c.ai" }]

dependencies = [
    "litellm>=1.60.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "click>=8.1.0",
    "pydantic>=2.0.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
ollama = ["ollama>=0.4.0"]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "pytest-httpx>=0.30",
    "ruff>=0.8.0",
    "mypy>=1.13",
]
all = ["amux-proxy[ollama,dev]"]

[project.scripts]
amux-proxy = "amux_proxy.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/amux_proxy"]

[tool.ruff]
target-version = "py311"
line-length = 120

[tool.mypy]
python_version = "3.11"
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
```

- [ ] **Step 2: Create __init__.py**

```python
# packages/amux-proxy/src/amux_proxy/__init__.py
"""amux-proxy: Transport protocol bridge for coding agent harnesses."""
__version__ = "0.1.0"
```

- [ ] **Step 3: Create config.py**

```python
# packages/amux-proxy/src/amux_proxy/config.py
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass, field


@dataclass
class ProxyConfig:
    target_provider: str
    target_model: str
    exposed_transport: str
    host: str = "127.0.0.1"
    port: int = 0
    auth_token: str = field(default_factory=lambda: str(uuid.uuid4()))
    log_level: str = "warn"
    timeout: int = 600
    max_retries: int = 2
    stream: bool = True
    drop_unsupported_params: bool = True

    # Ollama-specific
    ollama_auto_pull: bool = True
    ollama_host: str = "http://localhost:11434"
    ollama_manage_server: bool = False

    @classmethod
    def from_env(cls) -> ProxyConfig:
        return cls(
            target_provider=os.environ.get("AMUX_PROXY_TARGET_PROVIDER", ""),
            target_model=os.environ.get("AMUX_PROXY_TARGET_MODEL", ""),
            exposed_transport=os.environ.get("AMUX_PROXY_EXPOSED_TRANSPORT", ""),
            host=os.environ.get("AMUX_PROXY_HOST", "127.0.0.1"),
            port=int(os.environ.get("AMUX_PROXY_PORT", "0")),
            auth_token=os.environ.get("AMUX_PROXY_AUTH_TOKEN", str(uuid.uuid4())),
            log_level=os.environ.get("AMUX_PROXY_LOG_LEVEL", "warn"),
            timeout=int(os.environ.get("AMUX_PROXY_TIMEOUT", "600")),
            max_retries=int(os.environ.get("AMUX_PROXY_MAX_RETRIES", "2")),
            stream=os.environ.get("AMUX_PROXY_STREAM", "true").lower() == "true",
            drop_unsupported_params=os.environ.get("AMUX_PROXY_DROP_UNSUPPORTED_PARAMS", "true").lower() == "true",
            ollama_auto_pull=os.environ.get("AMUX_PROXY_OLLAMA_AUTO_PULL", "true").lower() == "true",
            ollama_host=os.environ.get("AMUX_PROXY_OLLAMA_HOST", "http://localhost:11434"),
            ollama_manage_server=os.environ.get("AMUX_PROXY_OLLAMA_MANAGE_SERVER", "false").lower() == "true",
        )

    def validate(self) -> list[str]:
        errors: list[str] = []
        if not self.target_provider:
            errors.append("AMUX_PROXY_TARGET_PROVIDER is required")
        if not self.target_model:
            errors.append("AMUX_PROXY_TARGET_MODEL is required")
        if not self.exposed_transport:
            errors.append("AMUX_PROXY_EXPOSED_TRANSPORT is required")
        valid_transports = {"anthropic", "openai-chat", "openai-responses", "google", "a2a"}
        if self.exposed_transport and self.exposed_transport not in valid_transports:
            errors.append(f"Invalid transport '{self.exposed_transport}'. Valid: {valid_transports}")
        return errors
```

- [ ] **Step 4: Create __main__.py**

```python
# packages/amux-proxy/src/amux_proxy/__main__.py
from amux_proxy.cli import main

main()
```

- [ ] **Step 5: Create tests/test_config.py**

```python
# packages/amux-proxy/tests/test_config.py
import os
import pytest
from amux_proxy.config import ProxyConfig


def test_from_env_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AMUX_PROXY_TARGET_PROVIDER", "bedrock")
    monkeypatch.setenv("AMUX_PROXY_TARGET_MODEL", "bedrock/anthropic.claude-sonnet-4")
    monkeypatch.setenv("AMUX_PROXY_EXPOSED_TRANSPORT", "anthropic")
    cfg = ProxyConfig.from_env()
    assert cfg.target_provider == "bedrock"
    assert cfg.host == "127.0.0.1"
    assert cfg.port == 0
    assert cfg.stream is True


def test_validate_missing_fields() -> None:
    cfg = ProxyConfig(target_provider="", target_model="", exposed_transport="")
    errors = cfg.validate()
    assert len(errors) == 3


def test_validate_invalid_transport() -> None:
    cfg = ProxyConfig(target_provider="x", target_model="x", exposed_transport="invalid")
    errors = cfg.validate()
    assert any("Invalid transport" in e for e in errors)


def test_validate_passes() -> None:
    cfg = ProxyConfig(target_provider="bedrock", target_model="x", exposed_transport="anthropic")
    assert cfg.validate() == []
```

- [ ] **Step 6: Verify structure**

Run: `ls packages/amux-proxy/src/amux_proxy/ && ls packages/amux-proxy/tests/`
Expected: Config, init, and test files present

- [ ] **Step 7: Commit**

```bash
git add packages/amux-proxy/
git commit -m "feat: scaffold amux-proxy Python package with config"
```

---

### Task 12: CLI entry point with click

**Files:**
- Create: `packages/amux-proxy/src/amux_proxy/cli.py`

- [ ] **Step 1: Implement CLI**

```python
# packages/amux-proxy/src/amux_proxy/cli.py
from __future__ import annotations

import click

from amux_proxy import __version__
from amux_proxy.config import ProxyConfig


@click.command()
@click.option("--target-provider", envvar="AMUX_PROXY_TARGET_PROVIDER", help="LiteLLM provider name")
@click.option("--target-model", envvar="AMUX_PROXY_TARGET_MODEL", help="LiteLLM model identifier")
@click.option("--transport", envvar="AMUX_PROXY_EXPOSED_TRANSPORT", help="Exposed transport protocol")
@click.option("--port", type=int, default=0, envvar="AMUX_PROXY_PORT", help="Listen port (0=auto)")
@click.option("--host", default="127.0.0.1", envvar="AMUX_PROXY_HOST", help="Bind address")
@click.option("--auth-token", envvar="AMUX_PROXY_AUTH_TOKEN", default=None, help="Bearer token for auth")
@click.option("--log-level", default="warn", envvar="AMUX_PROXY_LOG_LEVEL", help="Log level")
@click.option("--timeout", type=int, default=600, envvar="AMUX_PROXY_TIMEOUT", help="Request timeout seconds")
@click.version_option(__version__)
def main(
    target_provider: str | None,
    target_model: str | None,
    transport: str | None,
    port: int,
    host: str,
    auth_token: str | None,
    log_level: str,
    timeout: int,
) -> None:
    """amux-proxy: Transport protocol bridge for coding agent harnesses."""
    import uuid

    config = ProxyConfig(
        target_provider=target_provider or "",
        target_model=target_model or "",
        exposed_transport=transport or "",
        host=host,
        port=port,
        auth_token=auth_token or str(uuid.uuid4()),
        log_level=log_level,
        timeout=timeout,
    )

    errors = config.validate()
    if errors:
        for e in errors:
            click.echo(f"Error: {e}", err=True)
        raise SystemExit(1)

    from amux_proxy.server import run_server
    run_server(config)
```

- [ ] **Step 2: Commit**

```bash
git add packages/amux-proxy/src/amux_proxy/cli.py
git commit -m "feat: add amux-proxy CLI entry point"
```

---

### Task 13: FastAPI server with health endpoint and auth middleware

**Files:**
- Create: `packages/amux-proxy/src/amux_proxy/server.py`
- Create: `packages/amux-proxy/src/amux_proxy/auth.py`
- Create: `packages/amux-proxy/src/amux_proxy/health.py`
- Test: `packages/amux-proxy/tests/test_health.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/amux-proxy/tests/test_health.py
import pytest
from httpx import ASGITransport, AsyncClient
from amux_proxy.server import create_app
from amux_proxy.config import ProxyConfig


@pytest.fixture
def config() -> ProxyConfig:
    return ProxyConfig(
        target_provider="openai",
        target_model="openai/gpt-4o",
        exposed_transport="anthropic",
        auth_token="test-token",
    )


@pytest.fixture
async def client(config: ProxyConfig) -> AsyncClient:
    app = create_app(config)
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c  # type: ignore[misc]


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["transport"] == "anthropic"
    assert body["provider"] == "openai"


@pytest.mark.asyncio
async def test_auth_rejects_missing_token(client: AsyncClient) -> None:
    resp = await client.post("/v1/messages", json={"model": "x", "messages": []})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_accepts_valid_token(client: AsyncClient, config: ProxyConfig) -> None:
    resp = await client.post(
        "/v1/messages",
        json={"model": "x", "max_tokens": 10, "messages": [{"role": "user", "content": "hi"}]},
        headers={"X-Api-Key": config.auth_token},
    )
    # Will fail with 502 or similar since we have no real backend,
    # but should NOT be 401
    assert resp.status_code != 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/amux-proxy && python -m pytest tests/test_health.py -v`
Expected: FAIL — module not found

- [ ] **Step 3: Implement auth middleware**

```python
# packages/amux-proxy/src/amux_proxy/auth.py
from __future__ import annotations

from fastapi import Request, HTTPException


def verify_auth(request: Request, expected_token: str) -> None:
    # Check X-Api-Key header (Anthropic style)
    api_key = request.headers.get("x-api-key")
    if api_key == expected_token:
        return

    # Check Authorization: Bearer (OpenAI/Google style)
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer ") and auth_header[7:] == expected_token:
        return

    raise HTTPException(status_code=401, detail="Invalid or missing authentication token")
```

- [ ] **Step 4: Implement server with health endpoint**

```python
# packages/amux-proxy/src/amux_proxy/server.py
from __future__ import annotations

import json
import sys

from fastapi import FastAPI
import uvicorn

from amux_proxy.config import ProxyConfig


def create_app(config: ProxyConfig) -> FastAPI:
    app = FastAPI(
        title="amux-proxy",
        description="Transport protocol bridge for coding agent harnesses",
        version="0.1.0",
    )

    app.state.config = config

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "transport": config.exposed_transport,
            "provider": config.target_provider,
            "model": config.target_model,
        }

    # Mount transport-specific routes
    if config.exposed_transport == "anthropic":
        from amux_proxy.transports.anthropic import create_router
        app.include_router(create_router(config))
    elif config.exposed_transport == "openai-chat":
        from amux_proxy.transports.openai_chat import create_router
        app.include_router(create_router(config))
    elif config.exposed_transport == "openai-responses":
        from amux_proxy.transports.openai_responses import create_router
        app.include_router(create_router(config))
    elif config.exposed_transport == "google":
        from amux_proxy.transports.google import create_router
        app.include_router(create_router(config))

    return app


def run_server(config: ProxyConfig) -> None:
    app = create_app(config)

    print(f"[amux-proxy] Transport: {config.exposed_transport} → {config.target_provider}", file=sys.stderr)
    print(f"[amux-proxy] Model: {config.target_model}", file=sys.stderr)

    # Structured startup for amux launch to parse
    print(json.dumps({
        "event": "ready",
        "port": config.port,
        "auth_token": config.auth_token,
        "url": f"http://{config.host}:{config.port}",
    }), flush=True)

    uvicorn.run(
        app,
        host=config.host,
        port=config.port,
        log_level=config.log_level,
        access_log=config.log_level == "debug",
    )
```

- [ ] **Step 5: Create transport stubs (needed for imports)**

```python
# packages/amux-proxy/src/amux_proxy/transports/__init__.py
```

```python
# packages/amux-proxy/src/amux_proxy/transports/anthropic.py
from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse

from amux_proxy.auth import verify_auth
from amux_proxy.config import ProxyConfig


def create_router(config: ProxyConfig) -> APIRouter:
    router = APIRouter()

    @router.post("/v1/messages")
    async def messages(request: Request) -> JSONResponse:
        verify_auth(request, config.auth_token)
        body = await request.json()

        import litellm
        litellm.drop_params = config.drop_unsupported_params

        try:
            messages_list = body.get("messages", [])
            litellm_messages = _convert_anthropic_messages(messages_list)

            response = await litellm.acompletion(
                model=config.target_model,
                messages=litellm_messages,
                max_tokens=body.get("max_tokens", 4096),
                temperature=body.get("temperature"),
                stream=False,
                timeout=config.timeout,
                num_retries=config.max_retries,
            )

            return JSONResponse(_format_anthropic_response(response))
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return router


def _convert_anthropic_messages(messages: list[dict]) -> list[dict]:
    result = []
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, list):
            text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
            content = "\n".join(text_parts)
        result.append({"role": msg["role"], "content": content})
    return result


def _format_anthropic_response(response: object) -> dict:
    choice = response.choices[0]  # type: ignore[attr-defined]
    return {
        "id": response.id,  # type: ignore[attr-defined]
        "type": "message",
        "role": "assistant",
        "content": [{"type": "text", "text": choice.message.content}],
        "model": response.model,  # type: ignore[attr-defined]
        "stop_reason": "end_turn",
        "usage": {
            "input_tokens": response.usage.prompt_tokens,  # type: ignore[attr-defined]
            "output_tokens": response.usage.completion_tokens,  # type: ignore[attr-defined]
        },
    }
```

Create minimal stubs for the other transports (so imports don't fail):

```python
# packages/amux-proxy/src/amux_proxy/transports/openai_chat.py
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from amux_proxy.auth import verify_auth
from amux_proxy.config import ProxyConfig

def create_router(config: ProxyConfig) -> APIRouter:
    router = APIRouter()

    @router.post("/v1/chat/completions")
    async def chat_completions(request: Request) -> JSONResponse:
        verify_auth(request, config.auth_token)
        body = await request.json()
        import litellm
        litellm.drop_params = config.drop_unsupported_params
        try:
            response = await litellm.acompletion(
                model=config.target_model,
                messages=body.get("messages", []),
                max_tokens=body.get("max_tokens"),
                temperature=body.get("temperature"),
                stream=False,
                timeout=config.timeout,
                num_retries=config.max_retries,
            )
            return JSONResponse(response.model_dump())  # type: ignore[union-attr]
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return router
```

```python
# packages/amux-proxy/src/amux_proxy/transports/openai_responses.py
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from amux_proxy.auth import verify_auth
from amux_proxy.config import ProxyConfig

def create_router(config: ProxyConfig) -> APIRouter:
    router = APIRouter()

    @router.post("/v1/responses")
    async def responses(request: Request) -> JSONResponse:
        verify_auth(request, config.auth_token)
        body = await request.json()
        import litellm
        litellm.drop_params = config.drop_unsupported_params
        try:
            inp = body.get("input", "")
            messages = [{"role": "user", "content": inp}] if isinstance(inp, str) else inp
            instructions = body.get("instructions")
            if instructions:
                messages.insert(0, {"role": "system", "content": instructions})
            response = await litellm.acompletion(
                model=config.target_model,
                messages=messages,
                max_tokens=body.get("max_output_tokens"),
                stream=False,
                timeout=config.timeout,
                num_retries=config.max_retries,
            )
            choice = response.choices[0]  # type: ignore[attr-defined]
            return JSONResponse({
                "id": response.id,  # type: ignore[attr-defined]
                "object": "response",
                "status": "completed",
                "output": [{"type": "message", "role": "assistant",
                            "content": [{"type": "output_text", "text": choice.message.content}]}],
                "usage": {"input_tokens": response.usage.prompt_tokens,  # type: ignore[attr-defined]
                          "output_tokens": response.usage.completion_tokens},  # type: ignore[attr-defined]
            })
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return router
```

```python
# packages/amux-proxy/src/amux_proxy/transports/google.py
from __future__ import annotations
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from amux_proxy.auth import verify_auth
from amux_proxy.config import ProxyConfig

def create_router(config: ProxyConfig) -> APIRouter:
    router = APIRouter()

    @router.post("/v1beta/models/{model}:generateContent")
    async def generate_content(model: str, request: Request) -> JSONResponse:
        verify_auth(request, config.auth_token)
        body = await request.json()
        import litellm
        litellm.drop_params = config.drop_unsupported_params
        try:
            contents = body.get("contents", [])
            messages = []
            for c in contents:
                role = c.get("role", "user")
                parts = c.get("parts", [])
                text = " ".join(p.get("text", "") for p in parts if "text" in p)
                messages.append({"role": role, "content": text})
            gen_config = body.get("generationConfig", {})
            response = await litellm.acompletion(
                model=config.target_model,
                messages=messages,
                max_tokens=gen_config.get("maxOutputTokens"),
                temperature=gen_config.get("temperature"),
                stream=False,
                timeout=config.timeout,
                num_retries=config.max_retries,
            )
            choice = response.choices[0]  # type: ignore[attr-defined]
            return JSONResponse({
                "candidates": [{
                    "content": {"parts": [{"text": choice.message.content}], "role": "model"},
                    "finishReason": "STOP",
                }],
                "usageMetadata": {
                    "promptTokenCount": response.usage.prompt_tokens,  # type: ignore[attr-defined]
                    "candidatesTokenCount": response.usage.completion_tokens,  # type: ignore[attr-defined]
                },
            })
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return router
```

- [ ] **Step 6: Run tests**

Run: `cd packages/amux-proxy && pip install -e ".[dev]" && python -m pytest tests/test_health.py -v`
Expected: PASS (health and auth tests should pass; the backend call test may need litellm mocked)

- [ ] **Step 7: Commit**

```bash
git add packages/amux-proxy/
git commit -m "feat: add amux-proxy server with health, auth, and transport endpoints"
```

---

### Task 14: Ollama model manager

**Files:**
- Create: `packages/amux-proxy/src/amux_proxy/providers/__init__.py`
- Create: `packages/amux-proxy/src/amux_proxy/providers/ollama_mgr.py`
- Test: `packages/amux-proxy/tests/test_ollama_mgr.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/amux-proxy/tests/test_ollama_mgr.py
import pytest
from unittest.mock import MagicMock, patch
from amux_proxy.providers.ollama_mgr import OllamaManager


@pytest.fixture
def mock_client() -> MagicMock:
    client = MagicMock()
    model1 = MagicMock()
    model1.model = "qwen3:32b"
    model2 = MagicMock()
    model2.model = "llama3:8b"
    list_resp = MagicMock()
    list_resp.models = [model1, model2]
    client.list.return_value = list_resp
    return client


def test_list_models(mock_client: MagicMock) -> None:
    mgr = OllamaManager.__new__(OllamaManager)
    mgr.client = mock_client
    models = mgr.list_models()
    assert "qwen3:32b" in models
    assert "llama3:8b" in models


def test_health_check_ok(mock_client: MagicMock) -> None:
    mgr = OllamaManager.__new__(OllamaManager)
    mgr.client = mock_client
    assert mgr.health_check() is True


def test_health_check_fail() -> None:
    mgr = OllamaManager.__new__(OllamaManager)
    client = MagicMock()
    client.list.side_effect = ConnectionError("refused")
    mgr.client = client
    assert mgr.health_check() is False


def test_ensure_model_available(mock_client: MagicMock) -> None:
    mgr = OllamaManager.__new__(OllamaManager)
    mgr.client = mock_client
    assert mgr.ensure_model_sync("qwen3:32b", auto_pull=False) is True


def test_ensure_model_missing_no_pull(mock_client: MagicMock) -> None:
    mgr = OllamaManager.__new__(OllamaManager)
    mgr.client = mock_client
    with pytest.raises(RuntimeError, match="not found locally"):
        mgr.ensure_model_sync("nonexistent:latest", auto_pull=False)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/amux-proxy && python -m pytest tests/test_ollama_mgr.py -v`
Expected: FAIL

- [ ] **Step 3: Implement Ollama manager**

```python
# packages/amux-proxy/src/amux_proxy/providers/__init__.py
```

```python
# packages/amux-proxy/src/amux_proxy/providers/ollama_mgr.py
from __future__ import annotations

import sys


class OllamaManager:
    def __init__(self, host: str = "http://localhost:11434") -> None:
        try:
            import ollama
            self.client = ollama.Client(host=host)
        except ImportError:
            raise ImportError(
                "ollama package not installed. Install with: pip install 'amux-proxy[ollama]'"
            )

    def list_models(self) -> list[str]:
        response = self.client.list()
        return [m.model for m in response.models]

    def health_check(self) -> bool:
        try:
            self.client.list()
            return True
        except Exception:
            return False

    def ensure_model_sync(self, model: str, auto_pull: bool = True) -> bool:
        available = self.list_models()
        if model in available:
            return True
        if not auto_pull:
            raise RuntimeError(
                f"Model '{model}' not found locally. "
                "Set AMUX_PROXY_OLLAMA_AUTO_PULL=true to auto-pull."
            )
        self.pull_model(model)
        return True

    def pull_model(self, model: str) -> None:
        for progress in self.client.pull(model, stream=True):
            status = progress.get("status", "")
            completed = progress.get("completed", 0)
            total = progress.get("total", 0)
            if total > 0:
                pct = (completed / total) * 100
                print(f"\r[amux-proxy] Pulling {model}: {status} {pct:.1f}%", end="", file=sys.stderr)
            else:
                print(f"\r[amux-proxy] Pulling {model}: {status}", end="", file=sys.stderr)
        print(file=sys.stderr)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/amux-proxy && python -m pytest tests/test_ollama_mgr.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/amux-proxy/src/amux_proxy/providers/ packages/amux-proxy/tests/test_ollama_mgr.py
git commit -m "feat: add Ollama model manager for local model pull and health"
```

---

### Task 15: CI/CD workflows

**Files:**
- Create: `packages/amux-proxy/.github/workflows/ci.yml`
- Create: `packages/amux-proxy/.github/workflows/publish.yml`
- Create: `packages/amux-proxy/.github/workflows/docker.yml`
- Create: `packages/amux-proxy/Dockerfile`

- [ ] **Step 1: Create CI workflow**

```yaml
# packages/amux-proxy/.github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
    paths: ["packages/amux-proxy/**"]
  pull_request:
    paths: ["packages/amux-proxy/**"]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[dev]"
        working-directory: packages/amux-proxy
      - run: ruff check .
        working-directory: packages/amux-proxy
      - run: ruff format --check .
        working-directory: packages/amux-proxy

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[all]"
        working-directory: packages/amux-proxy
      - run: python -m pytest --tb=short -q
        working-directory: packages/amux-proxy
```

- [ ] **Step 2: Create publish workflow**

```yaml
# packages/amux-proxy/.github/workflows/publish.yml
name: Publish
on:
  push:
    tags: ["amux-proxy-v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install build
      - run: python -m build
        working-directory: packages/amux-proxy
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: packages/amux-proxy/dist/
```

- [ ] **Step 3: Create Docker workflow**

```yaml
# packages/amux-proxy/.github/workflows/docker.yml
name: Docker
on:
  push:
    tags: ["amux-proxy-v*"]

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: packages/amux-proxy
          push: true
          tags: ghcr.io/a5c-ai/amux-proxy:${{ github.ref_name }},ghcr.io/a5c-ai/amux-proxy:latest
          platforms: linux/amd64,linux/arm64
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
# packages/amux-proxy/Dockerfile
FROM python:3.11-slim AS base

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir ".[ollama]"

COPY src/ src/

RUN useradd -m -r proxy && chown -R proxy:proxy /app
USER proxy

EXPOSE 8080

ENTRYPOINT ["amux-proxy"]
CMD ["--port", "8080", "--host", "0.0.0.0"]
```

- [ ] **Step 5: Commit**

```bash
git add packages/amux-proxy/.github/ packages/amux-proxy/Dockerfile
git commit -m "feat: add CI/CD workflows and Dockerfile for amux-proxy"
```

---

## Phase 5: Integration & Polish

### Task 16: Streaming support for Anthropic transport

**Files:**
- Modify: `packages/amux-proxy/src/amux_proxy/transports/anthropic.py`
- Test: `packages/amux-proxy/tests/test_anthropic_transport.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/amux-proxy/tests/test_anthropic_transport.py
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import ASGITransport, AsyncClient
from amux_proxy.server import create_app
from amux_proxy.config import ProxyConfig


@pytest.fixture
def config() -> ProxyConfig:
    return ProxyConfig(
        target_provider="openai",
        target_model="openai/gpt-4o",
        exposed_transport="anthropic",
        auth_token="test-token",
    )


@pytest.fixture
async def client(config: ProxyConfig) -> AsyncClient:
    app = create_app(config)
    transport = ASGITransport(app=app)  # type: ignore[arg-type]
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c  # type: ignore[misc]


@pytest.mark.asyncio
async def test_non_streaming_messages(client: AsyncClient, config: ProxyConfig) -> None:
    mock_response = MagicMock()
    mock_response.id = "msg_123"
    mock_response.model = "gpt-4o"
    choice = MagicMock()
    choice.message.content = "Hello from proxy"
    mock_response.choices = [choice]
    usage = MagicMock()
    usage.prompt_tokens = 10
    usage.completion_tokens = 5
    mock_response.usage = usage

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_response):
        resp = await client.post("/v1/messages", json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": "Hello"}],
        }, headers={"X-Api-Key": config.auth_token})

    assert resp.status_code == 200
    body = resp.json()
    assert body["type"] == "message"
    assert body["content"][0]["text"] == "Hello from proxy"
    assert body["usage"]["input_tokens"] == 10


@pytest.mark.asyncio
async def test_streaming_messages(client: AsyncClient, config: ProxyConfig) -> None:
    chunk1 = MagicMock()
    chunk1.choices = [MagicMock()]
    chunk1.choices[0].delta.content = "Hello"
    chunk1.choices[0].delta.role = "assistant"

    chunk2 = MagicMock()
    chunk2.choices = [MagicMock()]
    chunk2.choices[0].delta.content = " world"
    chunk2.choices[0].delta.role = None

    async def mock_stream():
        yield chunk1
        yield chunk2

    with patch("litellm.acompletion", new_callable=AsyncMock, return_value=mock_stream()):
        resp = await client.post("/v1/messages", json={
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 100,
            "messages": [{"role": "user", "content": "Hello"}],
            "stream": True,
        }, headers={"X-Api-Key": config.auth_token})

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/amux-proxy && python -m pytest tests/test_anthropic_transport.py -v`
Expected: FAIL (streaming not implemented)

- [ ] **Step 3: Add streaming to Anthropic transport**

Update `packages/amux-proxy/src/amux_proxy/transports/anthropic.py` — add a streaming branch in the `/v1/messages` handler:

```python
    @router.post("/v1/messages")
    async def messages(request: Request) -> JSONResponse | StreamingResponse:
        verify_auth(request, config.auth_token)
        body = await request.json()

        import litellm
        litellm.drop_params = config.drop_unsupported_params

        messages_list = body.get("messages", [])
        litellm_messages = _convert_anthropic_messages(messages_list)
        is_streaming = body.get("stream", False)

        try:
            response = await litellm.acompletion(
                model=config.target_model,
                messages=litellm_messages,
                max_tokens=body.get("max_tokens", 4096),
                temperature=body.get("temperature"),
                stream=is_streaming,
                timeout=config.timeout,
                num_retries=config.max_retries,
            )

            if not is_streaming:
                return JSONResponse(_format_anthropic_response(response))

            import json as json_mod

            async def generate():
                msg_id = f"msg_{id(response)}"
                yield f"event: message_start\ndata: {json_mod.dumps({'type': 'message_start', 'message': {'id': msg_id, 'type': 'message', 'role': 'assistant', 'content': [], 'model': config.target_model}})}\n\n"
                yield f"event: content_block_start\ndata: {json_mod.dumps({'type': 'content_block_start', 'index': 0, 'content_block': {'type': 'text', 'text': ''}})}\n\n"

                async for chunk in response:
                    delta_content = chunk.choices[0].delta.content
                    if delta_content:
                        yield f"event: content_block_delta\ndata: {json_mod.dumps({'type': 'content_block_delta', 'index': 0, 'delta': {'type': 'text_delta', 'text': delta_content}})}\n\n"

                yield f"event: content_block_stop\ndata: {json_mod.dumps({'type': 'content_block_stop', 'index': 0})}\n\n"
                yield f"event: message_delta\ndata: {json_mod.dumps({'type': 'message_delta', 'delta': {'stop_reason': 'end_turn'}})}\n\n"
                yield f"event: message_stop\ndata: {json_mod.dumps({'type': 'message_stop'})}\n\n"

            return StreamingResponse(generate(), media_type="text/event-stream")
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/amux-proxy && python -m pytest tests/test_anthropic_transport.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/amux-proxy/src/amux_proxy/transports/anthropic.py packages/amux-proxy/tests/test_anthropic_transport.py
git commit -m "feat: add streaming SSE support for Anthropic transport in amux-proxy"
```

---

### Task 17: Add `launch` to CLI help text and update docs index

**Files:**
- Modify: `packages/cli/src/commands/help.ts` (add launch to help output)
- Modify: `docs/10-cli-reference.md` (add launch command section)

- [ ] **Step 1: Add launch to help output**

Find the help text generation in `packages/cli/src/commands/help.ts` and add `launch` to the command list:

```
  launch <harness> [provider]  Launch a harness with provider/model config and stdin/stdout passthrough
```

- [ ] **Step 2: Add launch section to CLI reference doc**

Add a new section to `docs/10-cli-reference.md` after the `run` command section:

```markdown
## X. `amux launch`

Launch (or resume) a coding agent harness session with full stdin/stdout passthrough and unified provider/model configuration.

### Usage

\`\`\`
amux launch <harness> [provider] [flags...]
\`\`\`

See `docs/launcher.md` for the full specification.

### Key Flags

| Flag | Description |
|---|---|
| `--model`, `-m` | Model identifier |
| `--api-key` | API key for the provider |
| `--transport`, `-t` | Wire protocol override |
| `--with-proxy-if-needed` | Auto-launch amux-proxy if needed |
| `--prompt`, `-p` | Non-interactive prompt |
| `--resume`, `-r` | Resume session by ID |
| `--dry-run` | Print resolved plan as JSON |

### Examples

\`\`\`bash
# Interactive Claude via Bedrock
amux launch claude bedrock --region us-east-1

# Non-interactive Codex via Bedrock (proxy auto-launched)
amux launch codex bedrock --region us-east-1 -p "Fix the bug" --with-proxy-if-needed

# Dry-run to see what would happen
amux launch gemini anthropic --api-key $KEY --dry-run
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/help.ts docs/10-cli-reference.md
git commit -m "docs: add amux launch to CLI help and reference docs"
```

---

### Task 18: End-to-end integration test

**Files:**
- Create: `packages/cli/tests/launch-e2e.test.ts`

- [ ] **Step 1: Write integration test using dry-run**

```typescript
// packages/cli/tests/launch-e2e.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveLaunchPlan } from '../src/commands/launch.js';

describe('launch e2e (dry-run equivalents)', () => {
  const originalEnv = { ...process.env };
  afterEach(() => { process.env = { ...originalEnv }; });

  it('claude + anthropic direct: no proxy, correct env', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test';
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'anthropic',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(false);
    expect(plan.command).toBe('claude');
    expect(plan.env['ANTHROPIC_API_KEY']).toBe('sk-ant-test');
  });

  it('codex + bedrock: proxy needed with openai-responses', () => {
    const plan = resolveLaunchPlan({
      harness: 'codex',
      provider: 'bedrock',
      model: 'anthropic.claude-sonnet-4-20250514-v1:0',
      region: 'us-east-1',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(true);
    expect(plan.proxy?.exposedTransport).toBe('openai-responses');
    expect(plan.proxy?.targetProvider).toBe('bedrock');
  });

  it('gemini + vertex: no proxy needed', () => {
    const plan = resolveLaunchPlan({
      harness: 'gemini',
      provider: 'vertex',
      project: 'my-project',
      region: 'us-central1',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(false);
    expect(plan.env['GOOGLE_GENAI_USE_VERTEXAI']).toBe('true');
    expect(plan.env['GOOGLE_CLOUD_PROJECT']).toBe('my-project');
  });

  it('claude + openai: proxy needed with anthropic transport', () => {
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'openai',
      apiKey: 'sk-openai',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(true);
    expect(plan.proxy?.exposedTransport).toBe('anthropic');
  });

  it('opencode + anthropic: no proxy (native SDK)', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-ant';
    const plan = resolveLaunchPlan({
      harness: 'opencode',
      provider: 'anthropic',
      proxyMode: 'if-needed',
    });
    expect(plan.proxyNeeded).toBe(false);
    expect(plan.env['OPENCODE_CONFIG_CONTENT']).toBeTruthy();
  });

  it('force proxy even when native', () => {
    const plan = resolveLaunchPlan({
      harness: 'claude',
      provider: 'anthropic',
      apiKey: 'test',
      proxyMode: 'always',
    });
    expect(plan.proxyNeeded).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run packages/cli/tests/launch-e2e.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/cli/tests/launch-e2e.test.ts
git commit -m "test: add launch e2e integration tests"
```

---

## Summary

| Phase | Tasks | Deliverable |
|---|---|---|
| 1: Core Types | 1-4 | `ProviderConfig`, `resolveProvider()`, support matrix, `RunOptions` extension |
| 2: Adapters | 5-7 | Per-harness translators (Claude, Codex, Gemini, OpenCode) + dispatcher |
| 3: CLI | 8-10 | `amux launch` command with flag parsing, resolution, proxy lifecycle, passthrough |
| 4: Python Package | 11-15 | `amux-proxy` with config, CLI, server, transports, Ollama manager, CI/CD |
| 5: Polish | 16-18 | Streaming, help text, docs, e2e tests |

**Dependency chain:** Tasks 1→2→3→4 (within Phase 1), 5→6→7 (Phase 2), 8→9→10 (Phase 3). Phase 4 (tasks 11-15) can run in parallel with Phases 1-3. Phase 5 depends on all prior phases.
