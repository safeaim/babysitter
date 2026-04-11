/**
 * GAP-PROMPT-002: Deterministic Capability Projection
 *
 * Collects capability signals from installed plugins, process-library bindings,
 * harness adapters, and feature flags, producing a sorted, deterministic
 * capability array for PromptContext enrichment.
 *
 * @module prompts/capabilityCollector
 */

import { readPluginRegistry } from '../plugins/registry';
import { resolveActiveProcessLibrary } from '../processLibrary/active';
import type { PluginScope } from '../plugins/types';

/**
 * Collected capabilities from all runtime signal sources.
 */
export interface CollectedCapabilities {
  pluginCapabilities: string[];
  libraryCapabilities: string[];
  adapterCapabilities: string[];
  flagCapabilities: string[];
  /** Sorted union of all capability arrays */
  all: string[];
}

/**
 * Options for capability collection.
 */
export interface CapabilityCollectionOptions {
  /** Global state directory (default: ~/.a5c) */
  globalStateDir?: string;
  /** Project state directory (default: .a5c) */
  stateDir?: string;
  /** Harness name for adapter capability detection */
  harness?: string;
  /** Feature flags: only truthy values are projected */
  featureFlags?: Record<string, boolean>;
  /** Override state dir for process library resolution */
  processLibraryStateDir?: string;
}

/**
 * Collect capabilities from installed plugins, process-library bindings,
 * harness adapters, and feature flags.
 *
 * The output is deterministic: same inputs always produce the same sorted result.
 */
export async function collectCapabilities(
  options: CapabilityCollectionOptions = {},
): Promise<CollectedCapabilities> {
  const pluginCapabilities = await collectPluginCapabilities(options);
  const libraryCapabilities = await collectLibraryCapabilities(options);
  const adapterCapabilities = collectAdapterCapabilities(options);
  const flagCapabilities = collectFlagCapabilities(options);

  const allSet = new Set([
    ...pluginCapabilities,
    ...libraryCapabilities,
    ...adapterCapabilities,
    ...flagCapabilities,
  ]);
  const all = [...allSet].sort();

  return {
    pluginCapabilities: [...pluginCapabilities].sort(),
    libraryCapabilities: [...libraryCapabilities].sort(),
    adapterCapabilities: [...adapterCapabilities].sort(),
    flagCapabilities: [...flagCapabilities].sort(),
    all,
  };
}

/**
 * Merge baseline capabilities with collected capabilities.
 * Deduplicates and returns a sorted array.
 */
export function mergeCapabilities(
  base: string[],
  collected: CollectedCapabilities,
): string[] {
  const merged = new Set([...base, ...collected.all]);
  return [...merged].sort();
}

/**
 * Collect plugin capabilities from both global and project registries.
 */
async function collectPluginCapabilities(
  options: CapabilityCollectionOptions,
): Promise<string[]> {
  const caps: string[] = [];
  const scopes: PluginScope[] = ['global', 'project'];

  for (const scope of scopes) {
    try {
      const registry = await readPluginRegistry(
        scope,
        scope === 'project' ? options.stateDir : undefined,
      );
      for (const name of Object.keys(registry.plugins)) {
        caps.push(name ? `plugin:${name}` : 'plugin:unknown');
      }
    } catch {
      // Registry read failures are non-fatal — skip silently
    }
  }

  return caps;
}

/**
 * Collect library capabilities from process-library binding state.
 */
async function collectLibraryCapabilities(
  options: CapabilityCollectionOptions,
): Promise<string[]> {
  try {
    const result = await resolveActiveProcessLibrary({
      stateDir: options.processLibraryStateDir ?? options.stateDir,
    });
    if (result.binding) {
      return ['process-library'];
    }
  } catch {
    // Binding resolution failures are non-fatal
  }
  return [];
}

/**
 * Collect adapter capabilities from harness name.
 * Maps known harness capabilities to string identifiers.
 */
function collectAdapterCapabilities(
  options: CapabilityCollectionOptions,
): string[] {
  if (!options.harness) return [];

  // Map known harness names to their intrinsic capabilities
  const harnessCapabilities: Record<string, string[]> = {
    'claude-code': ['hooks', 'stop-hook', 'session-binding'],
    'codex': ['hooks', 'stop-hook', 'session-binding'],
    'cursor': ['hooks', 'stop-hook', 'mcp'],
    'gemini-cli': ['hooks', 'stop-hook'],
    'github-copilot': ['hooks', 'mcp'],
    'pi': ['programmatic-session', 'skills'],
    'oh-my-pi': ['programmatic-session', 'skills', 'mcp'],
    'opencode': [],
    'openclaw': ['session-binding', 'mcp', 'headless-prompt'],
    'internal': ['programmatic-session', 'concurrent-effects', 'background-effects'],
  };

  return harnessCapabilities[options.harness] ?? [];
}

/**
 * Collect flag capabilities from feature flags.
 */
function collectFlagCapabilities(
  options: CapabilityCollectionOptions,
): string[] {
  if (!options.featureFlags) return [];

  return Object.entries(options.featureFlags)
    .filter(([_key, value]) => value === true)
    .map(([key]) => `flag:${key}`);
}
