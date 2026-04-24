#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const INSTALL_SCRIPT = path.join(PACKAGE_ROOT, 'bin', 'install.js');
const UNINSTALL_SCRIPT = path.join(PACKAGE_ROOT, 'bin', 'uninstall.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function runNode(scriptPath, env) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.status !== 0) {
    throw new Error(
      `${path.basename(scriptPath)} failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
}

function assertManagedHookEntries(hooksConfig) {
  for (const [eventName, scriptName] of [
    ['sessionStart', 'babysitter-proxied-session-start.sh'],
    ['sessionEnd', 'babysitter-proxied-session-end.sh'],
    ['userPromptSubmitted', 'babysitter-proxied-user-prompt-submitted.sh'],
  ]) {
    const entries = hooksConfig.hooks[eventName];
    assert(Array.isArray(entries), `expected ${eventName} hook entries`);
    assert(
      entries.some((entry) => String(entry && entry.bash || '').includes(scriptName)),
      `expected managed ${eventName} hook entry`,
    );
  }
}

function assertNoManagedHookEntries(hooksConfig) {
  const serialized = JSON.stringify(hooksConfig);
  for (const scriptName of [
    'babysitter-proxied-session-start.sh',
    'babysitter-proxied-session-end.sh',
    'babysitter-proxied-user-prompt-submitted.sh',
  ]) {
    assert(!serialized.includes(scriptName), `did not expect managed hook reference ${scriptName}`);
  }
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'babysitter-gh-install-'));
  const copilotHome = path.join(tempRoot, '.copilot');
  const pluginRoot = path.join(copilotHome, 'plugins', 'babysitter');
  const marketplacePath = path.join(tempRoot, 'marketplace.json');
  const hooksDir = path.join(copilotHome, 'hooks');
  const hooksConfigPath = path.join(copilotHome, 'hooks.json');
  const configPath = path.join(copilotHome, 'config.json');

  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(
    hooksConfigPath,
    JSON.stringify({
      version: 1,
      hooks: {
        sessionStart: [
          { type: 'command', bash: './hooks/custom.sh' },
        ],
      },
    }, null, 2) + '\n',
    'utf8',
  );

  const env = {
    COPILOT_HOME: copilotHome,
    BABYSITTER_GITHUB_MARKETPLACE_PATH: marketplacePath,
  };

  runNode(INSTALL_SCRIPT, env);

  assert(fs.existsSync(pluginRoot), 'expected plugin root to be installed');
  assert(fs.existsSync(configPath), 'expected Copilot config.json to be created');
  assert(fs.existsSync(hooksConfigPath), 'expected Copilot hooks.json to be created');
  assert(fs.existsSync(path.join(hooksDir, 'babysitter-proxied-session-start.sh')), 'expected session-start hook script');
  assert(fs.existsSync(path.join(hooksDir, 'babysitter-proxied-session-end.sh')), 'expected session-end hook script');
  assert(fs.existsSync(path.join(hooksDir, 'babysitter-proxied-user-prompt-submitted.sh')), 'expected user-prompt-submitted hook script');

  const config = readJson(configPath);
  assert(Array.isArray(config.plugins), 'expected config.plugins array');
  assert(
    config.plugins.some((entry) => entry && entry.path === pluginRoot && entry.enabled === true),
    'expected plugin to be registered in config.json',
  );

  const hooksConfig = readJson(hooksConfigPath);
  assertManagedHookEntries(hooksConfig);
  assert(
    hooksConfig.hooks.sessionStart.some((entry) => entry && entry.bash === './hooks/custom.sh'),
    'expected existing custom hook to be preserved',
  );

  const marketplace = readJson(marketplacePath);
  assert(
    Array.isArray(marketplace.plugins) && marketplace.plugins.some((entry) => entry && entry.name === 'babysitter'),
    'expected marketplace entry for babysitter',
  );

  const mode = fs.statSync(path.join(hooksDir, 'babysitter-proxied-session-start.sh')).mode & 0o777;
  assert((mode & 0o111) !== 0, 'expected installed shell hook to be executable');

  runNode(UNINSTALL_SCRIPT, env);

  assert(!fs.existsSync(pluginRoot), 'expected plugin root to be removed on uninstall');

  const configAfterUninstall = readJson(configPath);
  assert(
    Array.isArray(configAfterUninstall.plugins) && !configAfterUninstall.plugins.some((entry) => entry && entry.path === pluginRoot),
    'expected plugin registration to be removed on uninstall',
  );

  const hooksAfterUninstall = readJson(hooksConfigPath);
  assertNoManagedHookEntries(hooksAfterUninstall);
  assert(
    hooksAfterUninstall.hooks.sessionStart.some((entry) => entry && entry.bash === './hooks/custom.sh'),
    'expected custom hook entry to remain after uninstall',
  );

  const marketplaceAfterUninstall = readJson(marketplacePath);
  assert(
    Array.isArray(marketplaceAfterUninstall.plugins) && !marketplaceAfterUninstall.plugins.some((entry) => entry && entry.name === 'babysitter'),
    'expected marketplace entry to be removed on uninstall',
  );

  fs.rmSync(tempRoot, { recursive: true, force: true });
  console.log('install surface test passed');
}

main();
