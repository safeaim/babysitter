/**
 * OpenAI-compatible completion engine.
 *
 * Moved from packages/agent-mux/cli/src/commands/launch-completion-engine.ts
 * so that the engine lives alongside the transport-mux runtime.
 */

import type {
  CompletionEngine,
  CompletionRequest,
  CompletionResult,
  CompletionStreamEvent,
} from '../types.js';

function buildUrl(apiBase: string, model: string): string {
  return `${apiBase}/openai/deployments/${model}/chat/completions?api-version=2025-04-01-preview`;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  };
}

function buildBody(messages: Array<{ role: string; content: string }>, model: string, stream: boolean, tools?: unknown[], toolChoice?: unknown): string {
  const body: Record<string, unknown> = { messages, model, stream };
  if (tools && tools.length > 0) body.tools = tools;
  if (toolChoice !== undefined) body.tool_choice = toolChoice;
  return JSON.stringify(body);
}

export function createOpenAICompletionEngine(options: {
  apiBase: string;
  apiKey: string;
  targetModel: string;
}): CompletionEngine {
  return {
    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const messages = request.messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch(
        buildUrl(options.apiBase, options.targetModel),
        {
          method: 'POST',
          headers: buildHeaders(options.apiKey),
          body: buildBody(messages, options.targetModel, false, request.tools, request.toolChoice),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json() as {
        id: string;
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };

      const choice = data.choices[0];
      return {
        id: data.id,
        model: options.targetModel,
        role: 'assistant',
        text: choice?.message?.content ?? '',
        finishReason: choice?.finish_reason ?? 'stop',
        usage: {
          promptTokens: data.usage?.prompt_tokens ?? 0,
          completionTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
      };
    },

    async *stream(request: CompletionRequest): AsyncIterable<CompletionStreamEvent> {
      const messages = request.messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch(
        buildUrl(options.apiBase, options.targetModel),
        {
          method: 'POST',
          headers: buildHeaders(options.apiKey),
          body: buildBody(messages, options.targetModel, true, request.tools, request.toolChoice),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const chunk = JSON.parse(payload) as {
              choices: Array<{ delta: { content?: string }; finish_reason?: string | null }>;
              usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
            };
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              yield { type: 'text-delta', text: delta };
            }
            if (chunk.choices[0]?.finish_reason) {
              yield {
                type: 'done',
                finishReason: chunk.choices[0].finish_reason,
                usage: chunk.usage ? {
                  promptTokens: chunk.usage.prompt_tokens,
                  completionTokens: chunk.usage.completion_tokens,
                  totalTokens: chunk.usage.total_tokens,
                } : undefined,
              };
              return;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      yield { type: 'done' };
    },
  };
}
