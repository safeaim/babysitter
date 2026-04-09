/**
 * Shared pure helpers for the Babysitter TUI components.
 *
 * Centralises formatting functions used by multiple components
 * (StatusBar, StatusLine) to avoid duplication.
 */

/**
 * Truncate a run ID to at most 12 characters for display.
 */
export function truncateRunId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 12);
}

/**
 * Format a monetary cost for display.
 * Sub-dollar amounts use 4 decimal places; dollar+ uses 2.
 */
export function formatCost(cost: number): string {
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
