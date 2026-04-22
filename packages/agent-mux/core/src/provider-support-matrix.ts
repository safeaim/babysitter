import type { ProviderId, TransportId } from './provider-config.js';
import type { AgentName } from './types.js';

export interface NativeSupportEntry {
  agent: string;
  provider: ProviderId;
  mechanism: string;
}

const NATIVE_SUPPORT: NativeSupportEntry[] = [
  { agent: 'claude', provider: 'anthropic', mechanism: 'ANTHROPIC_API_KEY' },
  { agent: 'claude', provider: 'bedrock', mechanism: 'CLAUDE_CODE_USE_BEDROCK' },
  { agent: 'claude', provider: 'vertex', mechanism: 'CLAUDE_CODE_USE_VERTEX' },
  { agent: 'claude', provider: 'foundry', mechanism: 'CLAUDE_CODE_USE_FOUNDRY' },
  { agent: 'claude', provider: 'ollama', mechanism: 'ANTHROPIC_BASE_URL (partial)' },
  { agent: 'codex', provider: 'openai', mechanism: 'OPENAI_API_KEY' },
  { agent: 'codex', provider: 'ollama', mechanism: '--oss flag' },
  { agent: 'gemini', provider: 'google', mechanism: 'GEMINI_API_KEY' },
  { agent: 'gemini', provider: 'vertex', mechanism: 'GOOGLE_GENAI_USE_VERTEXAI' },
  { agent: 'opencode', provider: 'anthropic', mechanism: '@ai-sdk/anthropic' },
  { agent: 'opencode', provider: 'openai', mechanism: '@ai-sdk/openai' },
  { agent: 'opencode', provider: 'google', mechanism: '@ai-sdk/google' },
  { agent: 'opencode', provider: 'vertex', mechanism: '@ai-sdk/google-vertex' },
  { agent: 'opencode', provider: 'bedrock', mechanism: '@ai-sdk/amazon-bedrock' },
  { agent: 'opencode', provider: 'azure', mechanism: '@ai-sdk/azure' },
  { agent: 'opencode', provider: 'ollama', mechanism: '@ai-sdk/openai-compatible' },
  { agent: 'opencode', provider: 'groq', mechanism: '@ai-sdk/openai-compatible' },
  { agent: 'opencode', provider: 'openrouter', mechanism: '@openrouter/ai-sdk-provider' },
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

const PROVIDER_NATIVE_TRANSPORT: Record<string, TransportId> = {
  anthropic: 'anthropic', openai: 'openai-responses', google: 'google',
  groq: 'openai-chat', fireworks: 'openai-chat', together: 'openai-chat',
  deepseek: 'openai-chat', mistral: 'openai-chat', cerebras: 'openai-chat',
  sambanova: 'openai-chat', openrouter: 'openai-chat', ollama: 'openai-chat',
  local: 'openai-chat',
  lmstudio: 'openai-chat',
  vllm: 'openai-chat',
};

export function isNativelySupported(agent: AgentName, provider: ProviderId): boolean {
  return NATIVE_SUPPORT.some(e => e.agent === agent && e.provider === provider);
}

export function isTransportCompatible(agent: AgentName, provider: ProviderId): boolean {
  const harnessTransport = HARNESS_DEFAULT_TRANSPORT[agent];
  const providerTransport = PROVIDER_NATIVE_TRANSPORT[provider];
  if (!harnessTransport || !providerTransport) return false;
  return harnessTransport === providerTransport;
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
