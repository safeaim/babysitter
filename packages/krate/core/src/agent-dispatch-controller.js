import { createPermissionReviewer } from './agent-permission-review.js';
import { createAgentStackController } from './agent-stack-controller.js';
import { assembleContextBundle } from './agent-context-bundles.js';
import { createResource, clone } from './resource-model.js';
import { createAgentMuxClient } from './agent-mux-client.js';
import { createAgentMemoryController } from './agent-memory-controller.js';
import { createAgentApprovalController } from './agent-approval-controller.js';
import { createAgentWorkspaceController } from './agent-workspace-controller.js';

export const AGENT_DISPATCH_CONTROLLER_BOUNDARY = {
  role: 'agent-dispatch-controller',
  scope: 'Manual dispatch orchestration with permission gating, context assembly, workspace provisioning, stack resolution, and event persistence',
  owns: ['dispatch creation', 'attempt lifecycle', 'Agent Mux session binding', 'workspace provisioning', 'stack resolution', 'session event persistence'],
  delegatesTo: ['agent-permission-review', 'agent-stack-controller', 'agent-context-bundles', 'agent-mux-client', 'agent-memory-controller', 'agent-approval-controller', 'agent-workspace-controller'],
  mustNotOwn: ['secret values', 'UI rendering']
};

export function createAgentDispatchController(options = {}) {
  const permissionReviewer = options.permissionReviewer || createPermissionReviewer();
  const stackController = options.stackController || createAgentStackController();
  const agentMuxClient = options.agentMuxClient || createAgentMuxClient();
  const memoryController = options.memoryController || createAgentMemoryController();
  const approvalController = options.approvalController || createAgentApprovalController();
  const workspaceController = options.workspaceController || createAgentWorkspaceController();
  const eventBus = options.eventBus || null;

  return {
    role: 'agent-dispatch-controller',

    /**
     * Resolve an AgentStack CRD into a concrete execution config for agent-mux.
     *
     * @param {object} stack - AgentStack resource
     * @param {{ organizationRef?: string }} opts
     * @returns {{ adapter: string, provider: string, model: string, prompt: object, mcpServers: string[], skills: string[], approvalMode: string, env: Record<string,string> }}
     */
    resolveStack(stack, { organizationRef = 'default' } = {}) {
      if (!stack || !stack.spec) {
        throw new Error('resolveStack requires a valid AgentStack resource with spec');
      }
      const spec = stack.spec;
      return {
        adapter: spec.adapter || spec.baseAgent || 'claude-code',
        provider: spec.provider || 'anthropic',
        model: spec.model || 'claude-sonnet-4-20250514',
        prompt: {
          system: spec.systemPrompt || null,
          developer: spec.developerPrompt || null,
          task: spec.taskPrompt || null,
        },
        mcpServers: clone(spec.mcpServerRefs || []),
        skills: clone(spec.skillRefs || []),
        approvalMode: spec.approvalMode || 'prompt',
        env: {
          KRATE_ORG: organizationRef,
          KRATE_STACK_NAME: stack.metadata?.name || 'unknown',
        },
      };
    },

    /**
     * Persist a session event from an agent-mux session.
     * Appends to the transcript, updates the dispatch attempt status,
     * marks the run as Completed/Failed on terminal events, and emits to event bus.
     *
     * @param {object} event - The SSE event object
     * @param {object} run - AgentDispatchRun resource (mutated in place)
     * @param {object} attempt - AgentDispatchAttempt resource (mutated in place)
     * @param {{ namespace?: string, organizationRef?: string, transcript?: object }} opts
     * @returns {{ run: object, attempt: object, transcript: object, notification: object|null }}
     */
    persistSessionEvent(event, run, attempt, { namespace = 'default', organizationRef = 'default', transcript = null } = {}) {
      if (!event || typeof event !== 'object') {
        return { run, attempt, transcript, notification: null };
      }

      const now = new Date().toISOString();

      // 1. Append to AgentSessionTranscript
      if (!transcript) {
        const sessionRef = attempt?.status?.agentMuxSessionId || 'unknown';
        transcript = createResource('AgentSessionTranscript', { name: `transcript-${sessionRef}`, namespace }, {
          organizationRef,
          sessionRef,
          messages: [],
          cost: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        }, { phase: 'Streaming', startedAt: now });
      }

      const role = event.role || 'system';
      const content = event.content || event.text || event.message || '';
      const message = {
        role,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: event.timestamp || now,
      };
      if (event.toolUse) message.toolUse = event.toolUse;
      if (event.toolResult) message.toolResult = event.toolResult;
      transcript.spec.messages.push(message);

      // Accumulate token usage
      if (event.usage) {
        transcript.spec.cost.inputTokens += event.usage.inputTokens || 0;
        transcript.spec.cost.outputTokens += event.usage.outputTokens || 0;
        transcript.spec.cost.totalTokens = transcript.spec.cost.inputTokens + transcript.spec.cost.outputTokens;
      }

      // 2. Update AgentDispatchAttempt status
      attempt.status.lastEventAt = now;
      attempt.status.eventCount = (attempt.status.eventCount || 0) + 1;

      // 3. Terminal event handling
      let notification = null;
      if (event.type === 'completion') {
        run.status.phase = 'Completed';
        run.status.completedAt = now;
        attempt.status.completedAt = now;
        transcript.status.phase = 'Reconciled';
        transcript.status.reconciledAt = now;

        notification = {
          type: 'run-complete',
          status: 'completed',
          name: run.metadata?.name,
          org: organizationRef,
          timestamp: now,
        };
      } else if (event.type === 'error') {
        run.status.phase = 'Failed';
        run.status.failedAt = now;
        run.status.failureReason = event.error || event.message || 'Unknown error';
        attempt.status.failedAt = now;
        attempt.status.failureReason = event.error || event.message || 'Unknown error';
        transcript.status.phase = 'Failed';

        notification = {
          type: 'run-complete',
          status: 'failed',
          name: run.metadata?.name,
          org: organizationRef,
          timestamp: now,
        };
      }

      // 5. Emit to event bus for SSE broadcast
      if (eventBus) {
        eventBus.emit({
          type: 'session-event',
          runName: run.metadata?.name,
          eventType: event.type || 'message',
          timestamp: now,
        });
        if (notification) {
          eventBus.emit(notification);
        }
      }

      return { run, attempt, transcript, notification };
    },

    async createManualDispatch({ repository, ref, sourceRefs = [], agentStack, taskKind, actor, namespace = 'default', organizationRef = 'default', resources = {} }) {
      // 1. Find stack
      const stack = (resources.AgentStack || []).find(s => s.metadata?.name === agentStack);
      if (!stack) return { error: true, reason: 'stack-not-found', message: `AgentStack '${agentStack}' not found` };

      // 2. Permission review
      const review = permissionReviewer.reviewPermissions({ repository, ref, actor, agentStack, resources });
      if (review.decision === 'denied') {
        return { error: true, reason: 'permission-denied', message: 'Dispatch denied by permission review', review };
      }
      const permissionSnapshot = permissionReviewer.createPermissionSnapshot(review);

      // 3. Memory snapshot — create if any AgentMemoryRepository exists in resources
      let memorySnapshot = null;
      const memoryRepos = resources.AgentMemoryRepository || [];
      if (memoryRepos.length > 0) {
        const memRepo = memoryRepos[0];
        const timeTravel = memoryController.resolveTimeTravel({ mode: 'current', commits: [] });
        memorySnapshot = memoryController.createMemorySnapshot({
          memoryRepository: memRepo.metadata.name,
          requestedRef: ref,
          resolvedCommit: timeTravel.resolvedCommit || ref,
          queryManifest: {},
          selectedRecords: [],
          selectedDocuments: [],
          ontologyDigest: '',
          namespace,
          organizationRef,
        });
      }

      // 4. Approval gate — if review requires approval, create approval and return early
      if (review.decision === 'requires-approval') {
        const now = new Date().toISOString();
        const runName = `dispatch-${Date.now()}`;

        const run = createResource('AgentDispatchRun', { name: runName, namespace }, {
          organizationRef,
          repository,
          sourceRefs: clone(sourceRefs),
          agentStack,
          taskKind: taskKind || 'diagnostic',
          contextBundleRef: null,
        });
        run.status = { phase: 'AwaitingApproval', queuedAt: now };
        if (memorySnapshot) {
          run.spec.memorySnapshotRef = memorySnapshot.metadata.name;
        }

        const approvalResult = approvalController.createApprovalRequest({
          dispatchRun: runName,
          action: 'secret-access',
          requestedBy: actor,
          context: `Dispatch requires approval for agent stack: ${agentStack}`,
          namespace,
          organizationRef,
          resources,
        });

        return {
          error: false,
          run,
          approval: approvalResult.error ? null : approvalResult.approval,
          awaitingApproval: true,
          memorySnapshot,
          permissionSnapshot,
          review,
        };
      }

      // 5. Workspace provisioning — reuse or create
      let workspaceResult = null;
      let mountSpec = null;
      const branch = ref || 'main';

      const reusable = workspaceController.findReusableWorkspace({
        organizationRef, repository, branch, resources,
      });

      if (reusable) {
        const claimResult = workspaceController.claimWorkspace({
          name: reusable.metadata.name,
          runRef: `dispatch-pending`,
          resources,
        });
        if (!claimResult.error) {
          workspaceResult = { workspace: claimResult.workspace, reused: true };
          const mount = workspaceController.getMountSpec({ workspace: claimResult.workspace });
          if (!mount.error) mountSpec = { volume: mount.volume, volumeMount: mount.volumeMount };
        }
      }

      if (!workspaceResult) {
        const createResult = workspaceController.createWorkspace({
          organizationRef, repository, branch, namespace,
          volumeSpec: {},
        });
        if (!createResult.error) {
          workspaceResult = { workspace: createResult.workspace, pvcManifest: createResult.pvcManifest, reused: false };
          const mount = workspaceController.getMountSpec({ workspace: createResult.workspace });
          if (!mount.error) mountSpec = { volume: mount.volume, volumeMount: mount.volumeMount };
        }
      }

      // 6. Assemble context bundle
      const contextBundle = assembleContextBundle({ stack, repository, ref, sourceRefs, contextLabels: [], resources });

      // 7. Create resources
      const now = new Date().toISOString();
      const runName = `dispatch-${Date.now()}`;

      const run = createResource('AgentDispatchRun', { name: runName, namespace }, {
        organizationRef,
        repository,
        sourceRefs: clone(sourceRefs),
        agentStack,
        taskKind: taskKind || 'diagnostic',
        contextBundleRef: contextBundle.metadata.name,
      });
      run.status = { phase: 'Pending', queuedAt: now };
      if (memorySnapshot) {
        run.spec.memorySnapshotRef = memorySnapshot.metadata.name;
      }
      if (workspaceResult) {
        run.spec.workspaceRef = workspaceResult.workspace.metadata.name;
      }
      if (mountSpec) {
        run.spec.mountSpec = mountSpec;
      }

      // Update workspace runRef to actual dispatch name
      if (workspaceResult) {
        workspaceResult.workspace.status.runRef = runName;
      }

      const attempt = createResource('AgentDispatchAttempt', { name: `${runName}-attempt-1`, namespace }, {
        organizationRef,
        agentDispatchRun: runName,
        attemptReason: 'initial',
        agentStackSnapshot: clone(stack.spec),
        contextBundleDigest: contextBundle.spec.digest,
      });
      attempt.status = { permissionSnapshot, queueEnteredAt: now };

      // 7. Try Agent Mux launch
      let transcript = null;
      if (agentMuxClient.isAvailable()) {
        try {
          const session = await agentMuxClient.launchSession({ stack, contextBundle, permissionSnapshot });
          if (session && session.runId) {
            attempt.status.agentMuxRunId = session.runId;
            attempt.status.agentMuxSessionId = session.sessionId;
            run.status.phase = 'Running';
            attempt.status.startedAt = now;

            // 8. After successful launch — start SSE subscription + create initial transcript
            const collectedEvents = [];
            const subscription = agentMuxClient.subscribeToEvents(session.runId, (event) => {
              collectedEvents.push(event);
            });
            run.status.sseSubscription = { runId: session.runId, active: true };

            transcript = agentMuxClient.reconcileTranscript(session.sessionId, collectedEvents, { namespace, organizationRef });
            run.status.transcriptRef = transcript.metadata.name;
          } else {
            run.status.phase = 'Queued';
            run.status.conditions = [{ type: 'AgentMuxBound', status: 'False', reason: 'LaunchFailed', message: 'Agent Mux launch returned no session' }];
          }
        } catch {
          run.status.phase = 'Queued';
          run.status.conditions = [{ type: 'AgentMuxBound', status: 'False', reason: 'LaunchFailed' }];
        }
      } else {
        run.status.phase = 'Queued';
        run.status.conditions = [{ type: 'AgentMuxBound', status: 'False', reason: 'Unavailable', message: 'Agent Mux gateway not configured' }];
      }

      return { error: false, run, attempt, contextBundle, permissionSnapshot, memorySnapshot, transcript, workspace: workspaceResult, mountSpec };
    }
  };
}
