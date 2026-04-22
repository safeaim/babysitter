import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ProviderAuth } from './provider-config.js';

export interface ProvidersFile {
  version: number;
  defaults?: {
    provider?: string;
    model?: string;
  };
  profiles: Record<string, ProviderProfileEntry>;
}

export interface ProviderProfileEntry {
  provider?: string;
  model?: string;
  transport?: string;
  auth?: Partial<ProviderAuth>;
  params?: Record<string, unknown>;
}

function tryReadJson(filePath: string): ProvidersFile | null {
  try {
    // Check permissions on non-Windows
    if (process.platform !== 'win32') {
      const stat = fs.statSync(filePath);
      const mode = stat.mode & 0o777;
      if ((mode & 0o077) !== 0) {
        console.error(`Warning: ${filePath} has permissions ${mode.toString(8)} — should be 600. Other users can read your provider credentials.`);
      }
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ProvidersFile;
  } catch {
    return null;
  }
}

/**
 * Load a named profile from ~/.amux/providers.json and .amux/providers.json.
 * Project-level file takes precedence over global.
 */
export function loadProfile(profileName: string): ProviderProfileEntry | null {
  const globalPath = path.join(os.homedir(), '.amux', 'providers.json');
  const projectPath = path.join(process.cwd(), '.amux', 'providers.json');

  const projectFile = tryReadJson(projectPath);
  if (projectFile?.profiles?.[profileName]) {
    return projectFile.profiles[profileName];
  }

  const globalFile = tryReadJson(globalPath);
  if (globalFile?.profiles?.[profileName]) {
    return globalFile.profiles[profileName];
  }

  return null;
}

/**
 * Load default provider settings from providers.json files.
 * Project-level defaults override global defaults.
 */
export function loadProviderDefaults(): ProviderProfileEntry | null {
  const globalPath = path.join(os.homedir(), '.amux', 'providers.json');
  const projectPath = path.join(process.cwd(), '.amux', 'providers.json');

  const globalFile = tryReadJson(globalPath);
  const projectFile = tryReadJson(projectPath);

  const globalDefaults = globalFile?.defaults;
  const projectDefaults = projectFile?.defaults;

  if (!globalDefaults && !projectDefaults) return null;

  return {
    provider: projectDefaults?.provider ?? globalDefaults?.provider,
    model: projectDefaults?.model ?? globalDefaults?.model,
  };
}
