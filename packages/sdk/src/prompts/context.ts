/**
 * Prompt context factory exports for each supported harness.
 *
 * @module prompts/context
 */

export {
  createClaudeCodeContext,
  createCodexContext,
  createGithubCopilotContext,
  createCursorContext,
  createGeminiCliContext,
  createOpenCodeContext,
  createPiContext,
  createOpenClawContext,
  createOhMyPiContext,
} from "../harness/hooks/promptContexts";
export { createInternalContext } from "../harness/internal/promptContext";
