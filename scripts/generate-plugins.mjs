#!/usr/bin/env node
// Generate all babysitter target plugins from the unified source
// Usage: node scripts/generate-plugins.mjs [--output <dir>] [--marketplace <path>] [--compare <dir>]

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const UNIFIED_SOURCE = join(ROOT, 'plugins/babysitter-unified');
const DEFAULT_OUTPUT = join(ROOT, 'generated-plugins');
const COMPILER_PKG = join(ROOT, 'packages/unified-plugins');

const args = process.argv.slice(2);
const outputDir = getArg('--output') || DEFAULT_OUTPUT;
const compareDir = getArg('--compare');
const marketplacePath = getArg('--marketplace');

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

// Build the compiler if needed
const distCli = join(COMPILER_PKG, 'dist/cli.js');
if (!existsSync(distCli)) {
  console.log('[generate] Building unified-plugins compiler...');
  execSync('npm run build --workspace=@a5c-ai/unified-plugins', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

// Compile all targets
console.log(`[generate] Source: ${relative(ROOT, UNIFIED_SOURCE)}`);
console.log(`[generate] Output: ${relative(ROOT, outputDir)}`);

const cliArgs = [
  'compile',
  '--target', 'all',
  '--source', UNIFIED_SOURCE,
  '--output', outputDir,
  '--verbose',
];

if (marketplacePath) {
  cliArgs.push('--marketplace', marketplacePath);
}

try {
  execSync(`node ${distCli} ${cliArgs.join(' ')}`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch {
  console.error('[generate] Compilation failed');
  process.exit(1);
}

console.log('[generate] Compilation complete.');

// Compare if requested
if (compareDir) {
  console.log(`\n[compare] Comparing generated output to ${relative(ROOT, compareDir)}`);
  const targets = readdirSync(outputDir).filter(
    (d) => statSync(join(outputDir, d)).isDirectory()
  );

  const ORIGINAL_DIR_MAP = {
    'claude-code': 'plugins/babysitter',
    'codex': 'plugins/babysitter-codex',
    'cursor': 'plugins/babysitter-cursor',
    'gemini': 'plugins/babysitter-gemini',
    'github-copilot': 'plugins/babysitter-github',
    'pi': 'plugins/babysitter-pi',
    'oh-my-pi': 'plugins/babysitter-omp',
    'opencode': 'plugins/babysitter-opencode',
    'openclaw': 'plugins/babysitter-openclaw',
  };

  let totalGaps = 0;

  for (const target of targets) {
    const generatedDir = join(outputDir, target);
    const originalRelPath = ORIGINAL_DIR_MAP[target];
    if (!originalRelPath) continue;

    const originalDir = join(compareDir, originalRelPath);
    if (!existsSync(originalDir)) {
      console.log(`  [${target}] SKIP — original dir not found: ${originalRelPath}`);
      continue;
    }

    const generatedFiles = collectFiles(generatedDir, '');
    const originalFiles = collectFiles(originalDir, '');

    const inGenNotOrig = generatedFiles.filter((f) => !originalFiles.includes(f));
    const inOrigNotGen = originalFiles.filter(
      (f) => !generatedFiles.includes(f) && !isIgnoredFile(f)
    );

    const matching = generatedFiles.filter((f) => originalFiles.includes(f));
    let contentDiffs = 0;
    for (const f of matching) {
      const genContent = readFileSync(join(generatedDir, f), 'utf-8');
      const origContent = readFileSync(join(originalDir, f), 'utf-8');
      if (genContent !== origContent) contentDiffs++;
    }

    const gaps = inGenNotOrig.length + inOrigNotGen.length + contentDiffs;
    totalGaps += gaps;

    if (gaps === 0) {
      console.log(`  [${target}] MATCH ✓ (${matching.length} files)`);
    } else {
      console.log(`  [${target}] GAPS: +${inGenNotOrig.length} new, -${inOrigNotGen.length} missing, ~${contentDiffs} different`);
      if (inGenNotOrig.length > 0) {
        console.log(`    Generated but not in original: ${inGenNotOrig.slice(0, 5).join(', ')}${inGenNotOrig.length > 5 ? ` (+${inGenNotOrig.length - 5} more)` : ''}`);
      }
      if (inOrigNotGen.length > 0) {
        console.log(`    In original but not generated: ${inOrigNotGen.slice(0, 5).join(', ')}${inOrigNotGen.length > 5 ? ` (+${inOrigNotGen.length - 5} more)` : ''}`);
      }
    }
  }

  console.log(`\n[compare] Total gaps: ${totalGaps}`);
  process.exit(totalGaps > 0 ? 1 : 0);
}

function collectFiles(dir, prefix) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

function isIgnoredFile(f) {
  return (
    f.startsWith('node_modules/') ||
    f.startsWith('dist/') ||
    f.startsWith('test/') ||
    f.startsWith('scripts/') ||
    f.startsWith('.claude-plugin/') ||
    f === 'package-lock.json' ||
    f === '.app.json' ||
    f === 'plugin.lock.json' ||
    f === '.npmrc'
  );
}
