import assert from 'node:assert/strict';
import test from 'node:test';
import { createMcpServer, MCP_TOOLS } from '../src/mcp-server.js';

// ---------------------------------------------------------------------------
// Mock controller — returns canned data without kubectl / Kubernetes
// ---------------------------------------------------------------------------
function createMockController() {
  const repositories = [
    { kind: 'Repository', metadata: { name: 'web-app', namespace: 'krate-org-default' }, spec: { organizationRef: 'default', visibility: 'internal' } },
    { kind: 'Repository', metadata: { name: 'api-service', namespace: 'krate-org-default' }, spec: { organizationRef: 'default', visibility: 'private' } },
  ];
  const stacks = [
    { kind: 'AgentStack', metadata: { name: 'review-bot', namespace: 'krate-org-default' }, spec: { organizationRef: 'default', baseAgent: 'claude-code' } },
  ];

  return {
    role: 'mock-krate-api-controller',
    namespace: 'krate-org-default',

    async snapshot() {
      return {
        namespace: 'krate-org-default',
        resources: {
          Repository: repositories,
          AgentStack: stacks,
        },
      };
    },

    async listResource(kind) {
      if (kind === 'Repository') return { items: repositories };
      if (kind === 'AgentStack') return { items: stacks };
      return { items: [] };
    },

    async getResource(kind, name) {
      const all = kind === 'Repository' ? repositories : kind === 'AgentStack' ? stacks : [];
      const found = all.find((r) => r.metadata.name === name);
      return found ? { resource: found } : { error: 'not_found' };
    },

    async applyResource(resource) {
      return { operation: 'apply', resource };
    },

    async deleteResource(kind, name) {
      return { operation: 'delete', kind, name };
    },

    async dispatchAgent(input) {
      return { dispatched: true, stackRef: input.agentStack, input };
    },
  };
}

// ---------------------------------------------------------------------------
// Helper to build a JSON-RPC 2.0 request
// ---------------------------------------------------------------------------
function rpc(method, params = {}, id = 1) {
  return { jsonrpc: '2.0', id, method, params };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('MCP_TOOLS array has 8 entries', () => {
  assert.equal(MCP_TOOLS.length, 8);
  const names = MCP_TOOLS.map((t) => t.name);
  assert.ok(names.includes('krate_list_resources'));
  assert.ok(names.includes('krate_get_resource'));
  assert.ok(names.includes('krate_apply_resource'));
  assert.ok(names.includes('krate_delete_resource'));
  assert.ok(names.includes('krate_snapshot'));
  assert.ok(names.includes('krate_search'));
  assert.ok(names.includes('krate_list_stacks'));
  assert.ok(names.includes('krate_dispatch_agent'));
});

test('createMcpServer returns object with start, stop, handleMessage', () => {
  const server = createMcpServer({ controller: createMockController() });
  assert.equal(typeof server.start, 'function');
  assert.equal(typeof server.stop, 'function');
  assert.equal(typeof server.handleMessage, 'function');
});

test('handleMessage initialize returns capabilities with tools', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('initialize'));
  assert.equal(resp.jsonrpc, '2.0');
  assert.equal(resp.id, 1);
  assert.ok(resp.result);
  assert.equal(resp.result.serverInfo.name, 'krate');
  assert.ok(resp.result.capabilities.tools);
  assert.equal(resp.result.protocolVersion, '2024-11-05');
});

test('handleMessage tools/list returns all 8 tool definitions', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/list'));
  assert.equal(resp.result.tools.length, 8);
  for (const tool of resp.result.tools) {
    assert.ok(tool.name, 'each tool has a name');
    assert.ok(tool.description, 'each tool has a description');
    assert.ok(tool.inputSchema, 'each tool has an inputSchema');
  }
});

test('handleMessage tools/call krate_snapshot returns a result', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_snapshot', arguments: {} }));
  assert.ok(resp.result);
  assert.ok(resp.result.content);
  assert.equal(resp.result.content[0].type, 'text');
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.ok(parsed.resources);
  assert.ok(parsed.resources.Repository);
});

test('handleMessage tools/call krate_list_resources with kind Repository', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_list_resources', arguments: { kind: 'Repository' } }));
  assert.ok(resp.result);
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.ok(parsed.items);
  assert.equal(parsed.items.length, 2);
});

test('handleMessage tools/call krate_get_resource', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_get_resource', arguments: { kind: 'Repository', name: 'web-app' } }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.equal(parsed.resource.metadata.name, 'web-app');
});

test('handleMessage tools/call krate_apply_resource', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resource = { kind: 'Repository', metadata: { name: 'new-repo' }, spec: {} };
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_apply_resource', arguments: { resource } }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.equal(parsed.operation, 'apply');
  assert.equal(parsed.resource.metadata.name, 'new-repo');
});

test('handleMessage tools/call krate_delete_resource', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_delete_resource', arguments: { kind: 'Repository', name: 'web-app' } }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.equal(parsed.operation, 'delete');
  assert.equal(parsed.name, 'web-app');
});

test('handleMessage tools/call krate_search returns matching resources', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_search', arguments: { query: 'web' } }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.equal(parsed.query, 'web');
  assert.ok(parsed.matches.length >= 1);
  assert.ok(parsed.matches.some((m) => m.name === 'web-app'));
});

test('handleMessage tools/call krate_list_stacks', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_list_stacks', arguments: {} }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.ok(parsed.items);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].metadata.name, 'review-bot');
});

test('handleMessage tools/call krate_dispatch_agent', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_dispatch_agent', arguments: { stackRef: 'review-bot', input: { repository: 'web-app' } } }));
  const parsed = JSON.parse(resp.result.content[0].text);
  assert.ok(parsed.dispatched);
  assert.equal(parsed.stackRef, 'review-bot');
});

test('handleMessage with unknown method returns error', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('nonexistent/method'));
  assert.ok(resp.error);
  assert.equal(resp.error.code, -32601);
  assert.ok(resp.error.message.includes('nonexistent/method'));
});

test('handleMessage with unknown tool returns error', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('tools/call', { name: 'krate_nonexistent', arguments: {} }));
  assert.ok(resp.error);
  assert.equal(resp.error.code, -32602);
  assert.ok(resp.error.message.includes('krate_nonexistent'));
});

test('handleMessage notifications/initialized returns null (no response)', async () => {
  const server = createMcpServer({ controller: createMockController() });
  const resp = await server.handleMessage(rpc('notifications/initialized'));
  assert.equal(resp, null);
});
