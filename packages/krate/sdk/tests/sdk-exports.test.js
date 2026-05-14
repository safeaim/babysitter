import test from 'node:test';
import assert from 'node:assert/strict';
import * as sdk from '../src/index.js';

test('SDK exports createKrateApiController', () => {
  assert.equal(typeof sdk.createKrateApiController, 'function');
});

test('SDK exports KRATE_API_CONTROLLER_BOUNDARY', () => {
  assert.ok(sdk.KRATE_API_CONTROLLER_BOUNDARY);
  assert.equal(sdk.KRATE_API_CONTROLLER_BOUNDARY.role, 'krate-api-controller');
});

test('SDK exports fetchControllerUiModel', () => {
  assert.equal(typeof sdk.fetchControllerUiModel, 'function');
});

test('SDK exports clearSnapshotCache', () => {
  assert.equal(typeof sdk.clearSnapshotCache, 'function');
});

test('SDK exports createControllerUiModel', () => {
  assert.equal(typeof sdk.createControllerUiModel, 'function');
});

test('SDK exports auth functions', () => {
  assert.equal(typeof sdk.createAuthProviderConfig, 'function');
  assert.equal(typeof sdk.listEnabledAuthProviders, 'function');
  assert.equal(typeof sdk.buildAuthorizationRedirect, 'function');
  assert.equal(typeof sdk.exchangeOAuthCodeForProfile, 'function');
  assert.equal(typeof sdk.parseSessionCookie, 'function');
  assert.equal(typeof sdk.createSessionCookie, 'function');
  assert.equal(typeof sdk.registerLoginProfile, 'function');
  assert.equal(typeof sdk.mapLoginProfileToKrateIdentity, 'function');
  assert.equal(typeof sdk.profileFromDelegatedHeaders, 'function');
  assert.equal(typeof sdk.createInviteResource, 'function');
  assert.equal(typeof sdk.createTeamResource, 'function');
});

test('SDK exports mapOidcIdentity', () => {
  assert.equal(typeof sdk.mapOidcIdentity, 'function');
});

test('SDK exports resource model', () => {
  assert.equal(typeof sdk.createResource, 'function');
  assert.ok(sdk.CONFIG_KINDS instanceof Set);
  assert.ok(sdk.AGGREGATED_KINDS instanceof Set);
  assert.equal(typeof sdk.clone, 'function');
  assert.equal(typeof sdk.resourceToYaml, 'function');
});

test('SDK exports findResourceDefinition', () => {
  assert.equal(typeof sdk.findResourceDefinition, 'function');
});

test('SDK exports orgNamespaceName', () => {
  assert.equal(sdk.orgNamespaceName('my-org'), 'krate-org-my-org');
});

test('SDK exports normalizeOrgSlug', () => {
  assert.equal(typeof sdk.normalizeOrgSlug, 'function');
});

test('createResource creates valid resource', () => {
  const r = sdk.createResource('Repository', { name: 'test', namespace: 'ns' }, { organizationRef: 'org', visibility: 'internal' });
  assert.equal(r.kind, 'Repository');
  assert.equal(r.metadata.name, 'test');
  assert.equal(r.metadata.namespace, 'ns');
  assert.equal(r.spec.organizationRef, 'org');
});

// ---------------------------------------------------------------------------
// New agent controller exports
// ---------------------------------------------------------------------------

test('SDK exports agent adapter controller', () => {
  assert.equal(typeof sdk.createAgentAdapterController, 'function');
  assert.ok(sdk.AGENT_ADAPTER_CONTROLLER_BOUNDARY);
  assert.equal(sdk.AGENT_ADAPTER_CONTROLLER_BOUNDARY.role, 'agent-adapter-controller');
  assert.equal(typeof sdk.validateAgentAdapter, 'function');
});

test('SDK exports agent transport binding controller', () => {
  assert.equal(typeof sdk.createAgentTransportBindingController, 'function');
  assert.ok(sdk.AGENT_TRANSPORT_BINDING_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentTransportBinding, 'function');
});

test('SDK exports agent provider config controller', () => {
  assert.equal(typeof sdk.createAgentProviderConfigController, 'function');
  assert.ok(sdk.AGENT_PROVIDER_CONFIG_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentProviderConfig, 'function');
});

test('SDK exports agent project controller', () => {
  assert.equal(typeof sdk.createAgentProjectController, 'function');
  assert.ok(sdk.AGENT_PROJECT_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentProject, 'function');
});

test('SDK exports agent gateway config controller', () => {
  assert.equal(typeof sdk.createAgentGatewayConfigController, 'function');
  assert.ok(sdk.AGENT_GATEWAY_CONFIG_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentGatewayConfig, 'function');
});

test('SDK exports agent session transcript controller', () => {
  assert.equal(typeof sdk.createAgentSessionTranscriptController, 'function');
  assert.ok(sdk.AGENT_SESSION_TRANSCRIPT_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentSessionTranscript, 'function');
});

test('SDK exports agent subagent controller', () => {
  assert.equal(typeof sdk.createAgentSubagentController, 'function');
  assert.ok(sdk.AGENT_SUBAGENT_CONTROLLER_BOUNDARY);
});

test('SDK exports agent writeback controller', () => {
  assert.equal(typeof sdk.createAgentWritebackController, 'function');
  assert.ok(sdk.AGENT_WRITEBACK_CONTROLLER_BOUNDARY);
});

test('SDK exports agent stack controller', () => {
  assert.equal(typeof sdk.createAgentStackController, 'function');
  assert.ok(sdk.AGENT_STACK_CONTROLLER_BOUNDARY);
  assert.equal(sdk.AGENT_STACK_CONTROLLER_BOUNDARY.role, 'agent-stack-controller');
});

test('SDK exports agent dispatch controller', () => {
  assert.equal(typeof sdk.createAgentDispatchController, 'function');
  assert.ok(sdk.AGENT_DISPATCH_CONTROLLER_BOUNDARY);
});

test('SDK exports agent approval controller', () => {
  assert.equal(typeof sdk.createAgentApprovalController, 'function');
  assert.ok(sdk.AGENT_APPROVAL_CONTROLLER_BOUNDARY);
});

test('SDK exports agent trigger controller and helpers', () => {
  assert.equal(typeof sdk.createAgentTriggerController, 'function');
  assert.ok(sdk.AGENT_TRIGGER_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateCronExpression, 'function');
  assert.equal(typeof sdk.calculateNextRun, 'function');
  assert.equal(typeof sdk.validateWebhookTrigger, 'function');
  assert.equal(typeof sdk.validateCommentTrigger, 'function');
  assert.equal(typeof sdk.validateLabelTrigger, 'function');
  assert.equal(typeof sdk.getTriggerSourceType, 'function');
  assert.equal(typeof sdk.validateTriggerRule, 'function');
});

test('SDK exports agent workspace controller', () => {
  assert.equal(typeof sdk.createAgentWorkspaceController, 'function');
  assert.ok(sdk.AGENT_WORKSPACE_CONTROLLER_BOUNDARY);
});

test('SDK exports agent memory controller', () => {
  assert.equal(typeof sdk.createAgentMemoryController, 'function');
  assert.ok(sdk.AGENT_MEMORY_CONTROLLER_BOUNDARY);
});

test('SDK exports memory query functions', () => {
  assert.equal(typeof sdk.queryGraph, 'function');
  assert.equal(typeof sdk.queryGrep, 'function');
  assert.equal(typeof sdk.queryMemory, 'function');
  assert.ok(sdk.AGENT_MEMORY_QUERY_BOUNDARY);
});

test('SDK exports permission reviewer', () => {
  assert.equal(typeof sdk.createPermissionReviewer, 'function');
  assert.ok(sdk.AGENT_PERMISSION_REVIEW_BOUNDARY);
});

test('SDK exports secret and config grant controllers', () => {
  assert.equal(typeof sdk.createAgentSecretGrantController, 'function');
  assert.equal(typeof sdk.createAgentConfigGrantController, 'function');
  assert.ok(sdk.AGENT_SECRET_GRANT_CONTROLLER_BOUNDARY);
  assert.ok(sdk.AGENT_CONFIG_GRANT_CONTROLLER_BOUNDARY);
  assert.equal(typeof sdk.validateAgentSecretGrant, 'function');
  assert.equal(typeof sdk.validateAgentConfigGrant, 'function');
  assert.equal(typeof sdk.listGrantsForAgent, 'function');
  assert.equal(typeof sdk.revokeGrant, 'function');
});

test('SDK exports audit controller and event poller', () => {
  assert.equal(typeof sdk.createAuditController, 'function');
  assert.equal(typeof sdk.createEventPoller, 'function');
  assert.ok(sdk.AUDIT_CONTROLLER_BOUNDARY);
  assert.equal(sdk.AUDIT_CONTROLLER_BOUNDARY.role, 'audit-controller');
});

test('SDK exports async utilities', () => {
  assert.equal(typeof sdk.createEventBatcher, 'function');
  assert.equal(typeof sdk.createRetryPolicy, 'function');
  assert.equal(typeof sdk.createDeliveryQueue, 'function');
  assert.equal(typeof sdk.createCheckpointer, 'function');
});

test('SDK exports memory import functions', () => {
  assert.equal(typeof sdk.parseJournalForImport, 'function');
  assert.equal(typeof sdk.createMemorySnapshot, 'function');
  assert.equal(typeof sdk.validateMemoryImport, 'function');
  assert.equal(typeof sdk.validateMemorySnapshot, 'function');
  assert.equal(typeof sdk.validateOntology, 'function');
  assert.equal(typeof sdk.getOntologyNodeKinds, 'function');
  assert.equal(typeof sdk.getOntologyEdgeKinds, 'function');
});

// ---------------------------------------------------------------------------
// Smoke tests for new exports
// ---------------------------------------------------------------------------

test('createAgentStackController returns a controller object', () => {
  const ctrl = sdk.createAgentStackController();
  assert.ok(ctrl);
  assert.equal(typeof ctrl, 'object');
});

test('createAuditController can log and query events', () => {
  const audit = sdk.createAuditController();
  audit.log({ org: 'test-org', action: 'resource.apply', resource: { kind: 'Repository', name: 'foo' } });
  const { events, total } = audit.query({ org: 'test-org' });
  assert.equal(total, 1);
  assert.equal(events[0].action, 'resource.apply');
  assert.equal(events[0].org, 'test-org');
});

test('createEventBatcher batches events via push', async () => {
  const received = [];
  const batcher = sdk.createEventBatcher((batch) => { received.push(...batch); }, { maxBatchSize: 3, flushIntervalMs: 50 });
  batcher.push('a');
  batcher.push('b');
  batcher.push('c');
  // Pushing 3 items triggers immediate flush (maxBatchSize reached)
  await new Promise((r) => setTimeout(r, 20));
  batcher.stop();
  assert.ok(received.length >= 3);
});

test('queryGraph returns matches', () => {
  const records = [
    { id: '1', nodeKind: 'AgentStack', attributes: { name: 'review-bot' }, edges: [] },
    { id: '2', nodeKind: 'AgentSession', attributes: { name: 'session-1' }, edges: [] },
  ];
  const result = sdk.queryGraph({ records, query: 'review', kinds: ['AgentStack'] });
  assert.ok(typeof result.totalMatches === 'number');
  assert.ok(result.matches.length >= 1);
});

test('validateAgentAdapter rejects null resource', () => {
  const result = sdk.validateAgentAdapter(null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('createAgentSecretGrantController creates a grant', () => {
  const ctrl = sdk.createAgentSecretGrantController();
  const result = ctrl.createSecretGrant({
    name: 'my-grant',
    orgRef: 'my-org',
    secretName: 'db-pass',
    grantedTo: 'review-bot',
    permissions: ['read'],
    namespace: 'krate-org-my-org',
  });
  assert.ok(result.grant);
  assert.equal(result.grant.kind, 'AgentSecretGrant');
  assert.equal(result.grant.metadata.name, 'my-grant');
});
