/**
 * ActionMenu — fixed-height bottom bar showing available keyboard shortcuts.
 *
 * Renders a horizontal row of shortcut hints:
 *   [Enter] Details  [s] Session  [n] New  [r] Refresh  [q] Quit
 *
 * Box/Text are obtained from InkContext via useInk() — no prop drilling.
 */

import React from "react";
import { useInk } from "../contexts/InkContext.js";
import { useTheme } from "../hooks/useTheme.js";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActionMenuProps {
  readonly onAction: (action: string) => void;
}

// ---------------------------------------------------------------------------
// Shortcut definitions
// ---------------------------------------------------------------------------

interface Shortcut {
  readonly key: string;
  readonly label: string;
}

const SHORTCUTS: readonly Shortcut[] = [
  { key: "Enter", label: "Details" },
  { key: "s", label: "Session" },
  { key: "n", label: "New" },
  { key: "r", label: "Refresh" },
  { key: "q", label: "Quit" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionMenu({
  onAction: _onAction,
}: ActionMenuProps): React.JSX.Element {
  const { Box, Text } = useInk();
  const { colors } = useTheme();

  const items = SHORTCUTS.map((shortcut) =>
    React.createElement(
      Box as React.ComponentType<Record<string, unknown>>,
      { key: shortcut.key, flexDirection: "row", gap: 0 },
      React.createElement(
        Text as React.ComponentType<Record<string, unknown>>,
        { color: colors.muted, dimColor: true },
        "[",
      ),
      React.createElement(
        Text as React.ComponentType<Record<string, unknown>>,
        { color: colors.primary, bold: true },
        shortcut.key,
      ),
      React.createElement(
        Text as React.ComponentType<Record<string, unknown>>,
        { color: colors.muted, dimColor: true },
        "]",
      ),
      React.createElement(
        Text as React.ComponentType<Record<string, unknown>>,
        { color: colors.foreground },
        ` ${shortcut.label}`,
      ),
    ),
  );

  return React.createElement(
    Box as React.ComponentType<Record<string, unknown>>,
    {
      flexDirection: "row",
      gap: 2,
      height: 1,
      paddingX: 1,
      marginTop: 1,
    },
    ...items,
  );
}
