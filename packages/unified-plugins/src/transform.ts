// Stage 3: TRANSFORM - Transform components to target format

import * as fs from 'fs';
import * as path from 'path';
import type {
  A5cPluginManifest,
  TargetProfile,
  TransformResult,
  TransformedFile,
  Diagnostic,
} from './types.js';
import {
  buildSkillFromCommand,
  markdownToToml,
} from './utils.js';

// Manifest generators
import {
  generateClaudeCodeManifest,
  generateCodexManifest,
  generateCursorManifest,
  generateGeminiManifest,
  generateGithubCopilotManifest,
  generatePiManifest,
  generateOhMyPiManifest,
  generateOpenCodeManifest,
  generateOpenClawManifest,
} from './manifestGenerators.js';

// Hook registration generators
import {
  generateClaudeCodeHooksJson,
  generateCodexHooksJson,
  generateCursorHooksJson,
  generateGeminiHooksJson,
  generateGithubCopilotHooksJson,
  generateOpenCodeHooksJson,
  generateOpenClawHooksJson,
} from './hookRegistration.js';

// Programmatic extension generator
import {
  generateProgrammaticExtension,
} from './proxiedHookTemplates.js';

// Bin script templates for npm-cli distribution
import {
  generateCliBinScript,
  generateInstallScript,
  generateUninstallScript,
} from './binTemplates.js';

// Installation instructions
import { generateInstallInstructions } from './installInstructions.js';

export function transform(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile
): TransformResult {
  const files: TransformedFile[] = [];
  const diagnostics: Diagnostic[] = [];

  // Transform commands
  const commandFiles = transformCommands(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...commandFiles);

  // Transform skills
  const skillFiles = transformSkills(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...skillFiles);

  // Transform hooks
  const hookFiles = transformHooks(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...hookFiles);

  // Generate manifests
  const manifestFiles = generateManifests(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...manifestFiles);

  // Copy context files
  const contextFiles = copyContextFiles(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...contextFiles);

  // Copy included files (versions.json, assets, etc.) — skip hooks/ since transformHooks handles those
  const includedFiles = copyIncludedFiles(sourceDir, manifest, ['hooks/', 'hooks']);
  files.push(...includedFiles);

  // Generate extra files (Pi/oh-my-pi extensions, etc.)
  const extraFiles = generateExtraFiles(sourceDir, manifest, targetProfile, diagnostics);
  files.push(...extraFiles);

  return { files, diagnostics };
}

function transformCommands(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  if (targetProfile.commandFormat === 'none') {
    return files;
  }

  if (!manifest.commands) {
    return files;
  }

  const commandPaths: string[] = [];
  if (typeof manifest.commands === 'string') {
    // Directory path - glob all .md files
    const commandDir = path.join(sourceDir, manifest.commands);
    if (fs.existsSync(commandDir)) {
      const entries = fs.readdirSync(commandDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          commandPaths.push(path.join(manifest.commands, entry));
        }
      }
    }
  } else {
    commandPaths.push(...manifest.commands);
  }

  for (const cmdPath of commandPaths) {
    const fullPath = path.join(sourceDir, cmdPath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    if (targetProfile.commandFormat === 'toml') {
      // Convert to TOML (Gemini)
      const tomlContent = markdownToToml(content);
      const basename = path.basename(cmdPath, '.md');
      files.push({
        path: `commands/${basename}.toml`,
        content: tomlContent,
      });
    } else {
      // Copy as-is (Markdown)
      files.push({
        path: cmdPath,
        content,
      });
    }
  }

  return files;
}

function transformSkills(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  if (targetProfile.skillHandling === 'none') {
    return files;
  }

  // Always copy standalone skills
  if (manifest.skills && Array.isArray(manifest.skills)) {
    for (const skill of manifest.skills) {
      const fullPath = path.join(sourceDir, skill.file);
      if (fs.existsSync(fullPath)) {
        files.push({
          path: skill.file,
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
  }

  // Derive skills from commands if needed
  if (targetProfile.skillHandling === 'derived-from-commands') {
    const commandPaths = getCommandPaths(sourceDir, manifest);

    // Build set of standalone skill names to avoid duplicating them
    const standaloneSkillNames = new Set<string>();
    if (manifest.skills && Array.isArray(manifest.skills)) {
      for (const skill of manifest.skills) {
        standaloneSkillNames.add(skill.name);
      }
    }

    for (const cmdPath of commandPaths) {
      const fullPath = path.join(sourceDir, cmdPath);
      if (!fs.existsSync(fullPath)) continue;

      const basename = path.basename(cmdPath, '.md');

      if (standaloneSkillNames.has(basename)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const derivedSkill = buildSkillFromCommand(basename, content);

      files.push({
        path: `skills/${basename}/SKILL.md`,
        content: derivedSkill,
      });
    }
  }

  return files;
}

function getCommandPaths(
  sourceDir: string,
  manifest: A5cPluginManifest
): string[] {
  if (!manifest.commands) return [];

  const commandPaths: string[] = [];
  if (typeof manifest.commands === 'string') {
    const commandDir = path.join(sourceDir, manifest.commands);
    if (fs.existsSync(commandDir)) {
      const entries = fs.readdirSync(commandDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          commandPaths.push(path.join(manifest.commands, entry));
        }
      }
    }
  } else {
    commandPaths.push(...manifest.commands);
  }

  return commandPaths;
}

function transformHooks(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  if (!manifest.hooks || targetProfile.supportedHooks.size === 0) {
    return files;
  }

  const isProgrammatic = targetProfile.adapterFamily === 'programmatic';
  const override = manifest.targets?.[targetProfile.name];
  const hookFilePattern = typeof override?.hookFilePattern === 'string'
    ? override.hookFilePattern : undefined;
  const slugify = (s: string) => s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  for (const [canonicalHook, handlerValue] of Object.entries(manifest.hooks)) {
    if (handlerValue === null) continue;

    const nativeHook = targetProfile.supportedHooks.get(canonicalHook);
    if (!nativeHook) continue;

    if (typeof handlerValue !== 'string' || handlerValue === 'proxy') continue;

    const hookSlug = slugify(canonicalHook);
    const sourceScript = path.join(sourceDir, handlerValue);
    if (!fs.existsSync(sourceScript)) continue;

    const content = fs.readFileSync(sourceScript, 'utf-8');

    // Determine output filename
    let outName: string;
    if (hookFilePattern) {
      outName = hookFilePattern
        .replace(/\{\{name\}\}/g, manifest.name)
        .replace(/\{\{slug\}\}/g, hookSlug);
    } else {
      outName = path.basename(handlerValue);
    }

    // Copy bash script with renamed filename
    files.push({
      path: `hooks/${outName}`,
      content,
      executable: true,
    });

    // Generate PowerShell variant for targets that use powershell
    if (targetProfile.scriptVariants.includes('powershell')) {
      const ps1Name = outName.replace(/\.sh$/, '.ps1');
      files.push({
        path: `hooks/${ps1Name}`,
        content: generatePs1Wrapper(hookSlug, targetProfile.adapterName, handlerValue),
        executable: false,
      });
    }

    // Generate JS bridge for programmatic targets
    if (isProgrammatic) {
      const jsName = outName.replace(/\.sh$/, '.js');
      files.push({
        path: `hooks/${jsName}`,
        content: generateJsBridge(jsName.replace(/\.js$/, ''), handlerValue, targetProfile),
        executable: true,
      });
    }
  }

  // Generate hook registration file for shell-hook targets
  if (targetProfile.hookRegistrationFormat) {
    const hookRegFile = generateHookRegistrationFile(
      manifest,
      targetProfile,
      diagnostics
    );
    if (hookRegFile) {
      files.push(hookRegFile);
    }
  }

  return files;
}

function generatePs1Wrapper(
  hookSlug: string,
  adapterName: string,
  _sourceScript: string
): string {
  return `# PowerShell hook wrapper — sets env vars and delegates to bash
$env:HOOK_TYPE = '${hookSlug}'
$env:ADAPTER_NAME = '${adapterName}'
$env:PLUGIN_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$input_data = [Console]::In.ReadToEnd()
$result = $input_data | & bash "$PSScriptRoot/../$($MyInvocation.MyCommand.Name -replace '\\.ps1$','.sh')" 2>$null
if ($LASTEXITCODE -eq 0 -and $result) {
  Write-Output $result
} else {
  Write-Output '{}'
}
`;
}

function generateJsBridge(
  _name: string,
  shellScript: string,
  targetProfile: TargetProfile
): string {
  const pluginRootEnvVar = targetProfile.pluginRootEnvVarForExtension || 'PLUGIN_ROOT';
  return `#!/usr/bin/env node
"use strict";
var execSync = require("child_process").execSync;
var path = require("path");
var readFileSync = require("fs").readFileSync;

var PLUGIN_ROOT = process.env.${pluginRootEnvVar} || process.env.PLUGIN_ROOT || path.resolve(__dirname, "..");
var stdin = "";
try { stdin = readFileSync(0, "utf8"); } catch {}
try {
  var result = execSync("bash " + JSON.stringify(path.join(PLUGIN_ROOT, "${shellScript}")), {
    input: stdin,
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 30000,
    env: Object.assign({}, process.env, {
      HOOK_TYPE: process.env.HOOK_TYPE || "",
      ADAPTER_NAME: process.env.ADAPTER_NAME || "${targetProfile.adapterName}",
      PLUGIN_ROOT: PLUGIN_ROOT
    })
  });
  process.stdout.write(result);
} catch (e) {
  process.stdout.write("{}\\n");
}
`;
}

function generateHarnessManifest(
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile
): string {
  const override = manifest.targets?.[targetProfile.name];
  const base: Record<string, unknown> = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
  };

  if (manifest.repository) base.repository = manifest.repository;
  if (manifest.keywords) base.keywords = manifest.keywords;

  // Merge harnessManifest from target override (rich metadata like interface, branding)
  if (override?.harnessManifest) {
    Object.assign(base, override.harnessManifest);
  }

  return JSON.stringify(base, null, 2);
}

function generateInstallShared(
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile
): string {
  // Determine target-specific paths
  let globalPluginDir: string;
  let marketplaceRelPath: string;
  switch (targetProfile.name) {
    case 'codex':
      globalPluginDir = `path.join(os.homedir(), '.agents', 'plugins', PLUGIN_NAME)`;
      marketplaceRelPath = `path.join(os.homedir(), '.agents', 'plugins', 'marketplace.json')`;
      break;
    case 'cursor':
      globalPluginDir = `path.join(os.homedir(), '.cursor', 'plugins', PLUGIN_NAME)`;
      marketplaceRelPath = `path.join(os.homedir(), '.cursor', 'plugins', 'marketplace.json')`;
      break;
    default:
      globalPluginDir = `path.join(os.homedir(), '.a5c', 'plugins', PLUGIN_NAME)`;
      marketplaceRelPath = `path.join(os.homedir(), '.a5c', 'plugins', 'marketplace.json')`;
      break;
  }

  return `#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var PLUGIN_NAME = ${JSON.stringify(manifest.name)};

function getPluginHome(scope) {
  if (scope === 'workspace') return path.join(process.cwd(), '.a5c', 'plugins', PLUGIN_NAME);
  return ${globalPluginDir};
}

function getMarketplacePath() {
  return ${marketplaceRelPath};
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  var entries = fs.readdirSync(src, { withFileTypes: true });
  for (var entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'test') continue;
    var srcPath = path.join(src, entry.name);
    var destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function ensureMarketplaceEntry(marketplacePath, pluginRoot) {
  var marketplace;
  if (fs.existsSync(marketplacePath)) {
    marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
  } else {
    marketplace = { name: ${JSON.stringify(typeof manifest.author === 'string' ? manifest.author : manifest.author.name)}, plugins: [] };
  }
  if (!Array.isArray(marketplace.plugins)) marketplace.plugins = [];
  var idx = marketplace.plugins.findIndex(function(p) { return p.name === PLUGIN_NAME; });
  var entry = { name: PLUGIN_NAME, source: pluginRoot, description: ${JSON.stringify(manifest.description)}, version: ${JSON.stringify(manifest.version)} };
  if (idx >= 0) marketplace.plugins[idx] = entry;
  else marketplace.plugins.push(entry);
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\\n');
}

function runPostInstall(pluginRoot) {
  var postInstall = path.join(pluginRoot, 'scripts', 'post-install.js');
  if (fs.existsSync(postInstall)) {
    require('child_process').spawnSync(process.execPath, [postInstall], {
      cwd: pluginRoot, stdio: 'inherit',
      env: Object.assign({}, process.env, { PLUGIN_ROOT: pluginRoot })
    });
  }
}

module.exports = { PLUGIN_NAME, getPluginHome, getMarketplacePath, copyDir, ensureMarketplaceEntry, runPostInstall };
`;
}

function generateTeamInstall(
  manifest: A5cPluginManifest,
  _targetProfile: TargetProfile
): string {
  return `#!/usr/bin/env node
'use strict';

var path = require('path');
var shared = require('../bin/install-shared');

var workspace = process.cwd();
for (var i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--workspace' && process.argv[i + 1]) {
    workspace = path.resolve(process.argv[i + 1]);
  }
}

var dest = shared.getPluginHome('workspace');
console.log('[${manifest.name}] Team install to ' + dest);

var src = process.env.PLUGIN_PACKAGE_ROOT || path.resolve(__dirname, '..');
shared.copyDir(src, dest);
shared.runPostInstall(dest);
console.log('[${manifest.name}] Team install complete.');
`;
}

function generateHookRegistrationFile(
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile | null {
  let content = '';
  let filePath = '';

  switch (targetProfile.hookRegistrationFormat) {
    case 'claude-code':
      content = generateClaudeCodeHooksJson(manifest, targetProfile);
      filePath = 'hooks.json';
      break;
    case 'codex':
      content = generateCodexHooksJson(manifest, targetProfile);
      filePath = 'hooks.json';
      break;
    case 'cursor':
      content = generateCursorHooksJson(manifest, targetProfile);
      filePath = 'hooks/hooks-cursor.json';
      break;
    case 'gemini':
      content = generateGeminiHooksJson(manifest, targetProfile);
      filePath = 'hooks/hooks.json';
      break;
    case 'github-copilot':
      content = generateGithubCopilotHooksJson(manifest, targetProfile);
      filePath = 'hooks.json';
      break;
    case 'opencode':
      content = generateOpenCodeHooksJson(manifest, targetProfile);
      filePath = 'hooks/hooks.json';
      break;
    case 'openclaw':
      content = generateOpenClawHooksJson(manifest, targetProfile);
      filePath = 'hooks.json';
      break;
    default:
      return null;
  }

  return { path: filePath, content };
}

function generateManifests(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  switch (targetProfile.name) {
    case 'claude-code': {
      const ccManifest = generateClaudeCodeManifest(manifest);
      files.push({ path: 'plugin.json', content: ccManifest });
      files.push({ path: '.claude-plugin/plugin.json', content: ccManifest });
      break;
    }
    case 'codex': {
      const codexPkg = generateCodexManifest(manifest);
      files.push({ path: 'package.json', content: codexPkg });
      files.push({ path: '.codex-plugin/plugin.json', content: generateHarnessManifest(manifest, targetProfile) });
      files.push({ path: '.app.json', content: JSON.stringify({ apps: {} }, null, 2) });
      break;
    }
    case 'cursor': {
      const cursorManifest = generateCursorManifest(manifest);
      files.push({ path: 'plugin.json', content: cursorManifest });
      files.push({ path: '.cursor-plugin/plugin.json', content: generateHarnessManifest(manifest, targetProfile) });
      break;
    }
    case 'gemini':
      files.push({
        path: 'plugin.json',
        content: generateGeminiManifest(manifest),
      });
      files.push({
        path: 'gemini-extension.json',
        content: JSON.stringify(
          {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            contextFileName: 'GEMINI.md',
            settings: [],
          },
          null,
          2
        ),
      });
      break;
    case 'github-copilot': {
      const copilotManifest = generateGithubCopilotManifest(manifest);
      files.push({
        path: 'plugin.json',
        content: copilotManifest,
      });
      files.push({
        path: '.github/plugin.json',
        content: copilotManifest,
      });
      break;
    }
    case 'pi':
      files.push({
        path: 'package.json',
        content: generatePiManifest(manifest),
      });
      break;
    case 'oh-my-pi':
      files.push({
        path: 'package.json',
        content: generateOhMyPiManifest(manifest),
      });
      break;
    case 'opencode':
      files.push({
        path: 'plugin.json',
        content: generateOpenCodeManifest(manifest),
      });
      break;
    case 'openclaw':
      files.push({
        path: 'plugin.json',
        content: generateOpenClawManifest(manifest),
      });
      files.push({
        path: 'openclaw.plugin.json',
        content: JSON.stringify(
          {
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            entrypoint: 'extensions/index.ts',
            hooks: generateOpenClawNativeHooksSection(manifest, targetProfile),
            capabilities: ['orchestration', 'process-management', 'human-in-the-loop'],
          },
          null,
          2
        ),
      });
      break;
  }

  return files;
}

function generateOpenClawNativeHooksSection(
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile
): Record<string, string> {
  const hooks: Record<string, string> = {};

  if (manifest.hooks) {
    for (const [canonicalHook, handlerPath] of Object.entries(manifest.hooks)) {
      if (handlerPath === null) continue;

      const nativeHook = targetProfile.supportedHooks.get(canonicalHook);
      if (nativeHook) {
        hooks[nativeHook] = `extensions/hooks/${nativeHook.replace(/_/g, '-')}.ts`;
      }
    }
  }

  return hooks;
}

function copyContextFiles(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  if (!manifest.contextFiles) {
    return files;
  }

  const contextPath = manifest.contextFiles[targetProfile.name];
  if (contextPath) {
    const fullPath = path.join(sourceDir, contextPath);
    if (fs.existsSync(fullPath)) {
      const basename = path.basename(contextPath);
      files.push({
        path: basename,
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }

  return files;
}

function copyIncludedFiles(
  sourceDir: string,
  manifest: A5cPluginManifest,
  excludePatterns: string[] = []
): TransformedFile[] {
  const files: TransformedFile[] = [];

  if (!manifest.include || manifest.include.length === 0) {
    return files;
  }

  for (const pattern of manifest.include) {
    if (excludePatterns.some(ex => pattern === ex || pattern.startsWith(ex))) continue;

    if (!pattern.includes('*')) {
      const fullPath = path.join(sourceDir, pattern);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          files.push({
            path: pattern,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        } else if (stat.isDirectory()) {
          collectDir(sourceDir, pattern, files);
        }
      }
      continue;
    }

    // Simple *.ext glob in a directory
    const dir = path.dirname(pattern);
    const ext = path.extname(pattern);
    const fullDir = path.join(sourceDir, dir);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      for (const entry of fs.readdirSync(fullDir)) {
        if (ext && !entry.endsWith(ext)) continue;
        const entryPath = path.join(dir, entry);
        const fullEntry = path.join(sourceDir, entryPath);
        if (fs.statSync(fullEntry).isFile()) {
          files.push({
            path: entryPath,
            content: fs.readFileSync(fullEntry, 'utf-8'),
          });
        }
      }
    }
  }

  return files;
}

function collectDir(
  sourceDir: string,
  relDir: string,
  files: TransformedFile[]
): void {
  const fullDir = path.join(sourceDir, relDir);
  for (const entry of fs.readdirSync(fullDir)) {
    const relPath = path.join(relDir, entry);
    const fullPath = path.join(sourceDir, relPath);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      files.push({
        path: relPath,
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    } else if (stat.isDirectory()) {
      collectDir(sourceDir, relPath, files);
    }
  }
}

function generateExtraFiles(
  sourceDir: string,
  manifest: A5cPluginManifest,
  targetProfile: TargetProfile,
  _diagnostics: Diagnostic[]
): TransformedFile[] {
  const files: TransformedFile[] = [];

  // Generate programmatic extensions (Pi, oh-my-pi, and other programmatic targets)
  if (targetProfile.adapterFamily === 'programmatic') {
    const cmdPaths = getCommandPaths(sourceDir, manifest);
    const extensionsContent = generateProgrammaticExtension(manifest, targetProfile, cmdPaths);
    files.push({
      path: 'extensions/index.ts',
      content: extensionsContent,
    });
  }

  // Generate CLI bin scripts for npm-cli distribution targets
  if (targetProfile.distribution === 'npm-cli' || targetProfile.distribution === 'both') {
    files.push({
      path: 'bin/cli.js',
      content: generateCliBinScript(manifest, targetProfile),
      executable: true,
    });
    files.push({
      path: 'bin/install.js',
      content: generateInstallScript(manifest, targetProfile),
      executable: true,
    });
    files.push({
      path: 'bin/uninstall.js',
      content: generateUninstallScript(manifest, targetProfile),
      executable: true,
    });
  }

  // Generate installation instructions for all targets
  files.push({
    path: 'README.md',
    content: generateInstallInstructions(manifest, targetProfile, sourceDir),
  });

  // .gitignore
  files.push({
    path: '.gitignore',
    content: 'node_modules/\ndist/\n*.log\n.DS_Store\n',
  });

  // Install infrastructure for npm-publishable targets
  if (targetProfile.distribution === 'npm-cli' || targetProfile.distribution === 'both') {
    files.push({
      path: 'bin/install-shared.js',
      content: generateInstallShared(manifest, targetProfile),
    });
    files.push({
      path: 'scripts/team-install.js',
      content: generateTeamInstall(manifest, targetProfile),
      executable: true,
    });
  }

  // Emit target-override extraFiles
  const targetOverride = manifest.targets?.[targetProfile.name];
  if (targetOverride?.extraFiles) {
    for (const [outputPath, value] of Object.entries(targetOverride.extraFiles)) {
      if (value.startsWith('file:')) {
        const srcPath = value.slice(5);
        const fullPath = path.join(sourceDir, srcPath);
        if (fs.existsSync(fullPath)) {
          files.push({
            path: outputPath,
            content: fs.readFileSync(fullPath, 'utf-8'),
          });
        }
      } else {
        files.push({ path: outputPath, content: value });
      }
    }
  }

  // Copy postInstall script if defined
  if (manifest.postInstall) {
    const postInstallPath = path.join(sourceDir, manifest.postInstall);
    if (fs.existsSync(postInstallPath)) {
      files.push({
        path: 'scripts/post-install.js',
        content: fs.readFileSync(postInstallPath, 'utf-8'),
        executable: true,
      });
    }
  }

  // Generate OpenCode accomplish-skills
  if (targetProfile.name === 'opencode') {
    const accomplishSkill = generateOpenCodeAccomplishSkill(manifest);
    if (accomplishSkill) {
      files.push({
        path: `accomplish-skills/${manifest.name}/SKILL.md`,
        content: accomplishSkill,
      });
    }
  }

  return files;
}

function generateOpenCodeAccomplishSkill(
  manifest: A5cPluginManifest
): string | null {
  if (!manifest.skills || manifest.skills.length === 0) return null;

  const primarySkill = manifest.skills[0];

  return `---
name: ${manifest.name}
description: ${manifest.description}
command: /${primarySkill.name}
verified: true
---

# ${manifest.name}

${manifest.description}

(This is a specialized accomplish-mode variant for OpenCode's accomplish workflow.)
`;
}
