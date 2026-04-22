#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const packages = [
  'packages/agent-mux/observability',
  'packages/agent-mux/core',
  'packages/agent-mux/adapters',
  'packages/agent-mux/harness-mock',
  'packages/agent-mux/ui',
  'packages/agent-mux/gateway',
  'packages/agent-mux/cli',
  'packages/agent-mux/webui',
  'packages/agent-mux/sdk',
  'packages/agent-mux/tui',
];

const mode = process.argv[2] || 'build';

function quote(value) {
  return `"${value.replace(/(["$`\\])/g, '\\$1')}"`;
}

function getTestGlobs(pkg) {
  if (pkg === 'packages/agent-mux/sdk') {
    return ['packages/agent-mux/tests/**/*.test.ts', 'packages/agent-mux/tests/**/*.test.tsx'];
  }

  return [
    `${pkg}/tests/**/*.test.ts`,
    `${pkg}/tests/**/*.test.tsx`,
    `${pkg}/src/**/*.test.ts`,
    `${pkg}/src/**/*.test.tsx`,
  ];
}

for (const pkg of packages) {
  const dir = path.join(repoRoot, pkg);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const scriptName = mode === 'test' ? 'test' : 'build';
  if (mode === 'test') {
    const testGlobs = getTestGlobs(pkg);
    const testFiles = testGlobs.flatMap((pattern) => fs.globSync(pattern, { cwd: repoRoot }));
    if (testFiles.length === 0) {
      console.log(`\n=== ${pkg} (${mode}) skipped: no test files ===`);
      continue;
    }

    console.log(`\n=== ${pkg} (${mode}) ===`);
    try {
      execSync(`npx vitest run --config vitest.config.ts ${testFiles.map(quote).join(' ')}`, {
        cwd: repoRoot,
        stdio: 'inherit',
      });
    } catch {
      process.exit(1);
    }
    continue;
  }

  if (!manifest.scripts?.[scriptName]) {
    console.log(`\n=== ${pkg} (${mode}) skipped: no ${scriptName} script ===`);
    continue;
  }

  console.log(`\n=== ${pkg} (${mode}) ===`);
  try {
    execSync(`npm run ${scriptName}`, { cwd: dir, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}
