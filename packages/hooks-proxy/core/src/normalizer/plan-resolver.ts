import type { HandlerRef, HookPlanEntry } from '../types/plan';

/**
 * Options for resolving a hook execution plan.
 */
export interface PlanResolverOptions {
  /** The canonical phase to resolve handlers for. */
  phase: string;
  /** Explicit handler refs passed via CLI --handler args. */
  handlers?: HandlerRef[];
}

/**
 * Sort plan entries by: priority ascending, then pluginId ascending,
 * then id ascending for deterministic ordering.
 */
export function sortPlanEntries(entries: HookPlanEntry[]): HookPlanEntry[] {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const sa = a.pluginId.localeCompare(b.pluginId);
    if (sa !== 0) return sa;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Sort handler refs by: priority ascending, then source ascending,
 * then handler ascending.  (Legacy convenience for external callers.)
 */
export function sortHandlers(handlers: HandlerRef[]): HandlerRef[] {
  return [...handlers].sort((a, b) => {
    const pa = a.priority ?? 1000;
    const pb = b.priority ?? 1000;
    if (pa !== pb) return pa - pb;
    const sa = a.source.localeCompare(b.source);
    if (sa !== 0) return sa;
    return a.handler.localeCompare(b.handler);
  });
}

/**
 * Resolve a hook execution plan for the given phase.
 *
 * Merges handlers from explicit --handler args.
 * Produces one HookPlanEntry per handler, sorted by priority.
 */
export function resolveHookPlan(options: PlanResolverOptions): HookPlanEntry[] {
  const { phase, handlers = [] } = options;

  const entries: HookPlanEntry[] = [];
  let counter = 0;

  // Explicit handler refs
  for (const h of handlers) {
    entries.push({
      id: `explicit-${counter++}`,
      pluginId: h.source,
      phase,
      priority: h.priority ?? 1000,
      handler: h,
    });
  }

  if (entries.length === 0) {
    return [];
  }

  return sortPlanEntries(entries);
}
