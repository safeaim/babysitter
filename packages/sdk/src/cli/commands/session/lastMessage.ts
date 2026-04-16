import { existsSync, readFileSync } from 'node:fs';
import { resolveInputPath } from '../../resolveInputPath';
import type {
  SessionLastMessageArgs,
  SessionLastMessageResult,
} from './types';

export function parseTranscriptLastAssistantMessage(content: string): {
  found: boolean;
  text: string | null;
} {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);
  let lastAssistant: unknown = null;

  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const isAssistant =
          obj.role === 'assistant' ||
          obj.type === 'assistant' ||
          (obj.message &&
            typeof obj.message === 'object' &&
            (obj.message as Record<string, unknown>).role === 'assistant');
        if (isAssistant) {
          lastAssistant = parsed;
        }
      }
    } catch {
      // Skip malformed lines.
    }
  }

  if (!lastAssistant) {
    return { found: false, text: null };
  }

  const msg = lastAssistant as Record<string, unknown>;
  const contentArr = (msg.message && typeof msg.message === 'object'
    ? (msg.message as Record<string, unknown>).content
    : msg.content) as Array<Record<string, unknown>> | undefined;

  if (!Array.isArray(contentArr)) {
    return { found: false, text: null };
  }

  const textParts = contentArr
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string);

  if (textParts.length === 0) {
    return { found: false, text: null };
  }

  return { found: true, text: textParts.join('\n') };
}

export function extractPromiseTag(text: string): string | null {
  const match = text.match(/<promise>([\s\S]*?)<\/promise>/);
  if (!match) {
    return null;
  }
  return match[1].trim().replace(/\s+/g, ' ');
}

export function handleSessionLastMessage(args: SessionLastMessageArgs): number {
  const result: SessionLastMessageResult = {
    found: false,
    text: null,
    hasPromise: false,
    promiseValue: null,
  };

  const transcriptPath = resolveInputPath(args.transcriptPath);
  if (!existsSync(transcriptPath)) {
    result.error = 'TRANSCRIPT_NOT_FOUND';
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[session:last-message] error=TRANSCRIPT_NOT_FOUND path=${transcriptPath}`);
    }
    return 0;
  }

  try {
    const parsed = parseTranscriptLastAssistantMessage(readFileSync(transcriptPath, 'utf-8'));
    result.found = parsed.found;
    result.text = parsed.text;
    if (parsed.found && parsed.text) {
      const promiseValue = extractPromiseTag(parsed.text);
      result.hasPromise = promiseValue !== null;
      result.promiseValue = promiseValue;
    }
  } catch {
    result.error = 'TRANSCRIPT_PARSE_ERROR';
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[session:last-message] found=${result.found} hasPromise=${result.hasPromise}${result.promiseValue ? ` promiseValue=${result.promiseValue}` : ''}`,
    );
  }
  return 0;
}
