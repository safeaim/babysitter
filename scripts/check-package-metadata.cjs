#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`Metadata verification failed: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    fail(`Unable to read ${relativePath}: ${error.message}`);
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} expected ${JSON.stringify(expected)} but found ${JSON.stringify(actual)}`);
  }
}

const rootManifest = readJson('package.json');
expectEqual(rootManifest.private, true, 'package.json private');
expectEqual(rootManifest.license, 'MIT', 'package.json license');

const publicCorePackages = [
  'packages/sdk/package.json',
  'packages/babysitter/package.json',
  'packages/babysitter-agent/package.json',
  'packages/breakpoints-mux/package.json',
];

const publicPluginPackages = [
  'plugins/babysitter-codex/package.json',
  'plugins/babysitter-github/package.json',
  'plugins/babysitter-gemini/package.json',
  'plugins/babysitter-openclaw/package.json',
  'plugins/babysitter-pi/package.json',
];

for (const relativePath of [...publicCorePackages, ...publicPluginPackages]) {
  const manifest = readJson(relativePath);
  expectEqual(manifest.private, undefined, `${relativePath} private`);
  expectEqual(manifest.license, 'MIT', `${relativePath} license`);
  expectEqual(manifest.publishConfig && manifest.publishConfig.access, 'public', `${relativePath} publishConfig.access`);
}

console.log('Metadata verification passed.');
