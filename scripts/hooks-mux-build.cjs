#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const packages = [
  'packages/hooks-mux/core',
  'packages/hooks-mux/cli',
  'packages/hooks-mux/adapter-claude',
  'packages/hooks-mux/adapter-codex',
  'packages/hooks-mux/adapter-gemini',
  'packages/hooks-mux/adapter-copilot',
  'packages/hooks-mux/adapter-cursor',
  'packages/hooks-mux/adapter-pi',
  'packages/hooks-mux/adapter-oh-my-pi',
  'packages/hooks-mux/adapter-opencode',
  'packages/hooks-mux/adapter-openclaw',
];

const mode = process.argv[2] || 'build';

for (const pkg of packages) {
  const dir = path.resolve(__dirname, '..', pkg);
  const cmd = mode === 'test' ? 'npx vitest run' : mode === 'lint' ? 'npx eslint "src/**/*.ts" --max-warnings=0' : 'npx tsc -p tsconfig.json';
  console.log(`\n=== ${pkg} (${mode}) ===`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}
