import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { loadJournal } from '../../../storage/journal';
import { getGlobalStateDir } from '../../../config';
import {
  SessionError,
  SessionState,
  getCurrentTimestamp,
  getSessionFilePath,
  readSessionFile,
  sessionFileExists,
  writeSessionFile,
} from '../../../session';
import type { SessionCommandArgs } from './types';

function emitError(json: boolean, error: Record<string, unknown>, lines: string[]): number {
  if (json) {
    console.error(JSON.stringify(error, null, 2));
  } else {
    for (const line of lines) {
      console.error(line);
    }
  }
  return 1;
}

function requireSessionArgs(
  args: SessionCommandArgs,
  options: { requireRunId?: boolean } = {},
): { sessionId: string; stateDir: string; runId?: string } | number {
  const { sessionId, runId, json } = args;
  if (!sessionId) {
    return emitError(
      json,
      { error: 'MISSING_SESSION_ID', message: '--session-id is required' },
      ['❌ Error: --session-id is required'],
    );
  }
  if (options.requireRunId && !runId) {
    return emitError(
      json,
      { error: 'MISSING_RUN_ID', message: '--run-id is required' },
      ['❌ Error: --run-id is required'],
    );
  }
  return { sessionId, stateDir: getGlobalStateDir(), runId };
}

export async function handleSessionInit(args: SessionCommandArgs): Promise<number> {
  const required = requireSessionArgs(args);
  if (typeof required === 'number') {
    return required;
  }

  const { sessionId, stateDir } = required;
  const { maxIterations = 256, runId = '', prompt = '', json } = args;
  const filePath = getSessionFilePath(stateDir, sessionId);

  if (await sessionFileExists(filePath)) {
    try {
      const existing = await readSessionFile(filePath);
      if (existing.state.runId) {
        return emitError(
          json,
          {
            error: 'SESSION_EXISTS',
            message: `Session already associated with run: ${existing.state.runId}`,
            runId: existing.state.runId,
          },
          [`❌ Error: This session is already associated with a run (${existing.state.runId})`],
        );
      }
      return emitError(
        json,
        {
          error: 'SESSION_EXISTS',
          message: 'A babysitter run is already active for this session',
        },
        ['❌ Error: A babysitter run is already active for this session, but with no associated run ID.'],
      );
    } catch {
      return emitError(
        json,
        { error: 'SESSION_EXISTS', message: 'Session state file exists but could not be read' },
        ['❌ Error: Session state file exists but could not be read'],
      );
    }
  }

  const now = getCurrentTimestamp();
  const state: SessionState = {
    active: true,
    iteration: 1,
    maxIterations,
    runId,
    runIds: [],
    startedAt: now,
    lastIterationAt: now,
    iterationTimes: [],
  };

  try {
    await writeSessionFile(filePath, state, prompt);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      json,
      { error: 'FS_ERROR', message: err.message },
      [`❌ Error: Failed to create state file: ${err.message}`],
    );
  }

  const result = {
    stateFile: filePath,
    iteration: state.iteration,
    maxIterations: state.maxIterations,
    runId: state.runId,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('✅ Session initialized');
    console.log(`   State file: ${filePath}`);
    console.log(`   Iteration: ${state.iteration}`);
    console.log(`   Max iterations: ${maxIterations > 0 ? maxIterations : 'unlimited'}`);
    if (runId) {
      console.log(`   Run ID: ${runId}`);
    }
  }

  return 0;
}

export async function handleSessionAssociate(args: SessionCommandArgs): Promise<number> {
  const required = requireSessionArgs(args, { requireRunId: true });
  if (typeof required === 'number') {
    return required;
  }

  const { sessionId, stateDir, runId } = required;
  const { force, runsDir, json } = args;
  const filePath = getSessionFilePath(stateDir, sessionId);

  let existing;
  try {
    existing = await readSessionFile(filePath);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      json,
      { error: 'SESSION_NOT_FOUND', message: err.message },
      [
        '❌ Error: No active babysitter session found',
        `   Expected state file: ${filePath}`,
        '',
        '   You must first call session:init to initialize the session.',
      ],
    );
  }

  if (existing.state.runId) {
    if (!force) {
      return emitError(
        json,
        {
          error: 'RUN_ALREADY_ASSOCIATED',
          message: `Session already associated with run: ${existing.state.runId}. Use --force to rebind if the existing run is completed or failed.`,
          existingRunId: existing.state.runId,
        },
        [
          `❌ Error: This session is already associated with run: ${existing.state.runId}`,
          '',
          '   If the existing run is completed or failed, use --force to rebind:',
          `   babysitter session:associate --session-id <id> --run-id ${runId} --force`,
        ],
      );
    }

    const oldRunId = existing.state.runId;
    let isTerminal = false;
    if (runsDir) {
      try {
        const journal = await loadJournal(path.join(runsDir, oldRunId));
        isTerminal = journal.some((event: { type: string }) =>
          event.type === 'RUN_COMPLETED' || event.type === 'RUN_FAILED'
        );
      } catch {
        isTerminal = true;
      }
    } else {
      isTerminal = true;
    }

    if (!isTerminal) {
      return emitError(
        json,
        {
          error: 'RUN_STILL_ACTIVE',
          message: `Cannot rebind: run ${oldRunId} is still active. Complete or fail the run first.`,
          existingRunId: oldRunId,
        },
        [
          `❌ Error: Cannot rebind — run ${oldRunId} is still active.`,
          '   Complete or fail the existing run before rebinding.',
        ],
      );
    }
  }

  try {
    await writeSessionFile(filePath, { ...existing.state, runId: runId! }, existing.prompt);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      json,
      { error: 'FS_ERROR', message: err.message },
      [`❌ Error: Failed to update state file: ${err.message}`],
    );
  }

  const result = { stateFile: filePath, runId };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✅ Associated session with run: ${runId}`);
    console.log(`   State file: ${filePath}`);
  }
  return 0;
}

export async function handleSessionResume(args: SessionCommandArgs): Promise<number> {
  const required = requireSessionArgs(args, { requireRunId: true });
  if (typeof required === 'number') {
    return required;
  }

  const { sessionId, stateDir, runId } = required;
  const { maxIterations = 256, runsDir = '.a5c/runs', json } = args;
  const runDir = path.join(runsDir, runId!);

  try {
    await fs.access(runDir);
  } catch {
    return emitError(
      json,
      { error: 'RUN_NOT_FOUND', message: `Run not found: ${runId}`, runDir },
      [
        `❌ Error: Run not found: ${runId}`,
        `   Expected directory: ${runDir}`,
      ],
    );
  }

  let runState = 'unknown';
  let processId = 'unknown';
  try {
    const runJson = JSON.parse(
      await fs.readFile(path.join(runDir, 'run.json'), 'utf8'),
    ) as Record<string, unknown>;
    processId = (typeof runJson.processId === 'string' ? runJson.processId : undefined) ?? 'unknown';

    const journalFiles = await fs.readdir(path.join(runDir, 'journal'));
    const lastFile = journalFiles.filter((file) => file.endsWith('.json')).sort().pop();
    if (lastFile) {
      const lastEvent = JSON.parse(
        await fs.readFile(path.join(runDir, 'journal', lastFile), 'utf8'),
      ) as Record<string, unknown>;
      if (lastEvent.type === 'RUN_COMPLETED') {
        runState = 'completed';
      } else if (lastEvent.type === 'RUN_FAILED') {
        runState = 'failed';
      } else {
        runState = 'waiting';
      }
    }
  } catch {
    runState = 'unknown';
  }

  if (runState === 'completed') {
    return emitError(
      json,
      { error: 'RUN_COMPLETED', message: 'Run is already completed', runId },
      [
        '❌ Error: Run is already completed',
        `   Run ID: ${runId}`,
        '   Cannot resume a completed run.',
      ],
    );
  }

  const prompt = `Resume Babysitter run: ${runId}

Process: ${processId}
Current state: ${runState}

Continue orchestration using run:iterate, task:post, etc. or fix the run if it's broken/failed/unknown.`;

  const now = getCurrentTimestamp();
  const state: SessionState = {
    active: true,
    iteration: 1,
    maxIterations,
    runId: runId!,
    runIds: [],
    startedAt: now,
    lastIterationAt: now,
    iterationTimes: [],
  };

  const filePath = getSessionFilePath(stateDir, sessionId);
  try {
    await writeSessionFile(filePath, state, prompt);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      json,
      { error: 'FS_ERROR', message: err.message },
      [`❌ Error: Failed to create state file: ${err.message}`],
    );
  }

  const result = { stateFile: filePath, runId, runState, processId };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`✅ Session resumed for run: ${runId}`);
    console.log(`   State file: ${filePath}`);
    console.log(`   Process: ${processId}`);
    console.log(`   Run state: ${runState}`);
  }
  return 0;
}
