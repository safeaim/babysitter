import { createKrateApiController } from '../../core/src/api-controller.js';
import { createKubernetesResourceGateway } from '../../core/src/kubernetes-resource-gateway.js';

export const MCP_TOOLS = [
  { name: 'krate_list_resources', description: 'List resources of a given kind', inputSchema: { type: 'object', properties: { kind: { type: 'string' } }, required: ['kind'] } },
  { name: 'krate_get_resource', description: 'Get a single resource by kind and name', inputSchema: { type: 'object', properties: { kind: { type: 'string' }, name: { type: 'string' } }, required: ['kind', 'name'] } },
  { name: 'krate_apply_resource', description: 'Create or update a resource', inputSchema: { type: 'object', properties: { resource: { type: 'object' } }, required: ['resource'] } },
  { name: 'krate_delete_resource', description: 'Delete a resource', inputSchema: { type: 'object', properties: { kind: { type: 'string' }, name: { type: 'string' } }, required: ['kind', 'name'] } },
  { name: 'krate_snapshot', description: 'Get full organization snapshot', inputSchema: { type: 'object', properties: {} } },
  { name: 'krate_search', description: 'Search resources by query', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'krate_list_stacks', description: 'List agent stacks', inputSchema: { type: 'object', properties: {} } },
  { name: 'krate_dispatch_agent', description: 'Dispatch an agent run', inputSchema: { type: 'object', properties: { stackRef: { type: 'string' }, input: { type: 'object' } }, required: ['stackRef'] } },
];

const SERVER_INFO = {
  name: 'krate',
  version: '0.1.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

/**
 * Create an MCP server instance.
 * @param {object} [options]
 * @param {object} [options.controller] - A Krate API controller instance (for testing / DI).
 * @returns {{ start: () => void, stop: () => void, handleMessage: (msg: object) => Promise<object> }}
 */
export function createMcpServer(options = {}) {
  const controller = options.controller || createKrateApiController({
    resourceGateway: createKubernetesResourceGateway(),
  });

  /**
   * Handle a single JSON-RPC 2.0 request object and return the response object.
   * This is the testable core -- no I/O involved.
   */
  async function handleMessage(msg) {
    const id = msg.id ?? null;

    if (msg.method === 'initialize') {
      return jsonrpcResult(id, {
        protocolVersion: '2024-11-05',
        serverInfo: SERVER_INFO,
        capabilities: SERVER_CAPABILITIES,
      });
    }

    if (msg.method === 'notifications/initialized') {
      // Client acknowledgement -- no response required for notifications.
      return null;
    }

    if (msg.method === 'tools/list') {
      return jsonrpcResult(id, { tools: MCP_TOOLS });
    }

    if (msg.method === 'tools/call') {
      const toolName = msg.params?.name;
      const args = msg.params?.arguments || {};

      const toolDef = MCP_TOOLS.find((t) => t.name === toolName);
      if (!toolDef) {
        return jsonrpcError(id, -32602, `Unknown tool: ${toolName}`);
      }

      try {
        const result = await executeTool(controller, toolName, args);
        return jsonrpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (err) {
        return jsonrpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
          isError: true,
        });
      }
    }

    return jsonrpcError(id, -32601, `Method not found: ${msg.method}`);
  }

  // --- stdio transport -------------------------------------------------------

  let stdinBuffer = '';
  let running = false;

  function onStdinData(chunk) {
    stdinBuffer += chunk.toString();
    let newlineIdx;
    while ((newlineIdx = stdinBuffer.indexOf('\n')) !== -1) {
      const line = stdinBuffer.slice(0, newlineIdx).trim();
      stdinBuffer = stdinBuffer.slice(newlineIdx + 1);
      if (!line) continue;
      processLine(line);
    }
  }

  async function processLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      const resp = jsonrpcError(null, -32700, 'Parse error');
      writeResponse(resp);
      return;
    }
    const resp = await handleMessage(msg);
    if (resp) writeResponse(resp);
  }

  function writeResponse(resp) {
    process.stdout.write(JSON.stringify(resp) + '\n');
  }

  function start() {
    if (running) return;
    running = true;
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', onStdinData);
    process.stdin.resume();
  }

  function stop() {
    if (!running) return;
    running = false;
    process.stdin.removeListener('data', onStdinData);
    process.stdin.pause();
  }

  return { start, stop, handleMessage };
}

// --- Tool execution ----------------------------------------------------------

async function executeTool(controller, toolName, args) {
  switch (toolName) {
    case 'krate_list_resources':
      return controller.listResource(args.kind);

    case 'krate_get_resource':
      return controller.getResource(args.kind, args.name);

    case 'krate_apply_resource':
      return controller.applyResource(args.resource);

    case 'krate_delete_resource':
      return controller.deleteResource(args.kind, args.name);

    case 'krate_snapshot':
      return controller.snapshot();

    case 'krate_search': {
      // Search across the snapshot for resources matching the query string.
      const snapshot = await controller.snapshot();
      const query = (args.query || '').toLowerCase();
      const matches = [];
      for (const [kind, items] of Object.entries(snapshot.resources || {})) {
        for (const item of Array.isArray(items) ? items : []) {
          const name = item.metadata?.name || '';
          const ns = item.metadata?.namespace || '';
          const haystack = `${kind} ${name} ${ns} ${JSON.stringify(item.spec || {})}`.toLowerCase();
          if (haystack.includes(query)) {
            matches.push({ kind, name, namespace: ns });
          }
        }
      }
      return { query: args.query, matches };
    }

    case 'krate_list_stacks':
      return controller.listResource('AgentStack');

    case 'krate_dispatch_agent':
      return controller.dispatchAgent({
        agentStack: args.stackRef,
        ...args.input,
      });

    default:
      throw new Error(`Tool not implemented: ${toolName}`);
  }
}

// --- JSON-RPC helpers --------------------------------------------------------

function jsonrpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonrpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
