import { createHash } from 'node:crypto';
import { clone } from './resource-model.js';

export const AGENT_PERMISSION_REVIEW_BOUNDARY = {
  role: 'agent-permission-review',
  scope: 'Deterministic permission review for agent dispatch decisions',
  owns: ['capability expansion', 'grant resolution', 'permission snapshot creation'],
  delegatesTo: ['resource-model'],
  mustNotOwn: ['secret values', 'native K8s API calls', 'runtime execution']
};

export function createPermissionReviewer(options = {}) {
  return {
    role: 'agent-permission-review',

    reviewPermissions({ repository, ref, actor, agentStack, triggerSource, taskKind, runnerPool, toolRefs = [], skillRefs = [], mcpServerRefs = [], contextLabelRefs = [], resources = {} }) {
      const reasons = [];
      const grants = [];

      // Step 1 — Resolve AgentStack
      const stacks = resources.AgentStack || [];
      const stack = stacks.find((s) => s.metadata?.name === agentStack);
      if (!stack) {
        return buildDecision({ decision: 'denied', reasons: [{ severity: 'error', message: `AgentStack not found: ${agentStack}` }], grants, capabilities: {}, actor, repository, ref, agentStack, taskKind });
      }

      // Step 2 — Expand capabilities from stack spec
      const capabilities = {
        toolRefs: clone(stack.spec?.toolPolicy ? [stack.spec.toolPolicy] : toolRefs),
        mcpServerRefs: clone(stack.spec?.mcpServerRefs || mcpServerRefs),
        skillRefs: clone(stack.spec?.skillRefs || skillRefs),
        subagentRefs: clone(stack.spec?.subagentRefs || [])
      };

      // Step 3 — Check runtime identity (AgentServiceAccount)
      const serviceAccountRef = stack.spec?.runtimeIdentity?.serviceAccountRef || stack.spec?.runtimeIdentity;
      const serviceAccounts = resources.AgentServiceAccount || [];
      const serviceAccount = serviceAccounts.find((sa) => sa.metadata?.name === serviceAccountRef);
      if (!serviceAccount) {
        reasons.push({ severity: 'error', message: `Missing AgentServiceAccount: ${serviceAccountRef}` });
      } else {
        grants.push({ kind: 'AgentServiceAccount', name: serviceAccount.metadata.name, status: 'bound' });
      }

      // Step 4 — Check role bindings
      const roleBindings = resources.AgentRoleBinding || [];
      const matchedBindings = roleBindings.filter((rb) => rb.spec?.subject === serviceAccountRef || rb.spec?.subject === agentStack);
      for (const binding of matchedBindings) {
        grants.push({ kind: 'AgentRoleBinding', name: binding.metadata.name, roleRef: binding.spec?.roleRef, scope: binding.spec?.scope, status: 'bound' });
      }
      if (matchedBindings.length === 0 && serviceAccount) {
        reasons.push({ severity: 'warning', message: `No AgentRoleBinding found for subject: ${serviceAccountRef}` });
      }

      // Step 5 — Check secret grants
      const secretGrants = resources.AgentSecretGrant || [];
      const neededSecrets = collectSecretNeeds(stack, capabilities, resources);
      for (const need of neededSecrets) {
        const match = secretGrants.find((sg) => {
          if (sg.spec?.subject !== serviceAccountRef && sg.spec?.subject !== agentStack) return false;
          if (need.purpose && sg.spec?.purpose !== need.purpose) return false;
          if (sg.spec?.allowedRepositories && sg.spec.allowedRepositories.length > 0 && !sg.spec.allowedRepositories.includes(repository)) return false;
          if (sg.spec?.allowedRefs && sg.spec.allowedRefs.length > 0 && !sg.spec.allowedRefs.includes(ref)) return false;
          return true;
        });
        if (!match) {
          reasons.push({ severity: 'error', message: `Missing AgentSecretGrant for ${need.description} (purpose: ${need.purpose})` });
        } else {
          const grantEntry = { kind: 'AgentSecretGrant', name: match.metadata.name, purpose: match.spec?.purpose, status: 'granted' };
          if (match.spec?.requiredApproval) {
            grantEntry.status = 'requires-approval';
            grantEntry.requiredApproval = match.spec.requiredApproval;
            reasons.push({ severity: 'info', message: `AgentSecretGrant ${match.metadata.name} requires approval: ${match.spec.requiredApproval}` });
          }
          grants.push(grantEntry);
        }
      }

      // Step 6 — Check config grants
      const configGrants = resources.AgentConfigGrant || [];
      const neededConfigs = collectConfigNeeds(stack, capabilities, resources);
      for (const need of neededConfigs) {
        const match = configGrants.find((cg) => {
          if (cg.spec?.subject !== serviceAccountRef && cg.spec?.subject !== agentStack) return false;
          if (need.purpose && cg.spec?.purpose !== need.purpose) return false;
          return true;
        });
        if (!match) {
          reasons.push({ severity: 'error', message: `Missing AgentConfigGrant for ${need.description} (purpose: ${need.purpose})` });
        } else {
          grants.push({ kind: 'AgentConfigGrant', name: match.metadata.name, purpose: match.spec?.purpose, status: 'granted' });
        }
      }

      // Step 7 — Decision
      const hasErrors = reasons.some((r) => r.severity === 'error');
      const hasApprovals = grants.some((g) => g.status === 'requires-approval');
      const decision = hasErrors ? 'denied' : hasApprovals ? 'requires-approval' : 'allowed';

      return buildDecision({ decision, reasons, grants, capabilities, actor, repository, ref, agentStack, taskKind });
    },

    createPermissionSnapshot(reviewResult) {
      const snapshot = clone(reviewResult);
      snapshot.snapshotAt = new Date().toISOString();
      snapshot.frozen = true;
      snapshot.digest = reviewResult.digest;
      return Object.freeze(snapshot);
    }
  };
}

function collectSecretNeeds(stack, capabilities, resources) {
  const needs = [];
  if (stack.spec?.adapter) {
    needs.push({ description: `model provider for adapter ${stack.spec.adapter}`, purpose: 'model-provider' });
  }
  const mcpServers = resources.AgentMcpServer || [];
  for (const ref of capabilities.mcpServerRefs) {
    const server = mcpServers.find((s) => s.metadata?.name === ref);
    if (server?.spec?.secretRef) {
      needs.push({ description: `MCP server ${ref} secret`, purpose: `mcp-server:${ref}` });
    }
  }
  return needs;
}

function collectConfigNeeds(stack, capabilities, resources) {
  const needs = [];
  const mcpServers = resources.AgentMcpServer || [];
  for (const ref of capabilities.mcpServerRefs) {
    const server = mcpServers.find((s) => s.metadata?.name === ref);
    if (server?.spec?.configMapRef) {
      needs.push({ description: `MCP server ${ref} config`, purpose: `mcp-server:${ref}` });
    }
  }
  return needs;
}

function buildDecision({ decision, reasons, grants, capabilities, actor, repository, ref, agentStack, taskKind }) {
  const result = {
    decision,
    actor,
    repository,
    ref,
    agentStack,
    taskKind,
    capabilities: clone(capabilities),
    grants: clone(grants),
    reasons: clone(reasons),
    reviewedAt: new Date().toISOString()
  };
  result.digest = computeDigest(result);
  return result;
}

function computeDigest(result) {
  const keys = Object.keys(result).filter((k) => k !== 'digest' && k !== 'reviewedAt').sort();
  const canonical = {};
  for (const key of keys) canonical[key] = result[key];
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
