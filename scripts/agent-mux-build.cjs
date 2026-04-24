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
const targetPackage = process.argv[3];

function selectPackages(mode, targetPackage) {
  if (!targetPackage) {
    return packages;
  }

  const targetIndex = packages.indexOf(targetPackage);
  if (targetIndex === -1) {
    console.error(`Unknown agent-mux package target: ${targetPackage}`);
    process.exit(1);
  }

  return mode === 'build' ? packages.slice(0, targetIndex + 1) : [targetPackage];
}

function quote(value) {
  return `"${value.replace(/(["$`\\])/g, '\\$1')}"`;
}

function collectTestFiles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
      continue;
    }

    files.push(path.relative(repoRoot, fullPath).split(path.sep).join('/'));
  }

  return files;
}

function getTestRoots(pkg) {
  if (pkg === 'packages/agent-mux/sdk') {
    return ['packages/agent-mux/tests', `${pkg}/tests`, `${pkg}/src`];
  }

  return [
    `${pkg}/tests`,
    `${pkg}/src`,
  ];
}

for (const pkg of selectPackages(mode, targetPackage)) {
  const dir = path.join(repoRoot, pkg);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const scriptName = mode === 'test' ? 'test' : (manifest.scripts?.['build:local'] ? 'build:local' : 'build');
  if (mode === 'test') {
    const testFiles = [...new Set(getTestRoots(pkg).flatMap((root) => collectTestFiles(path.join(repoRoot, root))))];
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
