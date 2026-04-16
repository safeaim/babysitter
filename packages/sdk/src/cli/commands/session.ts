/**
 * Session management CLI commands.
 * Replaces bash logic from babysitter plugin shell scripts.
 */

export type {
  SessionCommandArgs,
  SessionIterationMessageArgs,
  SessionIterationMessageResult,
  SessionLastMessageArgs,
  SessionLastMessageResult,
} from './session/types';
export {
  handleSessionInit,
  handleSessionAssociate,
  handleSessionResume,
} from './session/lifecycle';
export {
  handleSessionState,
  handleSessionUpdate,
  handleSessionCheckIteration,
} from './session/stateCommands';
export {
  parseTranscriptLastAssistantMessage,
  extractPromiseTag,
  handleSessionLastMessage,
} from './session/lastMessage';
export { handleSessionIterationMessage } from './session/iterationMessage';
