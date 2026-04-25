import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function countFiles(relativeDir, suffix) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!existsSync(absoluteDir)) return 0;
  return readdirSync(absoluteDir).filter((entry) => entry.endsWith(suffix)).length;
}

function containsAll(doc, snippets) {
  return snippets.every((snippet) => doc.includes(snippet));
}

const migrationDoc = read('packages/transport-mux/migration.md');
const readmeDoc = read('packages/transport-mux/README.md');
const architectureDoc = read('packages/transport-mux/architecture.md');
const packageJson = JSON.parse(read('packages/transport-mux/package.json'));
const packageEntrypoint = read('packages/transport-mux/src/index.ts');
const launchCommand = read('packages/agent-mux/cli/src/commands/launch.ts');

const legacyPythonTests = countFiles('packages/agent-mux/amux-proxy/tests', '.py');
const jsContractTests =
  countFiles('packages/transport-mux/tests', '.ts') +
  countFiles('packages/transport-mux/tests/transports', '.ts') +
  countFiles('packages/transport-mux/tests/e2e', '.ts');

const docsHonestyChecks = [
  {
    name: 'README marks transport-mux as an internal-only placeholder seam',
    ok: containsAll(readmeDoc, [
      'internal-only placeholder seam',
      'not the active runtime or release owner yet',
    ]),
  },
  {
    name: 'README describes workspace-local entrypoints as non-publishable',
    ok: containsAll(readmeDoc, [
      'workspace-local development',
      'not a published npm deliverable',
    ]),
  },
  {
    name: 'migration.md describes a private placeholder policy',
    ok: containsAll(migrationDoc, [
      'private workspace package and placeholder seam',
      'does not yet own publish, release, or externally installable runtime truth',
    ]),
  },
  {
    name: 'migration.md requires publish-only metadata to stay absent',
    ok: containsAll(migrationDoc, [
      '`files`, `publishConfig`, and `prepack` must stay absent',
      'Referenced packaged artifacts must exist locally or be removed from package metadata.',
    ]),
  },
  {
    name: 'architecture.md still documents the intended launch/runtime seam',
    ok: containsAll(architectureDoc, [
      '`launch.ts` starts the `transport-mux` runtime',
      '`transport-mux` boots the protocol codec and provider adapter implied by that config.',
    ]),
  },
];

const docsHonestyFailures = docsHonestyChecks
  .filter((check) => !check.ok)
  .map((check) => check.name);

const scorecard = [
  {
    gate: 'Legacy Python reference surface stays explicit',
    status:
      legacyPythonTests === 0 ||
      migrationDoc.includes('Historical archive: legacy Python tests under `packages/agent-mux/amux-proxy/tests` remain available as reference material for the still-active historical runtime path.')
        ? 'green'
        : 'red',
    evidence: legacyPythonTests > 0
      ? `${legacyPythonTests} legacy Python tests remain, and migration.md marks them as reference material rather than packaged output from transport-mux`
      : 'No legacy Python contract tests remain under packages/agent-mux/amux-proxy/tests',
    retireWhen: 'Legacy tests are either removed entirely or explicitly separated from transport-mux package-artifact claims.',
  },
  {
    gate: 'Private package metadata is coherent',
    status:
      packageJson.private === true &&
      !('files' in packageJson) &&
      !('publishConfig' in packageJson) &&
      !('prepack' in (packageJson.scripts ?? {}))
        ? 'green'
        : 'red',
    evidence:
      packageJson.private === true &&
      !('files' in packageJson) &&
      !('publishConfig' in packageJson) &&
      !('prepack' in (packageJson.scripts ?? {}))
        ? 'package.json stays private and omits publish-only metadata that would advertise a shippable npm artifact'
        : 'package.json still advertises pack/publish metadata that conflicts with a private placeholder policy',
    retireWhen: 'The package is intentionally promoted out of placeholder status and all publish-ready metadata returns in one explicit cutover.',
  },
  {
    gate: 'Workspace seam still builds and tests locally',
    status: packageJson.scripts['scorecard:migration'] && jsContractTests > 0 ? 'green' : 'red',
    evidence: packageJson.scripts['scorecard:migration']
      ? `scorecard:migration script is present and ${jsContractTests} JS test files exist under packages/transport-mux/tests`
      : 'scorecard:migration script is missing from packages/transport-mux/package.json',
    retireWhen: 'Local build/test coverage is no longer needed or is replaced with a different seam-verification flow.',
  },
  {
    gate: 'Launcher/runtime seam remains explicit without over-claiming ownership',
    status:
      launchCommand.includes('@a5c-ai/transport-mux') &&
      packageEntrypoint.includes("export * from './runtime.js';")
        ? 'green'
        : 'red',
    evidence:
      launchCommand.includes('@a5c-ai/transport-mux') &&
      packageEntrypoint.includes("export * from './runtime.js';")
        ? 'launch.ts imports transport-mux directly and the package entrypoint exports the local runtime seam'
        : 'launch.ts still bypasses the transport-mux runtime surface or the package entrypoint does not export it',
    retireWhen: 'The local seam is retired or promoted with an explicit runtime-ownership policy change.',
  },
  {
    gate: 'Docs describe the migration seam honestly',
    status: docsHonestyFailures.length === 0 ? 'green' : 'red',
    evidence:
      docsHonestyFailures.length === 0
        ? 'README.md, architecture.md, and migration.md agree that transport-mux is an internal seam today and a future cutover target.'
        : `Docs drift detected: ${docsHonestyFailures.join('; ')}.`,
    retireWhen: 'Docs and metadata are updated together when placeholder status changes.',
  },
];

const allGreen = scorecard.every((item) => item.status === 'green');

console.log('# transport-mux migration scorecard');
console.log('');
console.log('| Gate | Status | Evidence | Retire when |');
console.log('| --- | --- | --- | --- |');
for (const item of scorecard) {
  console.log(`| ${item.gate} | ${item.status} | ${item.evidence} | ${item.retireWhen} |`);
}
console.log('');
console.log(`overallPolicyAligned=${allGreen ? 'true' : 'false'}`);
