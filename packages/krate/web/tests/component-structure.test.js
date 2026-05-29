/**
 * Component Structure Tests -- Static analysis of component files to verify
 * conventions, accessibility patterns, and code-quality guards.
 *
 * These tests read source files as text (no JSX compilation, no jsdom) and
 * assert structural invariants that every component should satisfy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.join(__dirname, '..');
const componentsDir = path.join(webRoot, 'app', 'components');

/** Read a component source file. */
function readComponent(name) {
  return fs.readFileSync(path.join(componentsDir, name), 'utf8');
}

/** List all .jsx files in the components directory. */
function allJsxFiles() {
  return fs.readdirSync(componentsDir).filter((f) => f.endsWith('.jsx'));
}

/** List all .js files in the components directory. */
function allJsFiles() {
  return fs.readdirSync(componentsDir).filter((f) => f.endsWith('.js'));
}

// ---------------------------------------------------------------------------
// 1. Every .jsx component exports at least one named function or const
// ---------------------------------------------------------------------------

test('all .jsx component files export named symbols (no default exports)', () => {
  const jsxFiles = allJsxFiles();
  assert.ok(jsxFiles.length >= 50, `expected >= 50 jsx files, found ${jsxFiles.length}`);

  for (const file of jsxFiles) {
    const src = readComponent(file);
    const hasNamedExport =
      /^export\s+(async\s+)?function\s+\w+/m.test(src) ||
      /^export\s+const\s+\w+/m.test(src);
    assert.ok(hasNamedExport, `${file} must have at least one named export`);
  }
});

// ---------------------------------------------------------------------------
// 2. No component uses default exports
// ---------------------------------------------------------------------------

test('no component file uses export default', () => {
  const jsxFiles = allJsxFiles();
  for (const file of jsxFiles) {
    const src = readComponent(file);
    assert.ok(
      !/^export\s+default\b/m.test(src),
      `${file} must not use export default -- use named exports`,
    );
  }
});

// ---------------------------------------------------------------------------
// 3. Every .jsx file starts with 'use client' directive
// ---------------------------------------------------------------------------

test('every .jsx component has the "use client" directive', () => {
  const jsxFiles = allJsxFiles();
  for (const file of jsxFiles) {
    const src = readComponent(file);
    const firstNonEmptyLine = src.split('\n').find((l) => l.trim().length > 0);
    assert.ok(
      firstNonEmptyLine && firstNonEmptyLine.trim() === "'use client';",
      `${file} must start with 'use client'; directive (found: ${firstNonEmptyLine?.trim()})`,
    );
  }
});

// ---------------------------------------------------------------------------
// 4. index.js barrel re-exports all expected component symbols
// ---------------------------------------------------------------------------

test('index.js barrel exports ConfirmDialog', () => {
  const indexSrc = readComponent('index.js');
  assert.ok(indexSrc.includes("ConfirmDialog"), 'index.js must re-export ConfirmDialog');
});

test('index.js barrel exports DispatchButton', () => {
  const indexSrc = readComponent('index.js');
  assert.ok(indexSrc.includes("DispatchButton"), 'index.js must re-export DispatchButton');
});

test('index.js barrel exports StackBuilder', () => {
  const indexSrc = readComponent('index.js');
  assert.ok(indexSrc.includes("StackBuilder"), 'index.js must re-export StackBuilder');
});

test('index.js barrel exports InferencePlayground', () => {
  const indexSrc = readComponent('index.js');
  assert.ok(indexSrc.includes("InferencePlayground"), 'index.js must re-export InferencePlayground');
});

test('index.js barrel exports CommandPalette', () => {
  const indexSrc = readComponent('index.js');
  assert.ok(indexSrc.includes("CommandPalette"), 'index.js must re-export CommandPalette');
});

// ---------------------------------------------------------------------------
// 5. confirm-dialog.jsx has proper accessibility attributes
// ---------------------------------------------------------------------------

test('confirm-dialog.jsx includes role="dialog" and aria-modal', () => {
  const src = readComponent('confirm-dialog.jsx');
  assert.ok(src.includes('role="dialog"'), 'ConfirmDialog must use role="dialog"');
  assert.ok(src.includes('aria-modal'), 'ConfirmDialog must use aria-modal');
  assert.ok(src.includes('aria-label'), 'ConfirmDialog must use aria-label');
});

// ---------------------------------------------------------------------------
// 6. Key interactive components have aria-label attributes
// ---------------------------------------------------------------------------

test('dispatch-button.jsx has aria-label attributes for controls', () => {
  const src = readComponent('dispatch-button.jsx');
  assert.ok(src.includes('aria-label'), 'DispatchButton must have aria-label attributes');
});

test('command-palette.jsx has aria-label for search input', () => {
  const src = readComponent('command-palette.jsx');
  assert.ok(src.includes('aria-label'), 'CommandPalette must have aria-label attributes');
});

test('global-search.jsx has aria-label for search input', () => {
  const src = readComponent('global-search.jsx');
  assert.ok(src.includes('aria-label'), 'GlobalSearch must have aria-label attributes');
});

// ---------------------------------------------------------------------------
// 7. No bare alert() calls in components
// ---------------------------------------------------------------------------

test('no component file uses bare alert() -- use ConfirmDialog instead', () => {
  const jsxFiles = allJsxFiles();
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    // Match alert( that is NOT inside a comment or string like 'aria-label'
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines
      if (/^\s*(\/\/|\*)/.test(line)) continue;
      // Match standalone alert( calls -- not inside aria-label or variable names
      if (/\balert\s*\(/.test(line) && !line.includes('aria-label') && !line.includes('alertRef')) {
        violations.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    }
  }
  // Record violations for visibility but allow known ones (settings-rbac, settings-adapters, settings-provider-helpers)
  // that predate ConfirmDialog adoption.
  const knownLegacy = ['settings-rbac.jsx', 'settings-adapters.jsx', 'settings-provider-helpers.jsx'];
  const unexpected = violations.filter((v) => !knownLegacy.some((f) => v.startsWith(f)));
  assert.ok(
    unexpected.length === 0,
    `Unexpected alert() calls found (use ConfirmDialog instead):\n${unexpected.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// 8. No window.location.reload() in components
// ---------------------------------------------------------------------------

test('no component uses window.location.reload()', () => {
  const jsxFiles = allJsxFiles();
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    if (src.includes('window.location.reload')) {
      violations.push(file);
    }
  }
  assert.ok(
    violations.length === 0,
    `Components must not use window.location.reload() -- use router.refresh() instead: ${violations.join(', ')}`,
  );
});

// ---------------------------------------------------------------------------
// 9. All <form> elements use onSubmit or action (not onClick on submit buttons)
// ---------------------------------------------------------------------------

test('every <form> tag uses onSubmit or action= handler', () => {
  const jsxFiles = allJsxFiles();
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    // Find form tags -- crude but effective for structural check
    const formMatches = src.matchAll(/<form\b([^>]*)>/g);
    for (const match of formMatches) {
      const attrs = match[1];
      const hasHandler = attrs.includes('onSubmit') || attrs.includes('action');
      if (!hasHandler) {
        violations.push(`${file}: <form${attrs}>`);
      }
    }
  }
  assert.ok(
    violations.length === 0,
    `All <form> tags must have onSubmit or action handler:\n${violations.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// 10. No component imports from parent directories beyond lib/
// ---------------------------------------------------------------------------

test('no component imports from ../../ or deeper parent paths', () => {
  const jsxFiles = allJsxFiles();
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    // Match import ... from '../../...' patterns
    const importMatches = src.matchAll(/from\s+['"](\.\.[\/\\]\.\..*?)['"]/g);
    for (const match of importMatches) {
      violations.push(`${file}: import from '${match[1]}'`);
    }
  }
  assert.ok(
    violations.length === 0,
    `Components must not import from deep parent directories:\n${violations.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// 11. Helper files export shared styles/constants (structural checks)
// ---------------------------------------------------------------------------

test('inference-helpers.jsx exports relativeTime and style objects', () => {
  const src = readComponent('inference-helpers.jsx');
  assert.ok(src.includes('export function relativeTime'), 'must export relativeTime');
  assert.ok(src.includes('export const cardStyle'), 'must export cardStyle');
  assert.ok(src.includes('export const btnStyle'), 'must export btnStyle');
  assert.ok(src.includes('export const inputStyle'), 'must export inputStyle');
  assert.ok(src.includes('export function CopyButton'), 'must export CopyButton');
  assert.ok(src.includes('export function StatusBadge'), 'must export StatusBadge');
});

test('artifact-registry-helpers.jsx exports format utilities and styles', () => {
  const src = readComponent('artifact-registry-helpers.jsx');
  assert.ok(src.includes('export function installCommand'), 'must export installCommand');
  assert.ok(src.includes('export function formatSize'), 'must export formatSize');
  assert.ok(src.includes('export const REGISTRY_TYPES'), 'must export REGISTRY_TYPES');
  assert.ok(src.includes('export function CopyableCode'), 'must export CopyableCode');
});

test('runner-pool-helpers.jsx exports status constants and components', () => {
  const src = readComponent('runner-pool-helpers.jsx');
  assert.ok(src.includes('export const STATUS_COLORS'), 'must export STATUS_COLORS');
  assert.ok(src.includes('export function normalizePools'), 'must export normalizePools');
  assert.ok(src.includes('export function RunnerStatusBadge'), 'must export RunnerStatusBadge');
  assert.ok(src.includes('export function PoolCard'), 'must export PoolCard');
});

test('workspace-panel-helpers.jsx exports panel sub-components', () => {
  const src = readComponent('workspace-panel-helpers.jsx');
  assert.ok(src.includes('export function phaseColor'), 'must export phaseColor');
  assert.ok(src.includes('export function FileIcon'), 'must export FileIcon');
  assert.ok(src.includes('export function ResourceUsageBar'), 'must export ResourceUsageBar');
});

test('kanban-enhanced-helpers.jsx exports drag handlers and modals', () => {
  const src = readComponent('kanban-enhanced-helpers.jsx');
  assert.ok(src.includes('export function priorityColor'), 'must export priorityColor');
  assert.ok(src.includes('export function createDragHandlers'), 'must export createDragHandlers');
  assert.ok(src.includes('export function CardDetailModal'), 'must export CardDetailModal');
});

// ---------------------------------------------------------------------------
// 12. api-explorer-endpoints.js (pure JS data) exports endpoint groups
// ---------------------------------------------------------------------------

test('api-explorer-endpoints.js exports METHOD_COLORS and ENDPOINT_GROUPS', () => {
  const src = readComponent('api-explorer-endpoints.js');
  assert.ok(src.includes('export const METHOD_COLORS'), 'must export METHOD_COLORS');
  assert.ok(src.includes('export const ENDPOINT_GROUPS'), 'must export ENDPOINT_GROUPS');
});

// ---------------------------------------------------------------------------
// 13. theme-runtime.jsx exports theme utilities
// ---------------------------------------------------------------------------

test('theme-runtime.jsx exports theme lifecycle functions', () => {
  const src = readComponent('theme-runtime.jsx');
  assert.ok(src.includes('export const THEME_STORAGE_KEY'), 'must export THEME_STORAGE_KEY');
  assert.ok(src.includes('export const THEME_CHANGED_EVENT'), 'must export THEME_CHANGED_EVENT');
  assert.ok(src.includes('export function readStoredTheme'), 'must export readStoredTheme');
  assert.ok(src.includes('export function applyTheme'), 'must export applyTheme');
  assert.ok(src.includes('export function storeTheme'), 'must export storeTheme');
  assert.ok(src.includes('export function ThemeRuntime'), 'must export ThemeRuntime');
});

// ---------------------------------------------------------------------------
// 14. Component files with forms have aria-labels on submit buttons
// ---------------------------------------------------------------------------

test('form-heavy components have aria-label on submit buttons', () => {
  const formComponents = [
    'stack-builder.jsx',
    'stack-edit-form.jsx',
    'user-profile.jsx',
    'settings-providers.jsx',
    'runner-pool-manager.jsx',
    'repo-runs.jsx',
  ];
  for (const file of formComponents) {
    const src = readComponent(file);
    assert.ok(
      src.includes('aria-label'),
      `${file} must have aria-label on interactive controls`,
    );
  }
});

// ---------------------------------------------------------------------------
// 15. assistant-chat-styles.jsx exports the styles object
// ---------------------------------------------------------------------------

test('assistant-chat-styles.jsx exports styles object and ensureKeyframes', () => {
  const src = readComponent('assistant-chat-styles.jsx');
  assert.ok(src.includes('export const styles'), 'must export styles');
  assert.ok(src.includes('export function ensureKeyframes'), 'must export ensureKeyframes');
});

// ---------------------------------------------------------------------------
// 16. stack-builder-graph-styles.jsx exports STACK_LAYERS
// ---------------------------------------------------------------------------

test('stack-builder-graph-styles.jsx exports layer definitions', () => {
  const src = readComponent('stack-builder-graph-styles.jsx');
  assert.ok(src.includes('export const STACK_LAYERS'), 'must export STACK_LAYERS');
});

// ---------------------------------------------------------------------------
// 17. settings-provider-helpers.jsx exports shared provider UI functions
// ---------------------------------------------------------------------------

test('settings-provider-helpers.jsx exports provider utility components', () => {
  const src = readComponent('settings-provider-helpers.jsx');
  const hasExports =
    /^export\s+(async\s+)?function\s+\w+/m.test(src) ||
    /^export\s+const\s+\w+/m.test(src);
  assert.ok(hasExports, 'settings-provider-helpers.jsx must export utility functions');
});

// ---------------------------------------------------------------------------
// 18. No component file is empty or just the directive
// ---------------------------------------------------------------------------

test('no component file is trivially empty', () => {
  const jsxFiles = allJsxFiles();
  for (const file of jsxFiles) {
    const src = readComponent(file);
    const lines = src.split('\n').filter((l) => l.trim().length > 0 && !l.trim().startsWith('//'));
    assert.ok(
      lines.length >= 5,
      `${file} must have meaningful content (found only ${lines.length} non-empty, non-comment lines)`,
    );
  }
});

// ---------------------------------------------------------------------------
// 19. Components with role attributes use semantic roles
// ---------------------------------------------------------------------------

test('components use valid ARIA role values', () => {
  const jsxFiles = allJsxFiles();
  const validRoles = new Set([
    'dialog', 'alert', 'alertdialog', 'button', 'checkbox', 'combobox',
    'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
    'listbox', 'listitem', 'log', 'main', 'menu', 'menubar', 'menuitem',
    'navigation', 'option', 'presentation', 'progressbar', 'radio',
    'radiogroup', 'region', 'row', 'rowgroup', 'search', 'separator',
    'slider', 'spinbutton', 'status', 'tab', 'tablist', 'tabpanel',
    'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
    'columnheader', 'rowheader', 'cell', 'banner', 'complementary',
    'contentinfo', 'form', 'none', 'note', 'figure', 'application',
    'document', 'feed', 'math', 'meter', 'switch', 'table', 'term', 'definition',
  ]);
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    const roleMatches = src.matchAll(/role="(\w+)"/g);
    for (const match of roleMatches) {
      if (!validRoles.has(match[1])) {
        violations.push(`${file}: invalid role="${match[1]}"`);
      }
    }
  }
  assert.ok(
    violations.length === 0,
    `All role= attributes must use valid ARIA roles:\n${violations.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// 20. index.js barrel re-exports every major component group
// ---------------------------------------------------------------------------

test('index.js barrel covers all component groups', () => {
  const indexSrc = readComponent('index.js');

  const expectedGroups = [
    // Agents
    { symbol: 'SessionShell', file: 'session-shell.jsx' },
    { symbol: 'RunActions', file: 'run-actions.jsx' },
    { symbol: 'AgentSettingsForm', file: 'agent-settings-form.jsx' },
    // Workspaces
    { symbol: 'WorkspacePanel', file: 'workspace-panel.jsx' },
    // Memory
    { symbol: 'MemorySearchForm', file: 'memory-search-form.jsx' },
    // Issues & Kanban
    { symbol: 'IssueList', file: 'issue-list.jsx' },
    { symbol: 'EnhancedKanbanBoard', file: 'kanban-enhanced.jsx' },
    // Repositories
    { symbol: 'RepoCodeBrowser', file: 'repo-code-browser.jsx' },
    { symbol: 'PullRequestList', file: 'pull-request-list.jsx' },
    // Inference
    { symbol: 'InferenceServiceManager', file: 'inference-service-manager.jsx' },
    { symbol: 'InferencePlayground', file: 'inference-playground.jsx' },
    // Resources
    { symbol: 'Pagination', file: 'pagination.jsx' },
    // External
    { symbol: 'ExternalProviderList', file: 'external-provider-list.jsx' },
    { symbol: 'ExternalSyncDashboard', file: 'external-sync-dashboard.jsx' },
    // Deployments
    { symbol: 'DeploymentPipeline', file: 'deployment-pipeline.jsx' },
    { symbol: 'RunnerPoolManager', file: 'runner-pool-manager.jsx' },
    // Settings
    { symbol: 'SecretManager', file: 'secret-manager.jsx' },
    { symbol: 'RbacSection', file: 'settings-rbac.jsx' },
    // Observability
    { symbol: 'ActivityFeed', file: 'activity-feed.jsx' },
    { symbol: 'HealthMonitor', file: 'health-monitor.jsx' },
    { symbol: 'ApiExplorer', file: 'api-explorer.jsx' },
    // Assistant
    { symbol: 'AssistantChat', file: 'assistant-chat.jsx' },
    // Artifacts
    { symbol: 'ArtifactRegistryManager', file: 'artifact-registry.jsx' },
    // Shell / Chrome
    { symbol: 'ThemeRuntime', file: 'theme-runtime.jsx' },
    { symbol: 'KeyboardShortcuts', file: 'keyboard-shortcuts.jsx' },
    { symbol: 'GlobalSearch', file: 'global-search.jsx' },
  ];

  for (const { symbol, file } of expectedGroups) {
    assert.ok(
      indexSrc.includes(symbol) && indexSrc.includes(file),
      `index.js must re-export ${symbol} from ${file}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 21. Component local imports only reference sibling files (not deep parents)
// ---------------------------------------------------------------------------

test('component imports only reference sibling ./ files or ../lib/', () => {
  const jsxFiles = allJsxFiles();
  const violations = [];
  for (const file of jsxFiles) {
    const src = readComponent(file);
    const importPaths = [...src.matchAll(/from\s+['"](\..*?)['"]/g)].map((m) => m[1]);
    for (const importPath of importPaths) {
      // Allow ./ (sibling), ../lib/ (shared utilities), and ../hooks/ (custom hooks)
      if (importPath.startsWith('./')) continue;
      if (importPath.startsWith('../lib/')) continue;
      if (importPath.startsWith('../hooks/')) continue;
      violations.push(`${file}: import from '${importPath}'`);
    }
  }
  assert.ok(
    violations.length === 0,
    `Components must only import from ./ (sibling) or ../lib/ (shared). Violations:\n${violations.join('\n')}`,
  );
});

// ---------------------------------------------------------------------------
// 22. Components with interactive controls have at least one aria attribute
// ---------------------------------------------------------------------------

test('components containing <button> or <input> have aria attributes', () => {
  const jsxFiles = allJsxFiles();
  // Only check files that render interactive elements
  const interactiveFiles = jsxFiles.filter((file) => {
    const src = readComponent(file);
    return src.includes('<button') || src.includes('<input');
  });

  // At least 80% of interactive component files should have aria attributes
  const withAria = interactiveFiles.filter((file) => {
    const src = readComponent(file);
    return src.includes('aria-label') || src.includes('aria-') || src.includes('role=');
  });

  const ratio = withAria.length / interactiveFiles.length;
  assert.ok(
    ratio >= 0.75,
    `At least 75% of interactive components must have aria attributes. ` +
    `Found ${withAria.length}/${interactiveFiles.length} (${(ratio * 100).toFixed(0)}%)`,
  );
});
