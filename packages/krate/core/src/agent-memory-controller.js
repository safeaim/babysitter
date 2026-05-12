import { createHash } from 'node:crypto';
import { createResource, clone } from './resource-model.js';

export const AGENT_MEMORY_CONTROLLER_BOUNDARY = {
  role: 'agent-memory-controller',
  scope: 'Company Brain memory management — search, snapshots, redaction, imports, time-travel',
  owns: ['memory search', 'snapshot pinning', 'redaction scanning', 'import lifecycle', 'ontology validation'],
  delegatesTo: ['resource-model'],
  mustNotOwn: ['git operations', 'secret values', 'Agent Mux sessions']
};

// Redaction patterns (same as agent-context-bundles)
const REDACTION_PATTERNS = [
  { kind: 'secret-key', pattern: /(?:API_KEY|API_SECRET|SECRET_KEY|ACCESS_KEY|PRIVATE_KEY|AUTH_TOKEN|PASSWORD|PASSWD|CREDENTIALS?)\s*[=:]\s*['"]?([^\s'"}{,\]]+)/gi },
  { kind: 'provider-token', pattern: /\b(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|glpat-[a-zA-Z0-9\-_]{20,}|xoxb-[a-zA-Z0-9\-]+|xoxp-[a-zA-Z0-9\-]+)\b/g },
  { kind: 'bearer-token', pattern: /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/gi },
  { kind: 'private-key', pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/g },
  { kind: 'base64-credential', pattern: /\b[A-Za-z0-9+\/]{40,}={0,2}\b/g },
];

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

const IMPORT_PHASES = ['Pending', 'Collecting', 'Redacting', 'Normalizing', 'Validating', 'AwaitingReview'];

export function createAgentMemoryController(options = {}) {
  return {
    role: 'agent-memory-controller',

    createMemorySnapshot({ memoryRepository, requestedRef, resolvedCommit, queryManifest, selectedRecords, selectedDocuments, ontologyDigest, namespace = 'default', organizationRef = 'default' }) {
      const queryManifestDigest = sha256(JSON.stringify(queryManifest || {}));
      const selectedRecordsDigest = sha256(JSON.stringify(selectedRecords || []));
      const selectedDocumentsDigest = sha256(JSON.stringify(selectedDocuments || []));

      const now = new Date().toISOString();
      const snapshotName = `memsnapshot-${sha256(memoryRepository + resolvedCommit + now).slice(0, 12)}`;

      const snapshot = createResource('AgentMemorySnapshot', { name: snapshotName, namespace }, {
        organizationRef,
        memoryRepository,
        requestedRef,
        resolvedCommit,
        queryManifestDigest,
        selectedRecordsDigest,
        selectedDocumentsDigest,
        ontologyDigest: ontologyDigest || '',
        recordCount: (selectedRecords || []).length,
        documentCount: (selectedDocuments || []).length,
      });
      snapshot.status = { phase: 'Pinned', createdAt: now };

      return snapshot;
    },

    queryMemory({ snapshotRef, requester, query, records = [], documents = [], namespace = 'default', organizationRef = 'default' }) {
      const modes = query.modes || ['graph-and-grep'];
      const results = { graph: null, grep: null };

      if (modes.includes('graph-only') || modes.includes('graph-and-grep')) {
        results.graph = this.searchGraph({
          records,
          kinds: query.graph?.kinds || [],
          edgeDepth: query.graph?.edgeDepth ?? 2,
          query: query.text || '',
        });
      }

      if (modes.includes('grep-only') || modes.includes('graph-and-grep')) {
        results.grep = this.searchGrep({
          documents,
          paths: query.grep?.paths || [],
          pattern: query.text || '',
          maxMatches: query.grep?.maxMatches ?? 25,
        });
      }

      const now = new Date().toISOString();
      const queryName = `memquery-${sha256(snapshotRef + requester + now).slice(0, 12)}`;

      const queryResource = createResource('AgentMemoryQuery', { name: queryName, namespace }, {
        organizationRef,
        snapshotRef,
        requester,
        query: clone(query),
        resultDigest: sha256(JSON.stringify(results)),
      });
      queryResource.status = { phase: 'Completed', executedAt: now };

      return { queryResource, results };
    },

    searchGraph({ records, kinds = [], edgeDepth = 2, query = '' }) {
      let candidates = records;

      // Filter by nodeKind if kinds specified
      if (kinds.length > 0) {
        candidates = candidates.filter(r => kinds.includes(r.nodeKind));
      }

      // Match query against record.id and record.attributes (case-insensitive substring)
      const lowerQuery = query.toLowerCase();
      const matches = [];

      for (const record of candidates) {
        let score = 0;
        const id = String(record.id || '').toLowerCase();
        const attrs = JSON.stringify(record.attributes || {}).toLowerCase();

        if (lowerQuery === '') {
          score = 1;
        } else if (id.includes(lowerQuery)) {
          score = 2;
        } else if (attrs.includes(lowerQuery)) {
          score = 1;
        } else {
          continue;
        }

        // Collect edges up to edgeDepth levels
        const edges = this._collectEdges(record, records, edgeDepth);

        matches.push({ record: clone(record), score, edges });
      }

      return { matches, totalMatches: matches.length };
    },

    _collectEdges(startRecord, allRecords, maxDepth) {
      if (maxDepth <= 0 || !startRecord.edges || startRecord.edges.length === 0) return [];

      const visited = new Set([startRecord.id]);
      const collectedEdges = [];
      let frontier = [startRecord];

      for (let depth = 0; depth < maxDepth; depth++) {
        const nextFrontier = [];
        for (const record of frontier) {
          for (const edge of (record.edges || [])) {
            if (visited.has(edge.target)) continue;
            visited.add(edge.target);
            collectedEdges.push(clone(edge));
            const targetRecord = allRecords.find(r => r.id === edge.target);
            if (targetRecord) nextFrontier.push(targetRecord);
          }
        }
        frontier = nextFrontier;
        if (frontier.length === 0) break;
      }

      return collectedEdges;
    },

    searchGrep({ documents, paths = [], pattern = '', maxMatches = 25 }) {
      // Filter documents by path patterns (simple glob: * matches anything)
      let filtered = documents;
      if (paths.length > 0) {
        filtered = documents.filter(doc => {
          return paths.some(p => globMatch(p, doc.path));
        });
      }

      const excerpts = [];
      const lowerPattern = pattern.toLowerCase();

      if (lowerPattern === '') {
        return { excerpts, totalMatches: 0 };
      }

      for (const doc of filtered) {
        if (excerpts.length >= maxMatches) break;

        const lines = String(doc.content || '').split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (excerpts.length >= maxMatches) break;

          if (lines[i].toLowerCase().includes(lowerPattern)) {
            const contextStart = Math.max(0, i - 1);
            const contextEnd = Math.min(lines.length - 1, i + 1);
            excerpts.push({
              path: doc.path,
              lineNumber: i + 1,
              line: lines[i],
              context: lines.slice(contextStart, contextEnd + 1).join('\n'),
            });
          }
        }
      }

      return { excerpts, totalMatches: excerpts.length };
    },

    resolveTimeTravel({ mode = 'current', requestedRef, requestedTime, commits = [] }) {
      const now = new Date().toISOString();

      if (mode === 'current') {
        const latest = commits[0] || null;
        return {
          resolvedCommit: latest?.sha || latest?.id || null,
          resolvedAt: now,
          mode: 'current',
          staleBy: null,
        };
      }

      if (mode === 'explicit-ref') {
        return {
          resolvedCommit: requestedRef,
          resolvedAt: now,
          mode: 'explicit-ref',
          staleBy: null,
        };
      }

      if (mode === 'ref-at-time') {
        const targetTime = new Date(requestedTime).getTime();
        let best = null;
        for (const commit of commits) {
          const commitTime = new Date(commit.timestamp || commit.date).getTime();
          if (commitTime <= targetTime) {
            if (!best || commitTime > new Date(best.timestamp || best.date).getTime()) {
              best = commit;
            }
          }
        }
        const resolvedCommit = best?.sha || best?.id || null;
        const staleBy = best ? (targetTime - new Date(best.timestamp || best.date).getTime()) : null;
        return {
          resolvedCommit,
          resolvedAt: now,
          mode: 'ref-at-time',
          staleBy,
        };
      }

      if (mode === 'snapshot-tag') {
        return {
          resolvedCommit: requestedRef,
          resolvedAt: now,
          mode: 'snapshot-tag',
          staleBy: null,
        };
      }

      return { resolvedCommit: null, resolvedAt: now, mode, staleBy: null };
    },

    createImport({ organizationRef, memoryRepository, source, include, validationPolicy, namespace = 'default' }) {
      const now = new Date().toISOString();
      const importName = `memimport-${sha256(memoryRepository + source + now).slice(0, 12)}`;

      const importResource = createResource('AgentRunMemoryImport', { name: importName, namespace }, {
        organizationRef,
        memoryRepository,
        source,
        include: clone(include),
        validationPolicy: validationPolicy || 'none',
      });
      importResource.status = { phase: 'Pending', createdAt: now };

      return importResource;
    },

    processImport({ importResource, content }) {
      const updated = clone(importResource);
      const currentPhase = updated.status?.phase || 'Pending';
      const now = new Date().toISOString();

      const currentIndex = IMPORT_PHASES.indexOf(currentPhase);
      if (currentIndex < 0 || currentIndex >= IMPORT_PHASES.length - 1) {
        return updated;
      }

      const nextPhase = IMPORT_PHASES[currentIndex + 1];

      // Apply phase-specific logic
      if (nextPhase === 'Redacting') {
        const scan = this.scanForRedaction(content || '');
        updated.status.redactionScan = {
          clean: scan.clean,
          redactionCount: scan.redactionCount,
          redactionsByKind: clone(scan.redactionsByKind),
        };
      }

      updated.status.phase = nextPhase;
      updated.status.lastTransitionAt = now;

      return updated;
    },

    scanForRedaction(content) {
      if (typeof content !== 'string' || content.length === 0) {
        return { clean: true, redactedContent: content || '', redactionCount: 0, redactionsByKind: {} };
      }

      let redacted = content;
      const redactionsByKind = {};
      let redactionCount = 0;

      for (const { kind, pattern } of REDACTION_PATTERNS) {
        const fresh = new RegExp(pattern.source, pattern.flags);
        redacted = redacted.replace(fresh, (match) => {
          redactionsByKind[kind] = (redactionsByKind[kind] || 0) + 1;
          redactionCount++;
          return `[REDACTED:${kind}]`;
        });
      }

      return {
        clean: redactionCount === 0,
        redactedContent: redacted,
        redactionCount,
        redactionsByKind,
      };
    },

    validateOntology({ records, ontology }) {
      const errors = [];
      const requiredFields = ontology.requiredFields || {};
      const allowedEdgeKinds = ontology.allowedEdgeKinds || [];

      for (const record of records) {
        const kind = record.nodeKind;
        const fields = requiredFields[kind] || [];

        for (const field of fields) {
          const value = record.attributes?.[field];
          if (value === undefined || value === null || value === '') {
            errors.push({
              record: record.id,
              field,
              message: `Missing required field '${field}' for nodeKind '${kind}'`,
            });
          }
        }

        // Check edge kinds
        for (const edge of (record.edges || [])) {
          if (allowedEdgeKinds.length > 0 && !allowedEdgeKinds.includes(edge.kind)) {
            errors.push({
              record: record.id,
              field: `edge.kind`,
              message: `Edge kind '${edge.kind}' is not in allowedEdgeKinds`,
            });
          }
        }
      }

      return { valid: errors.length === 0, errors };
    },

    createMemoryUpdate({ memoryRepository, sourceRun, changes, namespace = 'default', organizationRef = 'default' }) {
      const now = new Date().toISOString();
      const updateName = `memupdate-${sha256(memoryRepository + sourceRun + now).slice(0, 12)}`;

      const update = createResource('AgentMemoryUpdate', { name: updateName, namespace }, {
        organizationRef,
        memoryRepository,
        sourceRun,
        changes: clone(changes),
      });
      update.status = { phase: 'Pending', createdAt: now };

      return update;
    },
  };
}

function globMatch(pattern, path) {
  // Simple glob: convert * to regex .*
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(path);
}
