import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createResource } from './resource-model.js';

export const AGENT_MUX_CLIENT_BOUNDARY = {
  role: 'agent-mux-client',
  scope: 'HTTP/SSE adapter for Agent Mux gateway — capabilities, sessions, events, transcripts, local subprocess sessions',
  owns: ['gateway HTTP calls', 'SSE event streaming', 'transcript reconciliation', 'local session spawning', 'subprocess lifecycle'],
  delegatesTo: ['resource-model'],
  mustNotOwn: ['secret values', 'permission review', 'resource persistence']
};

/** Known agent adapter names for local session spawning. */
const KNOWN_ADAPTERS = new Set([
  'claude-code', 'codex', 'gemini-cli', 'aider', 'goose',
  'amp', 'roo-code', 'kilo-code', 'cline', 'cursor',
]);

/**
 * Internal HTTP request helper. Zero external deps — uses node:http / node:https.
 * @param {string} url
 * @param {{ method?: string, body?: object, headers?: Record<string,string>, timeout?: number }} options
 * @returns {Promise<{ status: number, body: any }>}
 */
function httpRequest(url, { method = 'GET', body, headers = {}, timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'Accept': 'application/json', ...headers },
      timeout,
    };
    if (body) {
      const payload = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = transport.request(opts, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Parse SSE text into an array of parsed JSON data payloads.
 * Each `data: {...}` line is extracted; malformed JSON is silently skipped.
 * @param {string} text
 * @returns {object[]}
 */
export function parseSseLines(text) {
  const events = [];
  for (const block of text.split('\n\n')) {
    for (const line of block.split('\n')) {
      if (line.startsWith('data: ')) {
        try { events.push(JSON.parse(line.slice(6))); } catch { /* skip malformed */ }
      }
    }
  }
  return events;
}

/**
 * @param {{ gateway?: string, enabled?: boolean }} options
 */
export function createAgentMuxClient(options = {}) {
  const { gateway = '', enabled = false } = options;

  return {
    role: 'agent-mux-client',

    isAvailable() {
      return enabled && !!gateway;
    },

    /**
     * Query adapter capabilities from the gateway.
     * GET {gateway}/api/v1/agents/{adapter}/capabilities
     * @param {string} adapter
     * @returns {Promise<object|null>}
     */
    async queryCapabilities(adapter) {
      if (!this.isAvailable()) return null;
      try {
        const { status, body } = await httpRequest(`${gateway}/api/v1/agents/${encodeURIComponent(adapter)}/capabilities`);
        if (status >= 200 && status < 300) return body;
        return null;
      } catch {
        return null;
      }
    },

    /**
     * Launch a new agent session through the gateway.
     * POST {gateway}/api/v1/sessions
     * @param {{ stack: object, contextBundle?: object, permissionSnapshot?: object, workspace?: object }} params
     * @returns {Promise<{ runId: string, sessionId: string }|null>}
     */
    async launchSession({ stack, contextBundle, permissionSnapshot, workspace }) {
      if (!this.isAvailable()) return null;
      try {
        const payload = {
          agent: stack?.baseAgent,
          model: stack?.model,
          prompt: contextBundle?.prompt,
          systemPrompt: contextBundle?.systemPrompt,
          attachments: contextBundle?.attachments,
          workspace: workspace?.mountPath || '/workspace',
        };
        const { status, body } = await httpRequest(`${gateway}/api/v1/sessions`, { method: 'POST', body: payload });
        if (status >= 200 && status < 300 && body?.runId && body?.sessionId) {
          return { runId: body.runId, sessionId: body.sessionId };
        }
        return null;
      } catch {
        return null;
      }
    },

    /**
     * Get session status from the gateway.
     * GET {gateway}/api/v1/sessions/{sessionId}
     * @param {string} sessionId
     * @returns {Promise<object|null>}
     */
    async getSessionStatus(sessionId) {
      if (!this.isAvailable()) return null;
      try {
        const { status, body } = await httpRequest(`${gateway}/api/v1/sessions/${encodeURIComponent(sessionId)}`);
        if (status >= 200 && status < 300) return body;
        return null;
      } catch {
        return null;
      }
    },

    /**
     * Subscribe to SSE events for a run. Reconnects with exponential backoff (1s, 2s, 4s... max 30s).
     * GET {gateway}/api/v1/runs/{runId}/events (Accept: text/event-stream)
     * @param {string} runId
     * @param {(event: object) => void} callback
     * @returns {{ abort: () => void }}
     */
    subscribeToEvents(runId, callback) {
      let aborted = false;
      let currentReq = null;
      let backoff = 1000;

      const connect = () => {
        if (aborted) return;
        try {
          const parsed = new URL(`${gateway}/api/v1/runs/${encodeURIComponent(runId)}/events`);
          const transport = parsed.protocol === 'https:' ? https : http;
          const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: { 'Accept': 'text/event-stream' },
          };
          currentReq = transport.request(opts, (res) => {
            if (aborted) return;
            // Reset backoff on successful connection
            backoff = 1000;
            let buffer = '';
            res.on('data', (chunk) => {
              if (aborted) return;
              buffer += chunk.toString();
              // Process complete SSE blocks (separated by double newlines)
              const parts = buffer.split('\n\n');
              // Keep the last part as it may be incomplete
              buffer = parts.pop() || '';
              for (const block of parts) {
                for (const line of block.split('\n')) {
                  if (line.startsWith('data: ')) {
                    try {
                      callback(JSON.parse(line.slice(6)));
                    } catch { /* skip malformed */ }
                  }
                }
              }
            });
            res.on('end', () => {
              if (!aborted) reconnect();
            });
            res.on('error', () => {
              if (!aborted) reconnect();
            });
          });
          currentReq.on('error', () => {
            if (!aborted) reconnect();
          });
          currentReq.end();
        } catch {
          if (!aborted) reconnect();
        }
      };

      const reconnect = () => {
        if (aborted) return;
        const delay = backoff;
        backoff = Math.min(backoff * 2, 30000);
        setTimeout(connect, delay);
      };

      connect();

      return {
        abort() {
          aborted = true;
          if (currentReq) {
            currentReq.destroy();
            currentReq = null;
          }
        }
      };
    },

    /**
     * Create a local agent session by spawning an agent-mux subprocess directly.
     * Used when no gateway is available or for local development.
     *
     * @param {{ adapter: string, provider?: string, model?: string, workspace?: string, prompt?: string, env?: Record<string,string>, spawnFn?: Function, cliPath?: string, timeout?: number }} config
     * @returns {Promise<{ pid: number, sessionId: string, runId: string, stdin: import('node:stream').Writable, stdout: import('node:stream').Readable, stderr: import('node:stream').Readable, process: import('node:child_process').ChildProcess }>}
     */
    async createLocalSession(config = {}) {
      const {
        adapter,
        provider = 'anthropic',
        model,
        workspace,
        prompt,
        env = {},
        spawnFn = spawn,
        cliPath = 'node',
        timeout = 30000,
      } = config;

      // Validate adapter
      if (!adapter || typeof adapter !== 'string') {
        throw new Error('createLocalSession requires a valid adapter name');
      }
      if (!KNOWN_ADAPTERS.has(adapter)) {
        throw new Error(`Unknown adapter: ${adapter}. Known adapters: ${[...KNOWN_ADAPTERS].join(', ')}`);
      }

      // Build command args: node packages/agent-mux/cli/dist/index.js launch <adapter> <provider>
      const scriptPath = config.scriptPath || 'packages/agent-mux/cli/dist/index.js';
      const args = [scriptPath, 'launch', adapter, provider];
      if (model) { args.push('--model', model); }
      if (prompt) { args.push('--prompt', prompt); }
      if (workspace) { args.push('--workspace', workspace); }
      args.push('--json');

      // Merge env vars
      const childEnv = {
        ...process.env,
        ...env,
      };
      if (workspace) childEnv.KRATE_WORKSPACE_PATH = workspace;

      // Spawn subprocess
      const child = spawnFn(cliPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: childEnv,
      });

      // Wait for sessionId/runId from stdout (first JSON line) or timeout
      const sessionId = `local-${randomUUID()}`;
      const runId = `local-run-${randomUUID()}`;
      let resolvedIds = { sessionId, runId };

      const idPromise = new Promise((resolve, reject) => {
        let buffer = '';
        const timer = setTimeout(() => {
          resolve(resolvedIds); // Use generated IDs on timeout
        }, timeout);

        const onData = (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.sessionId || parsed.runId) {
                resolvedIds = {
                  sessionId: parsed.sessionId || sessionId,
                  runId: parsed.runId || runId,
                };
                clearTimeout(timer);
                child.stdout.removeListener('data', onData);
                resolve(resolvedIds);
                return;
              }
            } catch { /* not JSON yet, keep buffering */ }
          }
          // Keep last partial line
          buffer = lines[lines.length - 1] || '';
        };
        child.stdout.on('data', onData);

        child.on('error', (err) => {
          clearTimeout(timer);
          reject(err);
        });

        child.on('exit', (code) => {
          clearTimeout(timer);
          if (code !== 0 && code !== null) {
            reject(new Error(`Agent subprocess exited with code ${code}`));
          } else {
            resolve(resolvedIds);
          }
        });
      });

      const ids = await idPromise;

      return {
        pid: child.pid,
        sessionId: ids.sessionId,
        runId: ids.runId,
        stdin: child.stdin,
        stdout: child.stdout,
        stderr: child.stderr,
        process: child,
      };
    },

    /**
     * Send a task to a running local agent session via its stdin and stream the response.
     *
     * @param {{ stdin: import('node:stream').Writable, stdout: import('node:stream').Readable, process: import('node:child_process').ChildProcess }} session
     * @param {{ type?: string, prompt?: string, payload?: any }} task
     * @param {{ timeout?: number }} options
     * @returns {Promise<{ success: boolean, response: object|null, events: object[] }>}
     */
    async executeAgentTask(session, task, { timeout = 60000 } = {}) {
      if (!session || !session.stdin || !session.stdout) {
        throw new Error('executeAgentTask requires a valid session with stdin/stdout');
      }

      const taskPayload = JSON.stringify({
        type: task.type || 'task',
        prompt: task.prompt,
        payload: task.payload,
        timestamp: new Date().toISOString(),
      }) + '\n';

      const events = [];
      let response = null;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          session.stdout.removeListener('data', onData);
          resolve({ success: false, response: null, events, timedOut: true });
        }, timeout);

        const onData = (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              events.push(parsed);
              if (parsed.type === 'completion' || parsed.type === 'result') {
                response = parsed;
                clearTimeout(timer);
                session.stdout.removeListener('data', onData);
                resolve({ success: true, response, events });
                return;
              }
              if (parsed.type === 'error') {
                response = parsed;
                clearTimeout(timer);
                session.stdout.removeListener('data', onData);
                resolve({ success: false, response, events });
                return;
              }
            } catch { /* partial line */ }
          }
        };

        session.stdout.on('data', onData);

        // Write task
        try {
          session.stdin.write(taskPayload);
        } catch (err) {
          clearTimeout(timer);
          session.stdout.removeListener('data', onData);
          reject(new Error(`Failed to write to agent stdin: ${err.message}`));
        }
      });
    },

    /**
     * Terminate a local agent session by killing the subprocess.
     * @param {{ process: import('node:child_process').ChildProcess, pid?: number }} session
     * @returns {{ killed: boolean, pid: number|undefined }}
     */
    terminateSession(session) {
      if (!session || !session.process) {
        return { killed: false, pid: undefined };
      }
      const pid = session.process.pid || session.pid;
      try {
        session.process.kill('SIGTERM');
        return { killed: true, pid };
      } catch {
        return { killed: false, pid };
      }
    },

    /**
     * Reconcile SSE events into an AgentSessionTranscript resource.
     * Parses events by role, computes cost, creates the resource via createResource().
     * @param {string} sessionId
     * @param {object[]} events
     * @param {{ namespace?: string, organizationRef?: string }} options
     * @returns {object} AgentSessionTranscript resource
     */
    reconcileTranscript(sessionId, events, { namespace = 'default', organizationRef = 'default' } = {}) {
      const messages = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const event of events) {
        if (!event || typeof event !== 'object') continue;
        const role = event.role || 'unknown';
        const content = event.content || event.text || event.message || '';
        const node = {
          role,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          timestamp: event.timestamp || new Date().toISOString(),
        };
        if (event.toolUse) node.toolUse = event.toolUse;
        if (event.toolResult) node.toolResult = event.toolResult;
        messages.push(node);

        // Accumulate token usage if present
        if (event.usage) {
          totalInputTokens += event.usage.inputTokens || 0;
          totalOutputTokens += event.usage.outputTokens || 0;
        }
      }

      return createResource(
        'AgentSessionTranscript',
        { name: `transcript-${sessionId}`, namespace },
        {
          organizationRef,
          sessionRef: sessionId,
          messages,
          cost: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
          },
        },
        { phase: 'Reconciled', reconciledAt: new Date().toISOString() }
      );
    },
  };
}
