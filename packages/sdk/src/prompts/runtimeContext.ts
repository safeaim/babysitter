/**
 * GAP-PROMPT-002: Runtime Prompt Context Factory
 *
 * Wraps static context factories with runtime capability collection,
 * producing enriched PromptContext instances with deterministic capabilities.
 *
 * @module prompts/runtimeContext
 */

import type { PromptContext } from './types';
import {
  createClaudeCodeContext,
  createCodexContext,
  createGeminiCliContext,
  createPiContext,
  createGithubCopilotContext,
  createCursorContext,
  createOpenCodeContext,
  createOhMyPiContext,
  createOpenClawContext,
  createInternalContext,
} from './context';
import { collectCapabilities, mergeCapabilities } from './capabilityCollector';
import type { CapabilityCollectionOptions } from './capabilityCollector';

/**
 * Options for creating a runtime-enriched PromptContext.
 */
export interface RuntimeContextOptions {
  /** Harness identifier */
  harness: string;
  /** Partial overrides for the base context */
  baseContext?: Partial<PromptContext>;
  /** Options for runtime capability collection */
  collectionOptions?: CapabilityCollectionOptions;
}

/** Map of harness names to their static context factories */
const CONTEXT_FACTORIES: Record<string, (overrides?: Partial<PromptContext>) => PromptContext> = {
  'claude-code': createClaudeCodeContext,
  'codex': createCodexContext,
  'gemini-cli': createGeminiCliContext,
  'pi': createPiContext,
  'github-copilot': createGithubCopilotContext,
  'cursor': createCursorContext,
  'opencode': createOpenCodeContext,
  'oh-my-pi': createOhMyPiContext,
  'openclaw': createOpenClawContext,
  'internal': createInternalContext,
};

/**
 * Create a PromptContext enriched with runtime-collected capabilities.
 *
 * Picks the correct static context factory based on harness name,
 * collects runtime capabilities, and returns a context with merged,
 * sorted capabilities. Falls back to claude-code context for unknown harnesses.
 */
export async function createRuntimePromptContext(
  options: RuntimeContextOptions,
): Promise<PromptContext> {
  const factory = CONTEXT_FACTORIES[options.harness] ?? createClaudeCodeContext;
  const baseCtx = factory({
    ...options.baseContext,
    // Preserve the requested harness name even when falling back to claude-code factory
    ...(CONTEXT_FACTORIES[options.harness] ? {} : { harness: options.harness }),
  });

  const collected = await collectCapabilities({
    harness: options.harness,
    ...options.collectionOptions,
  });

  return {
    ...baseCtx,
    capabilities: mergeCapabilities(baseCtx.capabilities, collected),
  };
}
