export type NativeSessionMessage = {
  role?: string;
  content?: string;
  thinking?: string;
  toolCalls?: Array<{
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    durationMs?: number;
  }>;
  toolResult?: {
    toolCallId?: string;
    toolName?: string;
    output?: unknown;
  };
};

export type SessionCost = {
  totalUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cachedTokens?: number;
};

export type SessionTranscriptNodeKind =
  | 'user'
  | 'assistant'
  | 'thinking'
  | 'tool'
  | 'system'
  | 'branch'
  | 'error';

export type AgentFlowSegmentKind =
  | 'user'
  | 'assistant'
  | 'thinking'
  | 'tool'
  | 'system'
  | 'lifecycle'
  | 'branch'
  | 'error';

export type AgentFlowSegmentStatus = 'running' | 'complete' | 'error';

export type SessionTranscriptNode = {
  id: string;
  kind: SessionTranscriptNodeKind;
  label: string;
  text: string;
  runId: string;
  timestamp: number | null;
  status?: AgentFlowSegmentStatus;
  filePaths: string[];
};

export type AgentFlowSegment = {
  id: string;
  kind: AgentFlowSegmentKind;
  title: string;
  detail: string;
  weight: number;
  startedAt: number | null;
  endedAt: number | null;
  status: AgentFlowSegmentStatus;
  secondaryLabel?: string;
  filePaths: string[];
};

export type AgentFlowLane = {
  runId: string;
  laneKey: string;
  agent: string;
  status: string;
  startedAt: number;
  lastEventAt: number;
  segmentCount: number;
  toolCount: number;
  totalUsd: number | null;
  segments: AgentFlowSegment[];
};

export type SessionFlowTimelineItem = {
  id: string;
  runId: string;
  laneKey: string;
  kind: AgentFlowSegmentKind;
  title: string;
  detail: string;
  timestamp: number | null;
  status: AgentFlowSegmentStatus;
  filePaths: string[];
};

export type SessionFlowFileRecord = {
  path: string;
  reads: number;
  writes: number;
  touches: number;
  lastEventAt: number | null;
  runIds: string[];
  tools: string[];
};

export type SessionFlowModel = {
  lanes: AgentFlowLane[];
  transcript: SessionTranscriptNode[];
  timeline: SessionFlowTimelineItem[];
  files: SessionFlowFileRecord[];
  summary: {
    totalRuns: number;
    totalSegments: number;
    totalTools: number;
    pendingTools: number;
    fileCount: number;
    totalUsd: number | null;
  };
};

type EventRecord = Record<string, unknown>;
type EventBuffer = { events: EventRecord[] } | undefined;
type RunRecord = Record<string, unknown>;

type PendingTool = {
  toolName: string;
  secondaryLabel?: string;
  startedAt: number | null;
  detail: string;
  filePaths: string[];
};

function previewText(value: string, maxLength = 180): string {
  const flattened = value.replace(/\s+/g, ' ').trim();
  if (flattened.length <= maxLength) {
    return flattened;
  }
  return `${flattened.slice(0, Math.max(0, maxLength - 1))}…`;
}

function renderPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function computeSegmentWeight(detail: string, start: number | null, end: number | null): number {
  const durationMs = start != null && end != null ? Math.max(0, end - start) : 0;
  if (durationMs > 0) {
    return Math.max(1, Math.min(10, Math.round(durationMs / 1000) + 1));
  }
  return Math.max(1, Math.min(7, Math.ceil(Math.max(16, detail.length) / 28)));
}

function getLifecycleLabel(event: EventRecord): string {
  const type = String(event.type ?? '');
  if (type === 'turn_start' || type === 'turn_end') {
    return `turn ${String(event.turnIndex ?? '?')}`;
  }
  if (type === 'step_start' || type === 'step_end') {
    return `step ${String(event.stepType ?? event.stepIndex ?? '?')}`;
  }
  if (type === 'session_start' || type === 'session_resume' || type === 'session_end' || type === 'session_fork') {
    return `session ${type.replace('session_', '')}`;
  }
  return type.replace(/_/g, ' ');
}

function getSystemLabel(event: EventRecord): string {
  const type = String(event.type ?? '');
  if (type === 'shell_start') {
    return `shell ${previewText(String(event.command ?? ''), 48)}`;
  }
  if (type === 'shell_exit') {
    return `shell exit ${String(event.exitCode ?? '?')}`;
  }
  if (type.startsWith('file_')) {
    return `${type.replace('file_', '')} ${previewText(String(event.path ?? ''), 36)}`;
  }
  if (type.startsWith('mcp_tool_')) {
    return `${String(event.toolName ?? 'mcp tool')} · ${String(event.server ?? 'server')}`;
  }
  if (type === 'plugin_loaded' || type === 'plugin_invoked' || type === 'plugin_error') {
    return `${type.replace('plugin_', '')} ${String(event.pluginName ?? event.pluginId ?? 'plugin')}`;
  }
  if (type === 'skill_loaded' || type === 'skill_invoked') {
    return `${type.replace('skill_', '')} ${String(event.skillName ?? 'skill')}`;
  }
  if (type === 'agentdoc_read') {
    return `agent doc ${previewText(String(event.path ?? ''), 36)}`;
  }
  return type.replace(/_/g, ' ');
}

function pushUnique(target: string[], values: Iterable<string>): void {
  for (const value of values) {
    if (value.length === 0 || target.includes(value)) {
      continue;
    }
    target.push(value);
  }
}

function collectPaths(value: unknown, depth = 0, results = new Set<string>()): Set<string> {
  if (depth > 3 || value == null) {
    return results;
  }
  if (typeof value === 'string') {
    if (/[\\/]/.test(value) || value.endsWith('.ts') || value.endsWith('.tsx') || value.endsWith('.js') || value.endsWith('.json') || value.endsWith('.md')) {
      results.add(value);
    }
    return results;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectPaths(item, depth + 1, results);
    }
    return results;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (
        key === 'path' ||
        key === 'paths' ||
        key === 'file' ||
        key === 'files' ||
        key === 'file_path' ||
        key === 'cwd' ||
        key === 'target'
      ) {
        collectPaths(child, depth + 1, results);
        continue;
      }
      if (depth < 2) {
        collectPaths(child, depth + 1, results);
      }
    }
  }
  return results;
}

function recordFileTouch(
  files: Map<string, SessionFlowFileRecord>,
  path: string,
  kind: 'read' | 'write',
  runId: string,
  timestamp: number | null,
  toolName?: string,
): void {
  const existing = files.get(path) ?? {
    path,
    reads: 0,
    writes: 0,
    touches: 0,
    lastEventAt: null,
    runIds: [],
    tools: [],
  };
  if (kind === 'read') {
    existing.reads += 1;
  } else {
    existing.writes += 1;
  }
  existing.touches += 1;
  existing.lastEventAt = timestamp ?? existing.lastEventAt;
  if (!existing.runIds.includes(runId)) {
    existing.runIds.push(runId);
  }
  if (toolName && !existing.tools.includes(toolName)) {
    existing.tools.push(toolName);
  }
  files.set(path, existing);
}

function buildToolLabel(toolName: string, secondaryLabel?: string): string {
  return secondaryLabel ? `${toolName} · ${secondaryLabel}` : toolName;
}

function projectRunFlow(run: RunRecord, buffer: EventBuffer): {
  lane: AgentFlowLane;
  transcript: SessionTranscriptNode[];
  timeline: SessionFlowTimelineItem[];
  files: SessionFlowFileRecord[];
} | null {
  if (!buffer) {
    return null;
  }

  const runId = String(run.runId ?? '');
  const agent = String(run.agent ?? 'unknown');
  const segments: AgentFlowSegment[] = [];
  const transcript: SessionTranscriptNode[] = [];
  const timeline: SessionFlowTimelineItem[] = [];
  const files = new Map<string, SessionFlowFileRecord>();
  const pendingTools = new Map<string, PendingTool>();
  let currentAssistantText = '';
  let currentAssistantStart: number | null = null;
  let currentThinkingText = '';
  let currentThinkingStart: number | null = null;
  let toolCount = 0;
  let totalUsd = 0;
  let hasCost = false;
  let lastEventAt = Number(run.startedAt ?? 0);

  const pushSegment = (
    kind: AgentFlowSegmentKind,
    title: string,
    detail: string,
    start: number | null,
    end: number | null,
    status: AgentFlowSegmentStatus,
    options?: { secondaryLabel?: string; includeTranscript?: boolean; filePaths?: string[] },
  ): void => {
    const cleaned = previewText(detail.length > 0 ? detail : title, 220);
    const filePaths = [...(options?.filePaths ?? [])];
    const segment: AgentFlowSegment = {
      id: `${runId}-${segments.length}-${kind}`,
      kind,
      title,
      detail: cleaned,
      weight: computeSegmentWeight(cleaned, start, end),
      startedAt: start,
      endedAt: end,
      status,
      secondaryLabel: options?.secondaryLabel,
      filePaths,
    };
    segments.push(segment);
    timeline.push({
      id: `timeline-${segment.id}`,
      runId,
      laneKey: runId,
      kind,
      title: options?.secondaryLabel ? buildToolLabel(title, options.secondaryLabel) : title,
      detail: cleaned,
      timestamp: start ?? end,
      status,
      filePaths,
    });
    if (options?.includeTranscript && kind !== 'lifecycle') {
      const transcriptKind: SessionTranscriptNodeKind =
        kind === 'user' || kind === 'assistant' || kind === 'thinking' || kind === 'tool' || kind === 'system' || kind === 'branch'
          ? kind
          : 'error';
      transcript.push({
        id: `transcript-${segment.id}`,
        kind: transcriptKind,
        label: options?.secondaryLabel ? buildToolLabel(title, options.secondaryLabel) : title,
        text: detail,
        runId,
        timestamp: start ?? end,
        status,
        filePaths,
      });
    }
  };

  const flushAssistant = (timestamp: number | null): void => {
    if (!currentAssistantText) {
      return;
    }
    pushSegment('assistant', 'assistant', currentAssistantText, currentAssistantStart, timestamp ?? currentAssistantStart, 'complete', {
      includeTranscript: true,
    });
    currentAssistantText = '';
    currentAssistantStart = null;
  };

  const flushThinking = (timestamp: number | null): void => {
    if (!currentThinkingText) {
      return;
    }
    pushSegment('thinking', 'thinking', currentThinkingText, currentThinkingStart, timestamp ?? currentThinkingStart, 'complete', {
      includeTranscript: true,
    });
    currentThinkingText = '';
    currentThinkingStart = null;
  };

  for (const event of buffer.events) {
    const type = String(event.type ?? '');
    const timestamp = toTimestamp(event.timestamp) ?? Number(run.startedAt ?? 0);
    lastEventAt = Math.max(lastEventAt, timestamp);

    if (type === 'cost') {
      const costRecord = event.cost;
      if (costRecord && typeof costRecord === 'object') {
        totalUsd += Number((costRecord as SessionCost).totalUsd ?? 0);
        hasCost = true;
      }
      continue;
    }

    if (type === 'user_message') {
      flushThinking(timestamp);
      flushAssistant(timestamp);
      const text = String(event.text ?? '');
      if (text.length > 0) {
        pushSegment('user', 'user', text, timestamp, timestamp, 'complete', {
          includeTranscript: true,
        });
      }
      continue;
    }

    if (type === 'thinking_delta') {
      if (currentThinkingStart == null) {
        currentThinkingStart = timestamp;
      }
      currentThinkingText += String(event.delta ?? '');
      continue;
    }

    if (type === 'thinking_stop') {
      const finalThinking = String(event.thinking ?? currentThinkingText);
      if (finalThinking.length > 0) {
        currentThinkingText = finalThinking;
      }
      flushThinking(timestamp);
      continue;
    }

    if (type === 'text_delta') {
      flushThinking(timestamp);
      if (currentAssistantStart == null) {
        currentAssistantStart = timestamp;
      }
      currentAssistantText += String(event.delta ?? '');
      continue;
    }

    if (type === 'message_stop') {
      flushThinking(timestamp);
      const finalText = String(event.text ?? currentAssistantText);
      if (finalText.length > 0) {
        currentAssistantText = finalText;
      }
      flushAssistant(timestamp);
      continue;
    }

    flushThinking(timestamp);
    flushAssistant(timestamp);

    if (type === 'tool_call_start' || type === 'tool_call_ready' || type === 'tool_input_delta') {
      const toolCallId = String(event.toolCallId ?? `tool-${pendingTools.size}`);
      const existing = pendingTools.get(toolCallId);
      const toolName = String(event.toolName ?? existing?.toolName ?? 'tool');
      const detail =
        type === 'tool_call_ready'
          ? renderPayload(event.input ?? {})
          : String(event.inputAccumulated ?? existing?.detail ?? '');
      const filePaths = [...collectPaths(type === 'tool_call_ready' ? event.input : detail)];
      for (const path of filePaths) {
        recordFileTouch(files, path, 'read', runId, timestamp, toolName);
      }
      pendingTools.set(toolCallId, {
        toolName,
        startedAt: existing?.startedAt ?? timestamp,
        detail,
        filePaths,
      });
      continue;
    }

    if (type === 'tool_result' || type === 'tool_error') {
      const toolCallId = String(event.toolCallId ?? '');
      const pending = pendingTools.get(toolCallId);
      const toolName = pending?.toolName ?? String(event.toolName ?? 'tool');
      const detail = type === 'tool_error' ? String(event.error ?? '') : renderPayload(event.output ?? event);
      const pendingFilePaths = pending?.filePaths ?? [];
      const outputFilePaths = [...collectPaths(event.output), ...collectPaths(detail)].filter((path) => !pendingFilePaths.includes(path));
      const filePaths = [...new Set([...pendingFilePaths, ...outputFilePaths])];
      const writeLike = toolName.toLowerCase().includes('write') || toolName.toLowerCase().includes('edit') || toolName.toLowerCase().includes('patch');
      for (const path of writeLike ? pendingFilePaths : outputFilePaths) {
        recordFileTouch(files, path, writeLike ? 'write' : 'read', runId, timestamp, toolName);
      }
      pushSegment(type === 'tool_error' ? 'error' : 'tool', toolName, detail, pending?.startedAt ?? timestamp, timestamp, type === 'tool_error' ? 'error' : 'complete', {
        includeTranscript: true,
        filePaths,
      });
      pendingTools.delete(toolCallId);
      toolCount += 1;
      continue;
    }

    if (type === 'mcp_tool_call_start') {
      const toolCallId = String(event.toolCallId ?? `mcp-${pendingTools.size}`);
      const detail = renderPayload(event.input ?? {});
      const toolName = String(event.toolName ?? 'tool');
      const secondaryLabel = String(event.server ?? 'server');
      const filePaths = [...collectPaths(event.input)];
      for (const path of filePaths) {
        recordFileTouch(files, path, 'read', runId, timestamp, toolName);
      }
      pendingTools.set(toolCallId, {
        toolName,
        secondaryLabel,
        startedAt: timestamp,
        detail,
        filePaths,
      });
      continue;
    }

    if (type === 'mcp_tool_result' || type === 'mcp_tool_error') {
      const toolCallId = String(event.toolCallId ?? '');
      const pending = pendingTools.get(toolCallId);
      const toolName = pending?.toolName ?? String(event.toolName ?? 'tool');
      const secondaryLabel = pending?.secondaryLabel ?? String(event.server ?? 'server');
      const detail = type === 'mcp_tool_error' ? String(event.error ?? '') : renderPayload(event.output ?? event);
      pushSegment(type === 'mcp_tool_error' ? 'error' : 'tool', toolName, detail, pending?.startedAt ?? timestamp, timestamp, type === 'mcp_tool_error' ? 'error' : 'complete', {
        secondaryLabel,
        includeTranscript: true,
        filePaths: pending?.filePaths ?? [],
      });
      pendingTools.delete(toolCallId);
      toolCount += 1;
      continue;
    }

    if (type === 'subagent_spawn' || type === 'subagent_result' || type === 'subagent_error') {
      const agentName = String(event.agentName ?? 'subagent');
      const detail =
        type === 'subagent_spawn'
          ? String(event.prompt ?? '')
          : type === 'subagent_result'
            ? String(event.summary ?? '')
            : String(event.error ?? '');
      pushSegment(type === 'subagent_error' ? 'error' : 'branch', agentName, detail, timestamp, timestamp, type === 'subagent_error' ? 'error' : 'complete', {
        includeTranscript: true,
      });
      continue;
    }

    if (
      type === 'session_start' ||
      type === 'session_resume' ||
      type === 'session_end' ||
      type === 'session_fork' ||
      type === 'turn_start' ||
      type === 'turn_end' ||
      type === 'step_start' ||
      type === 'step_end'
    ) {
      const label = getLifecycleLabel(event);
      pushSegment('lifecycle', label, label, timestamp, timestamp, 'complete');
      continue;
    }

    if (type === 'file_read' || type === 'file_write' || type === 'file_create' || type === 'file_delete' || type === 'file_patch') {
      const path = String(event.path ?? '');
      if (path.length > 0) {
        recordFileTouch(files, path, type === 'file_read' ? 'read' : 'write', runId, timestamp);
      }
      const label = getSystemLabel(event);
      pushSegment('system', label, label, timestamp, timestamp, 'complete', {
        includeTranscript: true,
        filePaths: path.length > 0 ? [path] : [],
      });
      continue;
    }

    if (
      type === 'shell_start' ||
      type === 'shell_exit' ||
      type === 'plugin_loaded' ||
      type === 'plugin_invoked' ||
      type === 'plugin_error' ||
      type === 'skill_loaded' ||
      type === 'skill_invoked' ||
      type === 'agentdoc_read' ||
      type === 'image_output'
    ) {
      const label = getSystemLabel(event);
      pushSegment(type.endsWith('error') ? 'error' : 'system', label, label, timestamp, timestamp, type.endsWith('error') ? 'error' : 'complete', {
        includeTranscript: true,
        filePaths: [...collectPaths(event)],
      });
      continue;
    }

    if (type === 'error') {
      const detail = String(event.message ?? event.error ?? 'Unknown error');
      pushSegment('error', 'error', detail, timestamp, timestamp, 'error', {
        includeTranscript: true,
      });
    }
  }

  flushThinking(lastEventAt || null);
  flushAssistant(lastEventAt || null);

  for (const [toolCallId, pending] of pendingTools.entries()) {
    pushSegment('tool', pending.toolName, pending.detail.length > 0 ? pending.detail : pending.toolName, pending.startedAt, pending.startedAt, 'running', {
      secondaryLabel: pending.secondaryLabel,
      includeTranscript: true,
      filePaths: pending.filePaths,
    });
    timeline[timeline.length - 1]!.id = `timeline-${runId}-${toolCallId}-pending`;
    transcript[transcript.length - 1]!.id = `transcript-${runId}-${toolCallId}-pending`;
    toolCount += 1;
  }

  return {
    lane: {
      runId,
      laneKey: runId,
      agent,
      status: String(run.status ?? 'unknown'),
      startedAt: Number(run.startedAt ?? 0),
      lastEventAt,
      segmentCount: segments.length,
      toolCount,
      totalUsd: hasCost ? totalUsd : null,
      segments,
    },
    transcript,
    timeline,
    files: Array.from(files.values()),
  };
}

function sortByTimestamp<T extends { timestamp?: number | null; startedAt?: number | null; path?: string }>(left: T, right: T): number {
  const leftValue = left.timestamp ?? left.startedAt ?? 0;
  const rightValue = right.timestamp ?? right.startedAt ?? 0;
  if (leftValue !== rightValue) {
    return leftValue - rightValue;
  }
  return String(left.path ?? '').localeCompare(String(right.path ?? ''));
}

export function buildSessionTranscript(
  runs: RunRecord[],
  eventBuffers: Record<string, EventBuffer>,
): SessionTranscriptNode[] {
  return buildSessionFlowModel(runs, eventBuffers).transcript;
}

export function buildAgentFlowLanes(
  runs: RunRecord[],
  eventBuffers: Record<string, EventBuffer>,
): AgentFlowLane[] {
  return buildSessionFlowModel(runs, eventBuffers).lanes;
}

export function buildSessionFlowModel(
  runs: RunRecord[],
  eventBuffers: Record<string, EventBuffer>,
): SessionFlowModel {
  const orderedRuns = [...runs].sort((left, right) => Number(left.startedAt ?? 0) - Number(right.startedAt ?? 0));
  const lanes: AgentFlowLane[] = [];
  const transcript: SessionTranscriptNode[] = [];
  const timeline: SessionFlowTimelineItem[] = [];
  const files = new Map<string, SessionFlowFileRecord>();

  for (const run of orderedRuns) {
    const runId = String(run.runId ?? '');
    const projected = projectRunFlow(run, eventBuffers[runId]);
    if (!projected) {
      continue;
    }
    lanes.push(projected.lane);
    transcript.push(...projected.transcript);
    timeline.push(...projected.timeline);
    for (const file of projected.files) {
      const existing = files.get(file.path);
      if (!existing) {
        files.set(file.path, { ...file });
        continue;
      }
      existing.reads += file.reads;
      existing.writes += file.writes;
      existing.touches += file.touches;
      existing.lastEventAt = Math.max(existing.lastEventAt ?? 0, file.lastEventAt ?? 0) || null;
      pushUnique(existing.runIds, file.runIds);
      pushUnique(existing.tools, file.tools);
    }
  }

  const orderedTimeline = [...timeline].sort(sortByTimestamp);
  const orderedTranscript = [...transcript].sort(sortByTimestamp);
  const orderedFiles = Array.from(files.values()).sort((left, right) => {
    if (left.touches !== right.touches) {
      return right.touches - left.touches;
    }
    return (right.lastEventAt ?? 0) - (left.lastEventAt ?? 0);
  });

  let totalUsd: number | null = 0;
  let sawCost = false;
  let totalTools = 0;
  let pendingTools = 0;
  let totalSegments = 0;
  for (const lane of lanes) {
    totalTools += lane.toolCount;
    totalSegments += lane.segmentCount;
    pendingTools += lane.segments.filter((segment) => segment.kind === 'tool' && segment.status === 'running').length;
    if (lane.totalUsd != null) {
      totalUsd += lane.totalUsd;
      sawCost = true;
    }
  }

  return {
    lanes,
    transcript: orderedTranscript,
    timeline: orderedTimeline,
    files: orderedFiles,
    summary: {
      totalRuns: lanes.length,
      totalSegments,
      totalTools,
      pendingTools,
      fileCount: orderedFiles.length,
      totalUsd: sawCost ? totalUsd : null,
    },
  };
}

export function accumulateEventCost(
  runIds: string[],
  eventBuffers: Record<string, EventBuffer>,
): SessionCost | null {
  const totals: SessionCost = {
    totalUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    thinkingTokens: 0,
    cachedTokens: 0,
  };
  let found = false;

  for (const runId of runIds) {
    const buffer = eventBuffers[runId];
    if (!buffer) {
      continue;
    }
    for (const event of buffer.events) {
      if (event.type !== 'cost') {
        continue;
      }
      const cost = event.cost;
      if (!cost || typeof cost !== 'object') {
        continue;
      }
      const record = cost as SessionCost;
      totals.totalUsd = (totals.totalUsd ?? 0) + Number(record.totalUsd ?? 0);
      totals.inputTokens = (totals.inputTokens ?? 0) + Number(record.inputTokens ?? 0);
      totals.outputTokens = (totals.outputTokens ?? 0) + Number(record.outputTokens ?? 0);
      totals.thinkingTokens = (totals.thinkingTokens ?? 0) + Number(record.thinkingTokens ?? 0);
      totals.cachedTokens = (totals.cachedTokens ?? 0) + Number(record.cachedTokens ?? 0);
      found = true;
    }
  }

  return found ? totals : null;
}

export function buildNativeTranscript(sessionId: string, messages: NativeSessionMessage[]): SessionTranscriptNode[] {
  const nodes: SessionTranscriptNode[] = [];
  for (const [index, message] of messages.entries()) {
    const runId = `${sessionId}:native:${index}`;
    if (message.role === 'user' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({
        id: `${runId}:user`,
        kind: 'user',
        label: 'user',
        text: message.content,
        runId,
        timestamp: index,
        filePaths: [],
      });
      continue;
    }
    if (typeof message.thinking === 'string' && message.thinking.length > 0) {
      nodes.push({
        id: `${runId}:thinking`,
        kind: 'thinking',
        label: 'thinking',
        text: message.thinking,
        runId,
        timestamp: index + 0.1,
        filePaths: [],
      });
    }
    if (Array.isArray(message.toolCalls)) {
      for (const [toolIndex, toolCall] of message.toolCalls.entries()) {
        const filePaths = [...collectPaths(toolCall.input), ...collectPaths(toolCall.output)];
        nodes.push({
          id: `${runId}:tool:${toolIndex}`,
          kind: 'tool',
          label: String(toolCall.toolName ?? 'tool'),
          text: renderPayload({
            input: toolCall.input,
            output: toolCall.output,
            durationMs: toolCall.durationMs,
          }),
          runId,
          timestamp: index + 0.2 + toolIndex / 10,
          filePaths,
        });
      }
    }
    if (message.role === 'tool' && message.toolResult) {
      nodes.push({
        id: `${runId}:tool-result`,
        kind: 'tool',
        label: String(message.toolResult.toolName ?? 'tool'),
        text: renderPayload(message.toolResult.output),
        runId,
        timestamp: index + 0.25,
        filePaths: [...collectPaths(message.toolResult.output)],
      });
      continue;
    }
    if (message.role === 'assistant' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({
        id: `${runId}:assistant`,
        kind: 'assistant',
        label: 'assistant',
        text: message.content,
        runId,
        timestamp: index + 0.3,
        filePaths: [],
      });
      continue;
    }
    if (message.role === 'system' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({
        id: `${runId}:system`,
        kind: 'system',
        label: 'system',
        text: message.content,
        runId,
        timestamp: index + 0.4,
        filePaths: [],
      });
    }
  }
  return nodes;
}

export function buildNativeAgentFlowLane(
  sessionId: string,
  messages: NativeSessionMessage[],
  agent: string,
  status: string,
): AgentFlowLane | null {
  if (messages.length === 0) {
    return null;
  }

  const transcript = buildNativeTranscript(sessionId, messages);
  const segments: AgentFlowSegment[] = transcript.map((node, index) => ({
    id: `${sessionId}:native:segment:${index}`,
    kind: node.kind === 'system' || node.kind === 'branch' || node.kind === 'error' ? node.kind : node.kind,
    title: node.label,
    detail: previewText(node.text, 220),
    weight: computeSegmentWeight(node.text, null, null),
    startedAt: typeof node.timestamp === 'number' ? node.timestamp : null,
    endedAt: typeof node.timestamp === 'number' ? node.timestamp : null,
    status: node.kind === 'error' ? 'error' : 'complete',
    filePaths: node.filePaths,
  }));
  const toolCount = segments.filter((segment) => segment.kind === 'tool').length;

  return {
    runId: `${sessionId}:native`,
    laneKey: `${sessionId}:native`,
    agent,
    status,
    startedAt: 0,
    lastEventAt: messages.length,
    segmentCount: segments.length,
    toolCount,
    totalUsd: null,
    segments,
  };
}
