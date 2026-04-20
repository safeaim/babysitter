/**
 * Harness-specific prompt context factories.
 * Extracted from individual adapter promptContext.ts files.
 */

import type { PromptContext } from "../../prompts/types";
import {
  createClaudeCodeCliSetupSnippet,
  createDefaultCliSetupSnippet,
  createPromptContext,
} from "../../prompts/contextShared";

export function createCodexContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'codex',
    harnessLabel: 'Codex',
    capabilities: ['hooks', 'stop-hook', 'ask-user-question', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '${CODEX_PLUGIN_ROOT}',
    loopControlTerm: 'stop-hook',
    sessionBindingFlags: '',
    hookDriven: true,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars:
      'PID-scoped session marker (authoritative); CODEX_THREAD_ID/CODEX_SESSION_ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: true,
    hasNonNegotiables: true,
  }, overrides);
}

export function createCursorContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'cursor',
    harnessLabel: 'Cursor',
    capabilities: ['hooks', 'stop-hook', 'mcp', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '${CURSOR_PLUGIN_ROOT}',
    loopControlTerm: 'stop-hook',
    sessionBindingFlags: '',
    hookDriven: true,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars: 'conversation_id from hook stdin (authoritative per-request); PID-scoped session marker; AGENT_SESSION_ID fallback',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createGeminiCliContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'gemini-cli',
    harnessLabel: 'Gemini CLI',
    capabilities: ['hooks', 'stop-hook', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '${GEMINI_EXTENSION_PATH}',
    loopControlTerm: 'stop-hook',
    sessionBindingFlags: '',
    hookDriven: true,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars: 'PID-scoped session marker (authoritative); GEMINI_SESSION_ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createGithubCopilotContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'github-copilot',
    harnessLabel: 'GitHub Copilot CLI',
    capabilities: ['hooks', 'mcp', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '${COPILOT_PLUGIN_ROOT}',
    loopControlTerm: 'in-turn',
    sessionBindingFlags: '',
    hookDriven: false,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars: 'PID-scoped session marker (authoritative); COPILOT_ENV_FILE / COPILOT_SESSION_ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createOhMyPiContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'oh-my-pi',
    harnessLabel: 'oh-my-pi',
    capabilities: ['skills', 'slash-commands', 'task-tool', 'harness-routing', 'programmatic-session', 'mcp'],
    pluginRootVar: '${OMP_PLUGIN_ROOT}',
    loopControlTerm: 'skill-driven',
    sessionBindingFlags: '',
    hookDriven: false,
    interactiveToolName: 'AskUserQuestion',
    sessionEnvVars: 'PID-scoped session marker (authoritative); OMP_SESSION_ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createOpenClawContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'openclaw',
    harnessLabel: 'OpenClaw',
    capabilities: ['session-binding', 'mcp', 'headless-prompt', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '',
    loopControlTerm: 'agent_end',
    sessionBindingFlags: '',
    hookDriven: false,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars: 'PID-scoped session marker (authoritative); OPENCLAW_SHELL gateway injection and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createOpenCodeContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'opencode',
    harnessLabel: 'OpenCode',
    capabilities: ['task-tool', 'breakpoint-routing'],
    pluginRootVar: '',
    loopControlTerm: 'in-turn',
    sessionBindingFlags: '',
    hookDriven: false,
    interactiveToolName: '',
    sessionEnvVars: 'PID-scoped session marker (authoritative); shell.env-injected session ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createPiContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'pi',
    harnessLabel: 'Pi Coding Agent',
    capabilities: ['skills', 'slash-commands', 'task-tool', 'harness-routing', 'programmatic-session'],
    pluginRootVar: '${PI_PLUGIN_ROOT}',
    loopControlTerm: 'skill-driven',
    sessionBindingFlags: '',
    hookDriven: false,
    interactiveToolName: 'AskUserQuestion',
    sessionEnvVars: 'PID-scoped session marker (authoritative); PI_SESSION_ID and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createDefaultCliSetupSnippet(),
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}

export function createClaudeCodeContext(
  overrides?: Partial<PromptContext>,
): PromptContext {
  return createPromptContext({
    harness: 'claude-code',
    harnessLabel: 'Claude Code',
    capabilities: ['hooks', 'stop-hook', 'ask-user-question', 'task-tool', 'breakpoint-routing'],
    pluginRootVar: '${CLAUDE_PLUGIN_ROOT}',
    loopControlTerm: 'stop-hook',
    sessionBindingFlags: '',
    hookDriven: true,
    interactiveToolName: 'AskUserQuestion tool',
    sessionEnvVars: 'PID-scoped session marker (authoritative); CLAUDE_ENV_FILE and AGENT_SESSION_ID are fallbacks',
    resumeFlags: '',
    cliSetupSnippet: createClaudeCodeCliSetupSnippet(),
    sdkVersionExpr: '$SDK_VERSION',
    iterateFlags: '',
    hasIntentFidelityChecks: false,
    hasNonNegotiables: false,
  }, overrides);
}
