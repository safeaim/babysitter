import {
  SessionError,
  SessionState,
  deleteSessionFile,
  getCurrentTimestamp,
  getSessionFilePath,
  isIterationTooFast,
  readSessionFile,
  sessionFileExists,
  updateIterationTimes,
  writeSessionFile,
} from '../../../session';
import { getGlobalStateDir } from '../../../config';
import type { SessionCommandArgs } from './types';

function emitError(json: boolean, error: Record<string, unknown>, text: string): number {
  if (json) {
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.error(text);
  }
  return 1;
}

function requireBasicArgs(args: SessionCommandArgs): { sessionId: string; stateDir: string } | number {
  if (!args.sessionId) {
    return emitError(
      args.json,
      { error: 'MISSING_SESSION_ID', message: '--session-id is required' },
      '❌ Error: --session-id is required',
    );
  }
  return { sessionId: args.sessionId, stateDir: getGlobalStateDir() };
}

export async function handleSessionState(args: SessionCommandArgs): Promise<number> {
  const required = requireBasicArgs(args);
  if (typeof required === 'number') {
    return required;
  }

  const filePath = getSessionFilePath(required.stateDir, required.sessionId);
  if (!(await sessionFileExists(filePath))) {
    const result = { found: false, stateFile: filePath };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[session:state] not found: ${filePath}`);
    }
    return 0;
  }

  try {
    const file = await readSessionFile(filePath);
    const result = { found: true, state: file.state, prompt: file.prompt, stateFile: filePath };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[session:state] found: ${filePath}`);
      console.log(`  active: ${file.state.active}`);
      console.log(`  iteration: ${file.state.iteration}`);
      console.log(`  maxIterations: ${file.state.maxIterations}`);
      console.log(`  runId: ${file.state.runId || '(none)'}`);
      console.log(`  startedAt: ${file.state.startedAt}`);
      console.log(`  lastIterationAt: ${file.state.lastIterationAt}`);
      console.log(`  iterationTimes: [${file.state.iterationTimes.join(', ')}]`);
    }
    return 0;
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      args.json,
      { error: 'CORRUPTED_STATE', message: err.message, stateFile: filePath },
      `❌ Error: Failed to read state file: ${err.message}`,
    );
  }
}

export async function handleSessionUpdate(args: SessionCommandArgs): Promise<number> {
  const required = requireBasicArgs(args);
  if (typeof required === 'number') {
    return required;
  }

  const filePath = getSessionFilePath(required.stateDir, required.sessionId);
  if (args.delete) {
    const deleted = await deleteSessionFile(filePath);
    const result = { success: true, deleted, stateFile: filePath };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`✅ Session state file ${deleted ? 'deleted' : 'not found (already deleted)'}`);
    }
    return 0;
  }

  let existing;
  try {
    existing = await readSessionFile(filePath);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      args.json,
      { error: 'SESSION_NOT_FOUND', message: err.message },
      `❌ Error: Session not found: ${err.message}`,
    );
  }

  const updates: Partial<SessionState> = {};
  if (args.iteration !== undefined) {
    updates.iteration = args.iteration;
  }
  if (args.lastIterationAt !== undefined) {
    updates.lastIterationAt = args.lastIterationAt;
  }
  if (args.iterationTimes !== undefined) {
    updates.iterationTimes = args.iterationTimes
      .split(',')
      .map((value) => parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  const updatedState: SessionState = { ...existing.state, ...updates };
  try {
    await writeSessionFile(filePath, updatedState, existing.prompt);
  } catch (error) {
    const err = error instanceof SessionError ? error : new Error(String(error));
    return emitError(
      args.json,
      { error: 'FS_ERROR', message: err.message },
      `❌ Error: Failed to update state file: ${err.message}`,
    );
  }

  const result = { success: true, state: updatedState, stateFile: filePath };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('✅ Session state updated');
    console.log(`   State file: ${filePath}`);
    if (args.iteration !== undefined) {
      console.log(`   iteration: ${args.iteration}`);
    }
    if (args.lastIterationAt !== undefined) {
      console.log(`   lastIterationAt: ${args.lastIterationAt}`);
    }
    if (args.iterationTimes !== undefined) {
      console.log(`   iterationTimes: [${updatedState.iterationTimes.join(', ')}]`);
    }
  }
  return 0;
}

export async function handleSessionCheckIteration(args: SessionCommandArgs): Promise<number> {
  if (!args.sessionId) {
    const error = { error: 'MISSING_ARGS', message: '--session-id is required' };
    if (args.json) {
      console.error(JSON.stringify(error, null, 2));
    } else {
      console.error('❌ Error: --session-id is required');
    }
    return 1;
  }

  const required = requireBasicArgs(args);
  if (typeof required === 'number') {
    return required;
  }

  const filePath = getSessionFilePath(required.stateDir, required.sessionId);
  let file;
  try {
    file = await readSessionFile(filePath);
  } catch {
    const result = {
      found: false,
      shouldContinue: false,
      reason: 'session_not_found',
      iteration: 0,
      maxIterations: 0,
      runId: '',
      prompt: '',
      stopMessage: 'Session not found',
    };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('[session:check-iteration] shouldContinue=false reason=session_not_found');
    }
    return 0;
  }

  const { state } = file;
  if (state.maxIterations > 0 && state.iteration >= state.maxIterations) {
    const result = {
      found: true,
      shouldContinue: false,
      reason: 'max_iterations_reached',
      iteration: state.iteration,
      maxIterations: state.maxIterations,
      runId: state.runId ?? '',
      prompt: file.prompt ?? '',
      stopMessage: `Max iterations (${state.maxIterations}) reached`,
    };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[session:check-iteration] shouldContinue=false reason=max_iterations_reached iteration=${state.iteration}`);
    }
    return 0;
  }

  const now = getCurrentTimestamp();
  const updatedTimes = state.iteration >= 5
    ? updateIterationTimes(state.iterationTimes, state.lastIterationAt, now)
    : state.iterationTimes;

  if (isIterationTooFast(updatedTimes)) {
    const avg = updatedTimes.reduce((a, b) => a + b, 0) / updatedTimes.length;
    const result = {
      found: true,
      shouldContinue: false,
      reason: 'iteration_too_fast',
      averageTime: avg,
      threshold: 15,
      iteration: state.iteration,
      maxIterations: state.maxIterations,
      runId: state.runId ?? '',
      prompt: file.prompt ?? '',
      stopMessage: `Average iteration time too fast (${avg}s <= 15s)`,
    };
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[session:check-iteration] shouldContinue=false reason=iteration_too_fast avg=${avg}s`);
    }
    return 0;
  }

  const result = {
    found: true,
    shouldContinue: true,
    nextIteration: state.iteration + 1,
    updatedIterationTimes: updatedTimes,
    iteration: state.iteration,
    maxIterations: state.maxIterations,
    runId: state.runId ?? '',
    prompt: file.prompt ?? '',
  };
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`[session:check-iteration] shouldContinue=true nextIteration=${state.iteration + 1}`);
  }
  return 0;
}
