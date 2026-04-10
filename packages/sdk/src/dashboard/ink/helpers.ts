/**
 * Shared pure helpers for the Babysitter TUI components.
 *
 * Centralises formatting functions used by multiple components
 * (StatusBar, StatusLine) to avoid duplication.
 */

import type { MessageKind, ThemeColors } from "./types.js";

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

// ---------------------------------------------------------------------------
// truncateOutput
// ---------------------------------------------------------------------------

/**
 * Truncate text by line count, returning metadata about truncation.
 */
export function truncateOutput(
  text: string,
  maxLines = 50,
): { text: string; truncated: boolean; totalLines: number } {
  if (text === "") {
    return { text: "", truncated: false, totalLines: 0 };
  }

  const allLines = text.split("\n");
  const totalLines = allLines.length;

  if (totalLines <= maxLines) {
    return { text, truncated: false, totalLines };
  }

  const kept = allLines.slice(0, maxLines);
  const omitted = totalLines - maxLines;
  return {
    text: kept.join("\n") + `\n[... ${omitted} more lines]`,
    truncated: true,
    totalLines,
  };
}

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

/**
 * Format an ISO date string as HH:MM:SS in local time.
 */
export function formatTimestamp(isoString: string | undefined | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// formatElapsedCompact
// ---------------------------------------------------------------------------

/**
 * Format milliseconds into a compact duration string.
 */
export function formatElapsedCompact(ms: number): string {
  if (ms < 0) ms = 0;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m${seconds}s`;
}

// ---------------------------------------------------------------------------
// briefArgs
// ---------------------------------------------------------------------------

/**
 * Serialize tool arguments into a short preview string.
 */
export function briefArgs(input: unknown): string {
  if (input === null || input === undefined) return "";
  if (typeof input === "string") {
    if (input.length <= 60) return input;
    return input.slice(0, 60) + "...";
  }
  if (typeof input === "number" || typeof input === "boolean") {
    return String(input);
  }
  try {
    const json = JSON.stringify(input);
    if (json.length <= 80) return json;
    return json.slice(0, 80) + "...";
  } catch {
    return "[object]";
  }
}

// ---------------------------------------------------------------------------
// getMessageIcon
// ---------------------------------------------------------------------------

const MESSAGE_ICONS: Record<MessageKind, string> = {
  user: ">",
  assistant: "",
  tool_call: "\u2699",
  subagent: "\u25C8",
  system: "\u2139",
  error: "\u2717",
};

/**
 * Map a MessageKind to its display icon.
 */
export function getMessageIcon(kind: MessageKind): string {
  return MESSAGE_ICONS[kind] ?? "";
}

// ---------------------------------------------------------------------------
// getMessageColor
// ---------------------------------------------------------------------------

/**
 * Map a MessageKind to its theme color.
 */
export function getMessageColor(kind: MessageKind, colors: ThemeColors): string {
  switch (kind) {
    case "user":
      return colors.primary;
    case "assistant":
      return colors.foreground;
    case "tool_call":
      return colors.toolCall;
    case "subagent":
      return colors.subagent;
    case "system":
      return colors.muted;
    case "error":
      return colors.error;
    default:
      return colors.foreground;
  }
}

// ---------------------------------------------------------------------------
// shouldShowTimestamp
// ---------------------------------------------------------------------------

/**
 * Whether a given message kind should display a timestamp.
 */
export function shouldShowTimestamp(kind: MessageKind): boolean {
  return kind === "user" || kind === "assistant" || kind === "error";
}

// ---------------------------------------------------------------------------
// formatToolCallSummary
// ---------------------------------------------------------------------------

/**
 * One-line tool call summary string.
 */
export function formatToolCallSummary(
  toolName: string,
  input: unknown,
  elapsedMs?: number,
  output?: string,
): string {
  let summary = `\u2699 ${toolName}`;
  const args = briefArgs(input);
  if (args) {
    summary += ` ${args}`;
  }
  if (elapsedMs !== undefined) {
    summary += ` (${formatElapsedCompact(elapsedMs)})`;
  }
  if (output !== undefined && output !== "") {
    let preview = output.replace(/\n/g, " ");
    if (preview.length > 40) {
      preview = preview.slice(0, 40) + "...";
    }
    summary += ` \u2192 ${preview}`;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// formatShellOutput
// ---------------------------------------------------------------------------

/**
 * Format shell command output into display lines.
 */
export function formatShellOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): { lines: string[]; hasError: boolean } {
  const lines: string[] = [];

  if (stdout) {
    const stdoutLines = stdout.replace(/\n$/, "").split("\n");
    lines.push(...stdoutLines);
  }

  if (stderr) {
    const stderrLines = stderr.replace(/\n$/, "").split("\n");
    for (const line of stderrLines) {
      lines.push(`stderr: ${line}`);
    }
  }

  const hasError = exitCode !== 0;

  if (hasError) {
    lines.push(`Exit code: ${exitCode}`);
  }

  return { lines, hasError };
}

// ---------------------------------------------------------------------------
// formatToolOutput
// ---------------------------------------------------------------------------

/**
 * Format arbitrary tool output into display lines.
 */
export function formatToolOutput(output: unknown): string[] {
  if (output === null || output === undefined) return [];
  if (typeof output === "string") {
    if (output === "") return [];
    return output.split("\n");
  }
  if (typeof output === "number" || typeof output === "boolean") {
    return [String(output)];
  }
  const json = JSON.stringify(output, null, 2);
  return json.split("\n");
}
