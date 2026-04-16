import * as path from 'node:path';
import { buildEffectIndex } from '../../../runtime/replay/effectIndex';
import type { EffectRecord } from '../../../runtime/types';
import { loadJournal } from '../../../storage/journal';
import { readRunMetadata } from '../../../storage/runFiles';
import { resolveCompletionProof } from '../../completionProof';
import { discoverSkillsInternal } from '../skill';
import type {
  SessionIterationMessageArgs,
  SessionIterationMessageResult,
} from './types';

function countPendingByKind(records: EffectRecord[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = record.kind ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

export async function handleSessionIterationMessage(
  args: SessionIterationMessageArgs,
): Promise<number> {
  const { iteration, runId, runsDir, pluginRoot, json } = args;
  if (iteration === undefined) {
    const error = { error: 'MISSING_ITERATION', message: '--iteration is required' };
    if (json) {
      console.error(JSON.stringify(error, null, 2));
    } else {
      console.error('Error: --iteration is required for session:iteration-message');
    }
    return 1;
  }

  let runState: string | null = null;
  let completionProof: string | null = null;
  let pendingKinds: string | null = null;
  let entrypointImportPath: string | undefined;

  if (runId) {
    const runDir = path.isAbsolute(runId) ? runId : path.join(runsDir, runId);
    try {
      const metadata = await readRunMetadata(runDir);
      entrypointImportPath = metadata?.entrypoint?.importPath;
      const journal = await loadJournal(runDir);
      const index = await buildEffectIndex({ runDir, events: journal });
      const hasCompleted = journal.some((event) => event.type === 'RUN_COMPLETED');
      const hasFailed = journal.some((event) => event.type === 'RUN_FAILED');
      if (hasCompleted) {
        completionProof = resolveCompletionProof(metadata);
      }

      const pendingRecords = index.listPendingEffects();
      const pendingByKind = countPendingByKind(pendingRecords);
      const kindKeys = Object.keys(pendingByKind);
      if (kindKeys.length > 0) {
        pendingKinds = kindKeys.join(', ');
      }

      if (completionProof) {
        runState = 'completed';
      } else if (hasFailed) {
        runState = 'failed';
      } else if (pendingRecords.length > 0) {
        runState = 'waiting';
      } else {
        runState = 'created';
      }
    } catch {
      runState = null;
    }
  }

  let systemMessage: string;
  if (completionProof) {
    systemMessage =
      `\u{1F504} Babysitter iteration ${iteration} | Run completed! To finish: agent must call 'run:status --json' on your run, extract 'completionProof' from the output, then output it in <promise>SECRET</promise> tags. Do not mention or reveal the secret otherwise.`;
  } else if (runState === 'waiting' && pendingKinds) {
    systemMessage =
      `\u{1F504} Babysitter iteration ${iteration} | Waiting on: ${pendingKinds}. Check if pending effects are resolved, then call run:iterate.`;
  } else if (runState === 'failed') {
    systemMessage =
      `\u{1F504} Babysitter iteration ${iteration} | Failed. agent must fix the run, journal or process (inspect the sdk.md if needed) and proceed.`;
  } else {
    systemMessage =
      `\u{1F504} Babysitter iteration ${iteration} | Agent should continue orchestration (run:iterate)`;
  }

  let skillContext: string | null = null;
  if (pluginRoot) {
    try {
      const discoverResult = await discoverSkillsInternal({
        pluginRoot,
        runId,
        runsDir,
        processPath: entrypointImportPath,
      });
      skillContext = discoverResult.summary || null;
    } catch {
      skillContext = null;
    }
  }

  const result: SessionIterationMessageResult = {
    systemMessage,
    runState,
    completionProof,
    pendingKinds,
    skillContext,
    iteration,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[session:iteration-message] iteration=${iteration} runState=${runState ?? 'none'} pendingKinds=${pendingKinds ?? 'none'} completionProof=${completionProof ?? 'none'} skillContext=${skillContext ?? 'none'} systemMessage=${systemMessage}`,
    );
  }
  return 0;
}
