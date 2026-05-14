// External Provider Resource Factory — Slice B3+D1
//
// Provides:
//   - createDefaultProviderRegistry() — auto-registers GitHub provider
//   - createExternalBackendProvider() — creates ExternalBackendProvider CRD resources

import { createProviderRegistry } from './provider-adapter.js';

// ---------------------------------------------------------------------------
// GitHub provider descriptor (lightweight, no credentials required)
// ---------------------------------------------------------------------------

/**
 * Build a lightweight GitHub provider adapter descriptor for the registry.
 * This adapter is credential-free — it only describes GitHub's capabilities.
 * Concrete authenticated instances are created via createGitHubProvider().
 *
 * @returns {object} ExternalProviderAdapter descriptor
 */
function buildGitHubAdapterDescriptor() {
  return {
    descriptor() {
      return {
        providerType: 'github',
        displayName: 'GitHub',
        hosting: ['cloud', 'self-hosted'],
        authModes: ['github-app', 'pat'],
        interfaces: ['gitForge', 'issueTracking', 'cicd']
      };
    },

    health() {
      return { status: 'healthy', message: 'GitHub provider registered (no live connection)' };
    },

    // Minimal interface stubs so validateProviderAdapter considers this valid
    gitForge: {
      listRepositories: async () => [],
      createRepository: async () => { throw new Error('Use createGitHubProvider for authenticated operations'); }
    },

    issueTracking: {
      listIssues: async () => [],
      createIssue: async () => { throw new Error('Use createGitHubProvider for authenticated operations'); }
    },

    cicd: {
      listWorkflowRuns: async () => [],
      triggerWorkflow: async () => { throw new Error('Use createGitHubProvider for authenticated operations'); }
    },

    normalizeWebhook(payload) {
      // Passthrough — real normalization lives in the GitHub webhook controller
      return [{ type: payload?.action ?? 'unknown', payload }];
    },

    verifyWebhook(_request) {
      // Default: unverified; real HMAC verification is in webhook-controller
      return { valid: false, reason: 'use webhook-controller for HMAC verification' };
    }
  };
}

// ---------------------------------------------------------------------------
// D1: createDefaultProviderRegistry
// ---------------------------------------------------------------------------

/**
 * Create a provider registry pre-loaded with the GitHub provider.
 *
 * @returns {object} ProviderRegistry with github auto-registered
 */
export function createDefaultProviderRegistry() {
  const registry = createProviderRegistry();
  registry.register('github', buildGitHubAdapterDescriptor());
  return registry;
}

// ---------------------------------------------------------------------------
// D1: createExternalBackendProvider
// ---------------------------------------------------------------------------

/**
 * Create an ExternalBackendProvider CRD resource.
 * Used by the external backend wizard to persist provider registrations.
 *
 * @param {{ name: string, namespace?: string, providerType: string,
 *           displayName: string, config?: object, organizationRef?: string }} opts
 * @returns {object} K8s-style ExternalBackendProvider resource
 */
export function createExternalBackendProvider({
  name,
  namespace = 'default',
  providerType,
  displayName,
  config = {},
  organizationRef = 'default'
} = {}) {
  if (!name) throw new Error('createExternalBackendProvider: name is required');
  if (!providerType) throw new Error('createExternalBackendProvider: providerType is required');

  const now = new Date().toISOString();

  return {
    apiVersion: 'krate.a5c.ai/v1alpha1',
    kind: 'ExternalBackendProvider',
    metadata: {
      name,
      namespace,
      labels: {},
      annotations: {}
    },
    spec: {
      organizationRef,
      providerType,
      displayName: displayName || providerType,
      config: { ...config }
    },
    status: {
      phase: 'Pending',
      createdAt: now
    }
  };
}
