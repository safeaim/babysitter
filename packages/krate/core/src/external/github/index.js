// GitHub External Provider — Slice 3.3a
// Entry point for the GitHub provider adapter.
// Re-exports auth helpers, git forge class, boundary object, and provider factory.

export { createGitHubJwt, exchangeInstallationToken } from './auth.js';
export { GitHubGitForge } from './git-forge.js';

// ---------------------------------------------------------------------------
// Boundary declaration
// ---------------------------------------------------------------------------

export const GITHUB_GIT_FORGE_BOUNDARY = Object.freeze({
  role: 'github-git-forge',
  scope: 'GitHub App authentication (JWT signing, installation token exchange) and Git forge operations (repositories, PRs, refs, deploy keys, branch protection)',
  owns: [
    'GitHub App JWT creation',
    'installation token exchange',
    'repository listing',
    'pull request lifecycle',
    'ref enumeration',
    'deploy key synchronisation',
    'branch protection synchronisation'
  ],
  delegatesTo: [],
  mustNotOwn: [
    'GitHub secret storage',
    'Kubernetes resources',
    'CI pipeline execution',
    'webhook delivery'
  ]
});

// ---------------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------------

/**
 * Create a GitHub ExternalProviderAdapter.
 *
 * Returns a lightweight descriptor that carries GitHub App credentials and
 * exposes a `createForge(token)` factory for constructing a GitHubGitForge
 * bound to a specific installation token.
 *
 * @param {{ appId: string, privateKey: string, installationId?: string, baseUrl?: string }} opts
 * @returns {{ type: string, config: object, createForge: Function }}
 */
export function createGitHubProvider({ appId, privateKey, installationId, fetchImpl } = {}) {
  if (!appId) throw new Error('createGitHubProvider: appId is required');
  if (!privateKey) throw new Error('createGitHubProvider: privateKey is required');

  return {
    type: 'github',
    config: Object.freeze({ appId, installationId }),

    /**
     * Construct a GitHubGitForge for the given owner and installation token.
     * @param {{ owner: string, installationToken: string, fetchImpl?: Function }} forgeOpts
     * @returns {GitHubGitForge}
     */
    createForge({ owner, installationToken, fetchImpl: forgeFetch } = {}) {
      const { GitHubGitForge: Forge } = { GitHubGitForge };
      // Re-import to avoid closure capture issues in bundlers
      return new GitHubGitForge({
        owner,
        installationToken,
        fetchImpl: forgeFetch ?? fetchImpl ?? globalThis.fetch
      });
    }
  };
}
