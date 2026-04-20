/**
 * Re-exports from the shared stop-hook continuation module.
 *
 * This file existed as the Claude-specific implementation, but the logic
 * is now shared across all harness adapters.  This re-export shim keeps
 * existing internal imports working.
 */

export {
  type ParsedAssistantState,
  parseAssistantStopState,
  type StopHookRunStateDetails,
  resolveStopHookRunState,
  buildStopHookContinuation,
} from "../hooks/stopHookContinuation";
