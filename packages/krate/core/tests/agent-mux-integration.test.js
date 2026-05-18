import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { EventEmitter } from 'node:events';
import { createAgentMuxClient, createAgentDispatchController, createResource, createEventBus } from '../src/index.js';

// ---------------------------------------------------------------------------
// Mock subprocess helper
// ---------------------------------------------------------------------------

function createMockProcess({ exitCode = 0, stdoutData = [], stderrData = [], emitError = false } = {}) {
  const proc = new EventEmitter();
  proc.stdin = {
    _written: [],
    write(data) { this._written.push(data); return true; },
    end() {},
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = 12345;
  proc.killed = false;
  proc.kill = function (sig) {
    this.killed = true;
    this._killSignal = sig;
    return true;
  };

  // Schedule stdout data emission
  if (stdoutData.length > 0) {
    setImmediate(() => {
      for (const chunk of stdoutData) {
        proc.stdout.emit('data', Buffer.from(chunk));
      }
    });
  }

  // Schedule stderr data emission
  if (stderrData.length > 0) {
    setImmediate(() => {
      for (const chunk of stderrData) {
        proc.stderr.emit('data', Buffer.from(chunk));
      }
    });
  }

  // Schedule error or exit
  if (emitError) {
    setImmediate(() => proc.emit('error', new Error('spawn failed')));
  } else if (exitCode !== null && stdoutData.length === 0) {
    setImmediate(() => proc.emit('exit', exitCode));
  }

  return proc;
}

function createMockSpawn(mockProcess) {
  const calls = [];
  const fn = (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    return mockProcess;
  };
  fn.calls = calls;
  return fn;
}

// ---------------------------------------------------------------------------
// Helpers for dispatch controller tests
// ---------------------------------------------------------------------------

function makeStack(name, specOverrides = {}) {
  return createResource('AgentStack', { name, namespace: 'krate-org-default' }, {
    organizationRef: 'default',
    baseAgent: 'claude-code',
    adapter: 'anthropic',
    runtimeIdentity: { serviceAccountRef: 'sa-default' },
    ...specOverrides,
  });
}

function buildValidResources(stackName, specOverrides = {}) {
  return {
    AgentStack: [makeStack(stackName, specOverrides)],
    AgentServiceAccount: [createResource('AgentServiceAccount', { name: 'sa-default', namespace: 'krate-org-default' }, {
      organizationRef: 'default', namespace: 'krate-org-default', serviceAccountName: 'sa-default',
    })],
    AgentRoleBinding: [createResource('AgentRoleBinding', { name: 'rb-1', namespace: 'krate-org-default' }, {
      organizationRef: 'default', subject: 'sa-default', roleRef: 'agent-developer', scope: 'namespace',
    })],
    AgentSecretGrant: [createResource('AgentSecretGrant', { name: 'sg-model', namespace: 'krate-org-default' }, {
      organizationRef: 'default', subject: 'sa-default', secretRef: 'secret-model-provider', purpose: 'model-provider',
    })],
  };
}

// ============================================================================
// PRIORITY 1: Agent-Mux Session Manager Integration
// ============================================================================

describe('createLocalSession', () => {
  it('builds correct command with adapter/provider/model', async () => {
    const sessionJson = JSON.stringify({ sessionId: 'sess-abc', runId: 'run-xyz' }) + '\n';
    const proc = createMockProcess({ stdoutData: [sessionJson] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({ gateway: '', enabled: false });

    const session = await client.createLocalSession({
      adapter: 'claude-code',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      spawnFn: mockSpawn,
    });

    assert.equal(mockSpawn.calls.length, 1);
    const call = mockSpawn.calls[0];
    assert.ok(call.args.includes('launch'));
    assert.ok(call.args.includes('claude-code'));
    assert.ok(call.args.includes('anthropic'));
    assert.ok(call.args.includes('--model'));
    assert.ok(call.args.includes('claude-sonnet-4-20250514'));
    assert.equal(session.sessionId, 'sess-abc');
    assert.equal(session.runId, 'run-xyz');
  });

  it('sets workspace env vars', async () => {
    const sessionJson = JSON.stringify({ sessionId: 's1', runId: 'r1' }) + '\n';
    const proc = createMockProcess({ stdoutData: [sessionJson] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({ gateway: '', enabled: false });

    await client.createLocalSession({
      adapter: 'claude-code',
      workspace: '/tmp/workspace',
      spawnFn: mockSpawn,
      env: { KRATE_ORG: 'acme', BABYSITTER_RUNS_DIR: '/runs' },
    });

    const call = mockSpawn.calls[0];
    assert.equal(call.opts.env.KRATE_WORKSPACE_PATH, '/tmp/workspace');
    assert.equal(call.opts.env.KRATE_ORG, 'acme');
    assert.equal(call.opts.env.BABYSITTER_RUNS_DIR, '/runs');
  });

  it('captures sessionId from stdout JSON', async () => {
    const sessionJson = JSON.stringify({ sessionId: 'captured-sess', runId: 'captured-run' }) + '\n';
    const proc = createMockProcess({ stdoutData: [sessionJson] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    const session = await client.createLocalSession({
      adapter: 'claude-code',
      spawnFn: mockSpawn,
    });

    assert.equal(session.sessionId, 'captured-sess');
    assert.equal(session.runId, 'captured-run');
    assert.equal(session.pid, 12345);
    assert.ok(session.stdin);
    assert.ok(session.stdout);
    assert.ok(session.stderr);
    assert.ok(session.process);
  });

  it('generates fallback IDs when stdout has no JSON', async () => {
    const proc = createMockProcess({ stdoutData: ['not json data\n'] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    // Use a short timeout so test doesn't hang
    const session = await client.createLocalSession({
      adapter: 'claude-code',
      spawnFn: mockSpawn,
      timeout: 100,
    });

    assert.ok(session.sessionId.startsWith('local-'));
    assert.ok(session.runId.startsWith('local-run-'));
  });

  it('rejects when adapter not found', async () => {
    const client = createAgentMuxClient({});
    await assert.rejects(
      () => client.createLocalSession({ adapter: 'unknown-adapter', spawnFn: createMockSpawn(createMockProcess()) }),
      { message: /Unknown adapter: unknown-adapter/ }
    );
  });

  it('rejects when adapter is empty', async () => {
    const client = createAgentMuxClient({});
    await assert.rejects(
      () => client.createLocalSession({ adapter: '', spawnFn: createMockSpawn(createMockProcess()) }),
      { message: /requires a valid adapter name/ }
    );
  });

  it('rejects when spawn emits error', async () => {
    const proc = createMockProcess({ emitError: true });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    await assert.rejects(
      () => client.createLocalSession({ adapter: 'claude-code', spawnFn: mockSpawn }),
      { message: /spawn failed/ }
    );
  });

  it('rejects when subprocess exits with non-zero code', async () => {
    const proc = createMockProcess({ exitCode: 1 });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    await assert.rejects(
      () => client.createLocalSession({ adapter: 'claude-code', spawnFn: mockSpawn }),
      { message: /exited with code 1/ }
    );
  });

  it('includes --prompt and --workspace flags when provided', async () => {
    const sessionJson = JSON.stringify({ sessionId: 's', runId: 'r' }) + '\n';
    const proc = createMockProcess({ stdoutData: [sessionJson] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    await client.createLocalSession({
      adapter: 'claude-code',
      prompt: 'Fix the bug',
      workspace: '/work',
      spawnFn: mockSpawn,
    });

    const args = mockSpawn.calls[0].args;
    assert.ok(args.includes('--prompt'));
    assert.ok(args.includes('Fix the bug'));
    assert.ok(args.includes('--workspace'));
    assert.ok(args.includes('/work'));
  });

  it('includes --json flag', async () => {
    const sessionJson = JSON.stringify({ sessionId: 's', runId: 'r' }) + '\n';
    const proc = createMockProcess({ stdoutData: [sessionJson] });
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    await client.createLocalSession({
      adapter: 'claude-code',
      spawnFn: mockSpawn,
    });

    assert.ok(mockSpawn.calls[0].args.includes('--json'));
  });
});

describe('executeAgentTask', () => {
  it('writes to stdin and reads response', async () => {
    const proc = createMockProcess({});
    const mockSpawn = createMockSpawn(proc);
    const client = createAgentMuxClient({});

    // Pre-build a session handle
    const session = {
      stdin: proc.stdin,
      stdout: proc.stdout,
      stderr: proc.stderr,
      process: proc,
    };

    // Schedule a completion response
    setImmediate(() => {
      proc.stdout.emit('data', Buffer.from(
        JSON.stringify({ type: 'completion', content: 'Done!' }) + '\n'
      ));
    });

    const result = await client.executeAgentTask(session, { prompt: 'Fix the tests' });

    assert.equal(result.success, true);
    assert.equal(result.response.type, 'completion');
    assert.equal(result.response.content, 'Done!');
    assert.ok(proc.stdin._written.length > 0);
    const written = JSON.parse(proc.stdin._written[0].trim());
    assert.equal(written.prompt, 'Fix the tests');
    assert.equal(written.type, 'task');
  });

  it('returns failure on error event', async () => {
    const proc = createMockProcess({});
    const client = createAgentMuxClient({});
    const session = { stdin: proc.stdin, stdout: proc.stdout, stderr: proc.stderr, process: proc };

    setImmediate(() => {
      proc.stdout.emit('data', Buffer.from(
        JSON.stringify({ type: 'error', message: 'Something failed' }) + '\n'
      ));
    });

    const result = await client.executeAgentTask(session, { prompt: 'Do something' });
    assert.equal(result.success, false);
    assert.equal(result.response.type, 'error');
  });

  it('times out when no response arrives', async () => {
    const proc = createMockProcess({});
    const client = createAgentMuxClient({});
    const session = { stdin: proc.stdin, stdout: proc.stdout, stderr: proc.stderr, process: proc };

    const result = await client.executeAgentTask(session, { prompt: 'Hang' }, { timeout: 50 });
    assert.equal(result.success, false);
    assert.equal(result.timedOut, true);
  });

  it('collects intermediate events before completion', async () => {
    const proc = createMockProcess({});
    const client = createAgentMuxClient({});
    const session = { stdin: proc.stdin, stdout: proc.stdout, stderr: proc.stderr, process: proc };

    setImmediate(() => {
      proc.stdout.emit('data', Buffer.from(
        JSON.stringify({ type: 'progress', content: 'Working...' }) + '\n' +
        JSON.stringify({ type: 'completion', content: 'Done' }) + '\n'
      ));
    });

    const result = await client.executeAgentTask(session, { prompt: 'Work' });
    assert.equal(result.success, true);
    assert.equal(result.events.length, 2);
    assert.equal(result.events[0].type, 'progress');
    assert.equal(result.events[1].type, 'completion');
  });

  it('rejects when session is null', async () => {
    const client = createAgentMuxClient({});
    await assert.rejects(
      () => client.executeAgentTask(null, { prompt: 'test' }),
      { message: /requires a valid session/ }
    );
  });
});

describe('terminateSession', () => {
  it('kills subprocess on terminate', () => {
    const proc = createMockProcess({});
    const client = createAgentMuxClient({});
    const session = { process: proc, pid: proc.pid };

    const result = client.terminateSession(session);
    assert.equal(result.killed, true);
    assert.equal(result.pid, 12345);
    assert.equal(proc.killed, true);
    assert.equal(proc._killSignal, 'SIGTERM');
  });

  it('returns killed=false when session is null', () => {
    const client = createAgentMuxClient({});
    const result = client.terminateSession(null);
    assert.equal(result.killed, false);
    assert.equal(result.pid, undefined);
  });

  it('returns killed=false when process has no kill', () => {
    const client = createAgentMuxClient({});
    const result = client.terminateSession({ process: {} });
    assert.equal(result.killed, false);
  });
});

describe('fallback to HTTP gateway when KRATE_CONTROLLER_URL is set', () => {
  it('isAvailable returns true only when gateway is set and enabled', () => {
    const localClient = createAgentMuxClient({ gateway: '', enabled: false });
    assert.equal(localClient.isAvailable(), false);

    const gwClient = createAgentMuxClient({ gateway: 'http://localhost:8080', enabled: true });
    assert.equal(gwClient.isAvailable(), true);
  });

  it('launchSession uses HTTP gateway when available', async () => {
    // Just verify the gateway path returns null for unavailable (no real HTTP call)
    const client = createAgentMuxClient({ gateway: '', enabled: false });
    const result = await client.launchSession({ stack: { baseAgent: 'claude-code' } });
    assert.equal(result, null);
  });
});

// ============================================================================
// PRIORITY 2: Stack Resolution
// ============================================================================

describe('resolveStack', () => {
  it('resolves basic stack with defaults', () => {
    const stack = makeStack('basic-stack');
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.equal(config.adapter, 'anthropic');
    assert.equal(config.provider, 'anthropic');
    assert.equal(config.model, 'claude-sonnet-4-20250514');
    assert.equal(config.approvalMode, 'prompt');
    assert.deepEqual(config.mcpServers, []);
    assert.deepEqual(config.skills, []);
    assert.equal(config.env.KRATE_ORG, 'default');
    assert.equal(config.env.KRATE_STACK_NAME, 'basic-stack');
  });

  it('uses explicit model, provider, and adapter from spec', () => {
    const stack = makeStack('custom-stack', {
      adapter: 'codex',
      provider: 'openai',
      model: 'o3-pro',
      approvalMode: 'auto-approve',
    });
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.equal(config.adapter, 'codex');
    assert.equal(config.provider, 'openai');
    assert.equal(config.model, 'o3-pro');
    assert.equal(config.approvalMode, 'auto-approve');
  });

  it('includes prompt fields from spec', () => {
    const stack = makeStack('prompt-stack', {
      systemPrompt: 'You are a helpful agent.',
      developerPrompt: 'Follow best practices.',
      taskPrompt: 'Fix the CI pipeline.',
    });
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.equal(config.prompt.system, 'You are a helpful agent.');
    assert.equal(config.prompt.developer, 'Follow best practices.');
    assert.equal(config.prompt.task, 'Fix the CI pipeline.');
  });

  it('includes mcpServerRefs and skillRefs', () => {
    const stack = makeStack('refs-stack', {
      mcpServerRefs: ['mcp-github', 'mcp-slack'],
      skillRefs: ['skill-review', 'skill-deploy'],
    });
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.deepEqual(config.mcpServers, ['mcp-github', 'mcp-slack']);
    assert.deepEqual(config.skills, ['skill-review', 'skill-deploy']);
  });

  it('falls back to baseAgent when adapter is not set', () => {
    const stack = makeStack('fallback-stack');
    // Remove adapter, keep baseAgent
    delete stack.spec.adapter;
    stack.spec.baseAgent = 'gemini-cli';
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.equal(config.adapter, 'gemini-cli');
  });

  it('uses provided organizationRef in env', () => {
    const stack = makeStack('org-stack');
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack, { organizationRef: 'acme-corp' });
    assert.equal(config.env.KRATE_ORG, 'acme-corp');
  });

  it('throws for null stack', () => {
    const controller = createAgentDispatchController();
    assert.throws(() => controller.resolveStack(null), { message: /requires a valid AgentStack/ });
  });

  it('throws for stack without spec', () => {
    const controller = createAgentDispatchController();
    assert.throws(() => controller.resolveStack({ metadata: { name: 'bad' } }), { message: /requires a valid AgentStack/ });
  });

  it('returns null prompts when none set', () => {
    const stack = makeStack('noprompt-stack');
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    assert.equal(config.prompt.system, null);
    assert.equal(config.prompt.developer, null);
    assert.equal(config.prompt.task, null);
  });

  it('clones arrays to prevent mutation', () => {
    const stack = makeStack('clone-stack', {
      mcpServerRefs: ['mcp-a'],
      skillRefs: ['skill-b'],
    });
    const controller = createAgentDispatchController();

    const config = controller.resolveStack(stack);
    config.mcpServers.push('mcp-c');
    config.skills.push('skill-d');

    // Original spec should be unchanged
    assert.equal(stack.spec.mcpServerRefs.length, 1);
    assert.equal(stack.spec.skillRefs.length, 1);
  });
});

// ============================================================================
// PRIORITY 3: Event Persistence
// ============================================================================

describe('persistSessionEvent', () => {
  function makeRunAndAttempt() {
    const run = createResource('AgentDispatchRun', { name: 'run-1', namespace: 'krate-org-default' }, {
      organizationRef: 'default',
      repository: 'test-repo',
      sourceRefs: ['main'],
      agentStack: 'test-stack',
      taskKind: 'diagnostic',
      contextBundleRef: 'bundle-1',
    });
    run.status = { phase: 'Running', queuedAt: new Date().toISOString() };

    const attempt = createResource('AgentDispatchAttempt', { name: 'run-1-attempt-1', namespace: 'krate-org-default' }, {
      organizationRef: 'default',
      agentDispatchRun: 'run-1',
      attemptReason: 'initial',
      agentStackSnapshot: {},
      contextBundleDigest: 'sha256:abc',
    });
    attempt.status = { agentMuxSessionId: 'sess-42', agentMuxRunId: 'amux-42', startedAt: new Date().toISOString() };

    return { run, attempt };
  }

  it('appends message to transcript', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();
    const event = { role: 'assistant', content: 'Working on it...', timestamp: '2026-01-01T00:00:01Z' };

    const result = controller.persistSessionEvent(event, run, attempt, {
      namespace: 'krate-org-default',
      organizationRef: 'default',
    });

    assert.ok(result.transcript);
    assert.equal(result.transcript.spec.messages.length, 1);
    assert.equal(result.transcript.spec.messages[0].role, 'assistant');
    assert.equal(result.transcript.spec.messages[0].content, 'Working on it...');
  });

  it('creates transcript if none provided', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { role: 'user', content: 'Hello' },
      run, attempt,
      { namespace: 'krate-org-default', organizationRef: 'default' }
    );

    assert.equal(result.transcript.kind, 'AgentSessionTranscript');
    assert.equal(result.transcript.spec.sessionRef, 'sess-42');
    assert.equal(result.transcript.status.phase, 'Streaming');
  });

  it('reuses existing transcript and appends', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();
    const transcript = createResource('AgentSessionTranscript', { name: 'transcript-sess-42', namespace: 'krate-org-default' }, {
      organizationRef: 'default',
      sessionRef: 'sess-42',
      messages: [{ role: 'user', content: 'First', timestamp: '2026-01-01T00:00:00Z' }],
      cost: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    }, { phase: 'Streaming' });

    const result = controller.persistSessionEvent(
      { role: 'assistant', content: 'Second', usage: { inputTokens: 100, outputTokens: 50 } },
      run, attempt,
      { transcript }
    );

    assert.equal(result.transcript.spec.messages.length, 2);
    assert.equal(result.transcript.spec.messages[1].content, 'Second');
    assert.equal(result.transcript.spec.cost.inputTokens, 110);
    assert.equal(result.transcript.spec.cost.outputTokens, 55);
    assert.equal(result.transcript.spec.cost.totalTokens, 165);
  });

  it('marks run as Completed on completion event', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { type: 'completion', role: 'assistant', content: 'All done' },
      run, attempt,
      { namespace: 'krate-org-default', organizationRef: 'default' }
    );

    assert.equal(result.run.status.phase, 'Completed');
    assert.ok(result.run.status.completedAt);
    assert.ok(result.attempt.status.completedAt);
    assert.equal(result.transcript.status.phase, 'Reconciled');
  });

  it('marks run as Failed on error event', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { type: 'error', error: 'Out of tokens' },
      run, attempt,
      { namespace: 'krate-org-default', organizationRef: 'default' }
    );

    assert.equal(result.run.status.phase, 'Failed');
    assert.ok(result.run.status.failedAt);
    assert.equal(result.run.status.failureReason, 'Out of tokens');
    assert.ok(result.attempt.status.failedAt);
    assert.equal(result.transcript.status.phase, 'Failed');
  });

  it('creates notification on completion', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { type: 'completion', role: 'assistant', content: 'Done' },
      run, attempt,
      { organizationRef: 'acme' }
    );

    assert.ok(result.notification);
    assert.equal(result.notification.type, 'run-complete');
    assert.equal(result.notification.status, 'completed');
    assert.equal(result.notification.org, 'acme');
  });

  it('creates notification on error', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { type: 'error', message: 'Crashed' },
      run, attempt,
      { organizationRef: 'acme' }
    );

    assert.ok(result.notification);
    assert.equal(result.notification.status, 'failed');
  });

  it('emits to event bus on each event', () => {
    const bus = createEventBus();
    const emitted = [];
    bus.subscribe((evt) => emitted.push(evt));

    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController({ eventBus: bus });

    controller.persistSessionEvent(
      { type: 'message', role: 'assistant', content: 'Thinking...' },
      run, attempt,
      { namespace: 'default', organizationRef: 'default' }
    );

    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].type, 'session-event');
    assert.equal(emitted[0].runName, 'run-1');
  });

  it('emits notification event to bus on completion', () => {
    const bus = createEventBus();
    const emitted = [];
    bus.subscribe((evt) => emitted.push(evt));

    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController({ eventBus: bus });

    controller.persistSessionEvent(
      { type: 'completion', role: 'assistant', content: 'Done' },
      run, attempt,
      { namespace: 'default', organizationRef: 'default' }
    );

    // Should emit both session-event and the notification
    assert.equal(emitted.length, 2);
    assert.equal(emitted[0].type, 'session-event');
    assert.equal(emitted[1].type, 'run-complete');
    assert.equal(emitted[1].status, 'completed');
  });

  it('increments eventCount on attempt status', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    controller.persistSessionEvent({ role: 'user', content: 'msg1' }, run, attempt);
    controller.persistSessionEvent({ role: 'assistant', content: 'msg2' }, run, attempt);
    controller.persistSessionEvent({ role: 'assistant', content: 'msg3' }, run, attempt);

    assert.equal(attempt.status.eventCount, 3);
    assert.ok(attempt.status.lastEventAt);
  });

  it('handles null/non-object event gracefully', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(null, run, attempt);
    assert.equal(result.notification, null);
    assert.equal(result.transcript, null);
  });

  it('handles event with toolUse metadata', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    const result = controller.persistSessionEvent(
      { role: 'assistant', content: 'Reading file', toolUse: { name: 'read_file', input: { path: '/tmp/x' } } },
      run, attempt,
      { namespace: 'default', organizationRef: 'default' }
    );

    assert.deepEqual(result.transcript.spec.messages[0].toolUse, { name: 'read_file', input: { path: '/tmp/x' } });
  });

  it('accumulates token costs across multiple events', () => {
    const { run, attempt } = makeRunAndAttempt();
    const controller = createAgentDispatchController();

    let result = controller.persistSessionEvent(
      { role: 'assistant', content: 'A', usage: { inputTokens: 100, outputTokens: 50 } },
      run, attempt,
      { namespace: 'default', organizationRef: 'default' }
    );

    result = controller.persistSessionEvent(
      { role: 'assistant', content: 'B', usage: { inputTokens: 200, outputTokens: 80 } },
      run, attempt,
      { transcript: result.transcript }
    );

    assert.equal(result.transcript.spec.cost.inputTokens, 300);
    assert.equal(result.transcript.spec.cost.outputTokens, 130);
    assert.equal(result.transcript.spec.cost.totalTokens, 430);
  });
});
