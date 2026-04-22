import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { loadProfile, loadProviderDefaults } from '../src/provider-profiles.js';

vi.mock('node:fs');
vi.mock('node:os');

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);

beforeEach(() => {
  mockOs.homedir.mockReturnValue('/home/testuser');
  mockFs.statSync.mockReturnValue({ mode: 0o600 } as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadProfile', () => {
  it('returns null when no files exist', () => {
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(loadProfile('nonexistent')).toBeNull();
  });

  it('loads profile from global file', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('.amux')) {
        if (p.includes('testuser')) {
          return JSON.stringify({
            version: 1,
            profiles: {
              'work-bedrock': {
                provider: 'bedrock',
                model: 'anthropic.claude-sonnet-4-v1:0',
                params: { region: 'us-east-1' },
              },
            },
          });
        }
      }
      throw new Error('ENOENT');
    });

    const profile = loadProfile('work-bedrock');
    expect(profile).not.toBeNull();
    expect(profile!.provider).toBe('bedrock');
    expect(profile!.params!['region']).toBe('us-east-1');
  });

  it('project file takes precedence over global', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('testuser')) {
        return JSON.stringify({
          version: 1,
          profiles: { myprofile: { provider: 'anthropic', model: 'global-model' } },
        });
      }
      // Project file
      return JSON.stringify({
        version: 1,
        profiles: { myprofile: { provider: 'bedrock', model: 'project-model' } },
      });
    });

    const profile = loadProfile('myprofile');
    expect(profile!.provider).toBe('bedrock');
    expect(profile!.model).toBe('project-model');
  });

  it('returns null when profile name not found in files', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('testuser')) {
        return JSON.stringify({
          version: 1,
          profiles: { 'other-profile': { provider: 'anthropic' } },
        });
      }
      throw new Error('ENOENT');
    });

    expect(loadProfile('nonexistent')).toBeNull();
  });
});

describe('loadProviderDefaults', () => {
  it('returns null when no files exist', () => {
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    expect(loadProviderDefaults()).toBeNull();
  });

  it('loads defaults from global file', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      if (String(filePath).includes('home')) {
        return JSON.stringify({
          version: 1,
          defaults: { provider: 'bedrock', model: 'my-default' },
          profiles: {},
        });
      }
      throw new Error('ENOENT');
    });

    const defaults = loadProviderDefaults();
    expect(defaults!.provider).toBe('bedrock');
    expect(defaults!.model).toBe('my-default');
  });

  it('project defaults override global defaults', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('testuser')) {
        return JSON.stringify({
          version: 1,
          defaults: { provider: 'anthropic', model: 'global-model' },
          profiles: {},
        });
      }
      return JSON.stringify({
        version: 1,
        defaults: { provider: 'openai', model: 'project-model' },
        profiles: {},
      });
    });

    const defaults = loadProviderDefaults();
    expect(defaults!.provider).toBe('openai');
    expect(defaults!.model).toBe('project-model');
  });

  it('merges partial project defaults with global defaults', () => {
    mockFs.readFileSync.mockImplementation((filePath: unknown) => {
      const p = String(filePath);
      if (p.includes('testuser')) {
        return JSON.stringify({
          version: 1,
          defaults: { provider: 'anthropic', model: 'global-model' },
          profiles: {},
        });
      }
      return JSON.stringify({
        version: 1,
        defaults: { model: 'project-model' },
        profiles: {},
      });
    });

    const defaults = loadProviderDefaults();
    expect(defaults!.provider).toBe('anthropic');
    expect(defaults!.model).toBe('project-model');
  });
});
