const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

const stagedDocPrefixes = [
  "docs/cli-examples.md",
  "docs/github-actions-setup-babysitter.md",
  "docs/github-actions-setup-claude-code.md",
  "docs/github-actions-setup-codex.md",
  "docs/github-actions-setup-gemini-cli.md",
  "docs/release-pipeline.md",
  "docs/v6-spec-and-roadmap/testing-framework.md",
  "docs/v6-spec-and-roadmap/v6-implementation-roadmap.md",
];

const repoCommandValidationPrefixes = [
  ...stagedDocPrefixes,
];

function normalizeSlashes(value) {
  return value.split(path.sep).join("/");
}

function isWithinPrefixes(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix));
}

function isStagedDoc(relativePath) {
  return isWithinPrefixes(relativePath, stagedDocPrefixes);
}

function isRepoCommandSurface(relativePath) {
  return isWithinPrefixes(relativePath, repoCommandValidationPrefixes);
}

module.exports = {
  repoRoot,
  docsRoot: path.join(repoRoot, "docs"),
  docsSiteRoot: path.join(repoRoot, "docs-site"),
  stagedDocPrefixes,
  repoCommandValidationPrefixes,
  generatedDocMaxAgeDays: 45,
  humanDocReportAgeDays: 120,
  externalLinkTimeoutMs: 15000,
  externalLinkRetries: 2,
  normalizeSlashes,
  isStagedDoc,
  isRepoCommandSurface,
};
