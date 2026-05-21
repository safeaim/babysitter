#!/usr/bin/env node
/**
 * Fix broken npm `latest` tags by retagging to the last working version.
 *
 * Catches two problems:
 * 1. Packages where `latest` points to an empty/broken publish (no dist/)
 * 2. Packages where `latest` points to a staging prerelease version
 *
 * Usage:
 *   node scripts/fix-broken-latest-tags.mjs          # dry run
 *   node scripts/fix-broken-latest-tags.mjs --fix     # actually retag
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const FIX = process.argv.includes('--fix');
const MIN_FILES = 5;
const MIN_SIZE = 10000;

const packageDirs = [
  'packages/sdk', 'packages/babysitter', 'packages/babysitter-agent',
  'packages/agent-core', 'packages/agent-catalog', 'packages/atlas',
  'packages/transport-mux', 'packages/extension-mux', 'packages/tasks-mux',
  'packages/triggers', 'packages/cloud', 'packages/observer-dashboard',
  'packages/babysitter-tui-plugins',
  'packages/agent-mux/core', 'packages/agent-mux/cli', 'packages/agent-mux/adapters',
  'packages/agent-mux/gateway', 'packages/agent-mux/tui', 'packages/agent-mux/ui',
  'packages/agent-mux/webui', 'packages/agent-mux',
  'packages/agent-mux/observability',
  'packages/hooks-mux/core', 'packages/hooks-mux/cli',
  'packages/krate/core',
];

const pluginPackageNames = [
  '@a5c-ai/babysitter-pi',
  '@a5c-ai/babysitter-codex',
  '@a5c-ai/babysitter-cursor',
  '@a5c-ai/babysitter-gemini',
  '@a5c-ai/babysitter-github',
  '@a5c-ai/babysitter-omp',
  '@a5c-ai/babysitter-opencode',
  '@a5c-ai/babysitter-openclaw',
];

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim(); } catch { return ''; }
}

function getPackageName(dir) {
  try {
    const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
    return pkg.private ? null : pkg.name;
  } catch { return null; }
}

function isStaging(version) {
  return version.includes('staging') || version.includes('develop');
}

function findLastNonStaging(name, minFiles, minSize) {
  const allVersions = JSON.parse(run(`npm view ${name} versions --json`) || '[]');
  const nonStaging = allVersions.filter(v => !isStaging(v));

  for (let i = nonStaging.length - 1; i >= 0; i--) {
    const v = nonStaging[i];
    if (minFiles > 0 || minSize > 0) {
      const fc = parseInt(run(`npm view ${name}@${v} dist.fileCount`)) || 0;
      const sz = parseInt(run(`npm view ${name}@${v} dist.unpackedSize`)) || 0;
      if (fc >= minFiles && sz >= minSize) {
        return { version: v, fileCount: fc, size: sz };
      }
    } else {
      return { version: v, fileCount: 0, size: 0 };
    }
  }
  return null;
}

function retag(name, version) {
  console.log(`    Retagging: npm dist-tag add ${name}@${version} latest`);
  const result = run(`npm dist-tag add ${name}@${version} latest`);
  console.log(`    Result: ${result || 'done'}`);
}

async function main() {
  const issues = [];

  // Check workspace packages for empty/broken latest
  for (const dir of packageDirs) {
    const name = getPackageName(dir);
    if (!name) continue;

    const latest = run(`npm view ${name}@latest version`);
    if (!latest) continue;

    const fileCount = parseInt(run(`npm view ${name}@${latest} dist.fileCount`)) || 0;
    const size = parseInt(run(`npm view ${name}@${latest} dist.unpackedSize`)) || 0;

    if (fileCount < MIN_FILES || size < MIN_SIZE) {
      const lastGood = findLastNonStaging(name, MIN_FILES, MIN_SIZE);
      issues.push({ name, latest, reason: 'empty', fileCount, size, lastGood });
    } else if (isStaging(latest)) {
      const lastGood = findLastNonStaging(name, MIN_FILES, MIN_SIZE);
      issues.push({ name, latest, reason: 'staging', fileCount, size, lastGood });
    }
  }

  // Check plugin packages for staging latest
  for (const name of pluginPackageNames) {
    const latest = run(`npm view ${name}@latest version`);
    if (!latest) continue;

    if (isStaging(latest)) {
      const lastGood = findLastNonStaging(name, 0, 0);
      const fileCount = parseInt(run(`npm view ${name}@${latest} dist.fileCount`)) || 0;
      const size = parseInt(run(`npm view ${name}@${latest} dist.unpackedSize`)) || 0;
      issues.push({ name, latest, reason: 'staging', fileCount, size, lastGood });
    }
  }

  if (issues.length === 0) {
    console.log('All packages have valid latest tags.');
    return;
  }

  console.log(`Found ${issues.length} package(s) with issues:\n`);
  for (const b of issues) {
    const reasonLabel = b.reason === 'staging' ? 'STAGING on latest' : 'EMPTY/BROKEN';
    console.log(`  ${b.name}@${b.latest} — ${reasonLabel} (${b.fileCount} files, ${b.size} bytes)`);
    if (b.lastGood) {
      console.log(`    Best non-staging: ${b.lastGood.version}${b.lastGood.fileCount ? ` (${b.lastGood.fileCount} files, ${b.lastGood.size} bytes)` : ''}`);
      if (FIX) {
        retag(b.name, b.lastGood.version);
      } else {
        console.log(`    Would run: npm dist-tag add ${b.name}@${b.lastGood.version} latest`);
      }
    } else {
      console.log(`    No working non-staging version found!`);
    }
    console.log();
  }

  if (!FIX) {
    console.log('Dry run — pass --fix to actually retag.');
  }
}

main().catch(console.error);
