// Target registry and hook name mapping

import { getHookNameMap, listPluginTargets } from '@a5c-ai/agent-catalog';
import type { TargetProfile } from '../types.js';
import { CLAUDE_CODE_PROFILE } from './claude-code.js';
import { CODEX_PROFILE } from './codex.js';
import { CURSOR_PROFILE } from './cursor.js';
import { GEMINI_PROFILE } from './gemini.js';
import { GITHUB_COPILOT_PROFILE } from './github-copilot.js';
import { PI_PROFILE } from './pi.js';
import { OH_MY_PI_PROFILE } from './oh-my-pi.js';
import { OPENCODE_PROFILE } from './opencode.js';
import { OPENCLAW_PROFILE } from './openclaw.js';

const LOCAL_TARGET_REGISTRY: Record<string, TargetProfile> = {
  'claude-code': CLAUDE_CODE_PROFILE,
  codex: CODEX_PROFILE,
  cursor: CURSOR_PROFILE,
  gemini: GEMINI_PROFILE,
  'github-copilot': GITHUB_COPILOT_PROFILE,
  pi: PI_PROFILE,
  'oh-my-pi': OH_MY_PI_PROFILE,
  opencode: OPENCODE_PROFILE,
  openclaw: OPENCLAW_PROFILE,
};

const CATALOG_TARGETS = new Set(listPluginTargets());

export const TARGET_REGISTRY: Record<string, TargetProfile> = Object.fromEntries(
  Object.entries(LOCAL_TARGET_REGISTRY).filter(([name]) => CATALOG_TARGETS.has(name)),
);

export const HOOK_NAME_MAP: Record<string, Record<string, string>> = getHookNameMap();

export function getTargetProfile(name: string): TargetProfile | null {
  return TARGET_REGISTRY[name] || null;
}

export function getAllTargets(): string[] {
  return listPluginTargets().filter((name) => TARGET_REGISTRY[name]);
}
