import type { AgentFlowLane, AgentFlowSegment, NativeSessionMessage, SessionTranscriptNode } from './types.js';
import { collectPaths, computeSegmentWeight, previewText, renderPayload } from './utils.js';

function readMessageTimestamp(message: NativeSessionMessage, index: number): number {
  const value = message.timestamp;
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return index;
}

export function buildNativeTranscript(sessionId: string, messages: NativeSessionMessage[]): SessionTranscriptNode[] {
  const nodes: SessionTranscriptNode[] = [];
  for (const [index, message] of messages.entries()) {
    const runId = `${sessionId}:native:${index}`;
    const baseTimestamp = readMessageTimestamp(message, index);
    if (message.role === 'user' && typeof message.content === 'string' && message.content.length > 0) {
      nodes.push({
        id: `${runId}:user`,
        kind: 'user',
        label: 'user',
        text: message.content,
        runId,
        timestamp: baseTimestamp,
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
        timestamp: baseTimestamp + 0.1,
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
          timestamp: baseTimestamp + 0.2 + toolIndex / 10,
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
        timestamp: baseTimestamp + 0.25,
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
        timestamp: baseTimestamp + 0.3,
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
        timestamp: baseTimestamp + 0.4,
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
    kind: node.kind,
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
