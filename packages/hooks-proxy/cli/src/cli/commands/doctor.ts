/**
 * doctor command — Report adapter capability profile and integration warnings.
 *
 * Spec section 18.6.
 */

import type { CommandModule } from 'yargs';
import type { AdapterCapabilities } from '@a5c/hooks-proxy-core';
import { loadAdapter, KNOWN_ADAPTERS } from '../adapter-loader';

interface DoctorArgs {
  adapter?: string;
  json?: boolean;
}

interface AdapterReport {
  name: string;
  available: boolean;
  capabilities?: AdapterCapabilities;
  warnings: string[];
  error?: string;
}

function analyzeAdapter(name: string): AdapterReport {
  const warnings: string[] = [];

  try {
    const loaded = loadAdapter(name);
    const caps = loaded.capabilities;

    // Generate warnings based on capability gaps
    if (!caps.supportsBlock) {
      warnings.push('Adapter does not support blocking decisions (deny/ask will be downgraded to noop)');
    }
    if (!caps.supportsNativeAdditionalContext) {
      warnings.push('Adapter does not support native additionalContext injection');
    }
    if (caps.envPersistenceMode === 'none') {
      warnings.push('No env persistence — session context will not propagate to downstream tools');
    }
    if (caps.sessionIdQuality === 'synthetic' || caps.sessionIdQuality === 'none') {
      warnings.push('Session ID is synthetic or unavailable — cross-hook state may be unreliable');
    }
    if (caps.toolInterceptionScope === 'none') {
      warnings.push('No tool interception — tool.before/tool.after phases will be unsupported');
    }
    if (loaded.phaseMappings.length === 0) {
      warnings.push('No phase mappings found — all events will map to "unknown" phase');
    }

    if (caps.notes) {
      for (const note of caps.notes) {
        warnings.push(`Note: ${note}`);
      }
    }

    return {
      name,
      available: true,
      capabilities: caps,
      warnings,
    };
  } catch (err) {
    return {
      name,
      available: false,
      warnings: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const doctorCommand: CommandModule<object, DoctorArgs> = {
  command: 'doctor',
  describe: 'Report adapter capability profile and integration warnings',
  builder: (yargs) =>
    yargs
      .option('adapter', {
        type: 'string',
        describe: 'Specific adapter to check (omit for all known adapters)',
      })
      .option('json', {
        type: 'boolean',
        default: false,
        describe: 'Output JSON format',
      }),
  handler: async (args) => {
    const adapterNames = args.adapter ? [args.adapter] : [...KNOWN_ADAPTERS];
    const reports: AdapterReport[] = adapterNames.map(analyzeAdapter);

    if (args.json) {
      process.stdout.write(JSON.stringify(reports, null, 2) + '\n');
      return;
    }

    for (const report of reports) {
      if (!report.available) {
        console.log(`[x] ${report.name}: not available`);
        if (report.error) {
          console.log(`    ${report.error}`);
        }
        console.log('');
        continue;
      }

      const caps = report.capabilities!;
      console.log(`[ok] ${report.name}`);
      console.log(`  Family:           ${caps.family}`);
      console.log(`  Session ID:       ${caps.sessionIdQuality}`);
      console.log(`  Env persistence:  ${caps.envPersistenceMode}`);
      console.log(`  Blocking:         ${caps.supportsBlock ? 'yes' : 'no'}`);
      console.log(`  Tool scope:       ${caps.toolInterceptionScope}`);

      if (report.warnings.length > 0) {
        console.log('  Warnings:');
        for (const w of report.warnings) {
          console.log(`    - ${w}`);
        }
      }
      console.log('');
    }
  },
};
