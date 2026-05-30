# Hook Event Coverage Matrix

30 Claude Code hook events vs. implementation status across the agent stack.

## Legend
- **atlas**: Event defined in atlas graph schema
- **hooks-mux**: Canonical phase exists in hooks-mux core
- **agent-platform**: Event handler/mapper exists
- **SDK**: Harness hook handler exists
- **agent-core**: Session event type exists

## Full Matrix

| # | Event | Canonical Phase | atlas | hooks-mux | agent-platform | SDK | Status |
|---|-------|----------------|-------|-----------|---------------|-----|--------|
| 1 | SessionStart | session.start | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 2 | Setup | session.setup | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 3 | SessionEnd | session.end | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 4 | UserPromptSubmit | turn.user_prompt_submitted | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 5 | UserPromptExpansion | turn.prompt_expansion | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 6 | Stop | turn.stop | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 7 | StopFailure | turn.stop_failure | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 8 | PreToolUse | tool.before | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 9 | PermissionRequest | tool.permission_request | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 10 | PermissionDenied | tool.permission_denied | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 11 | PostToolUse | tool.after | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 12 | PostToolUseFailure | tool.after_failure | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 13 | PostToolBatch | tool.after_batch | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 14 | SubagentStart | subagent.start | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 15 | SubagentStop | subagent.end | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 16 | TaskCreated | task.created | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 17 | TaskCompleted | task.completed | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 18 | TeammateIdle | team.idle | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 19 | FileChanged | session.file_changed | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 20 | CwdChanged | session.cwd_changed | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 21 | ConfigChange | session.config_changed | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 22 | InstructionsLoaded | session.instructions_loaded | ✅ | ❌ | ❌ | ❌ | **MISSING** |
| 23 | PreCompact | session.compact.before | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 24 | PostCompact | session.compact.after | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 25 | Elicitation | mcp.elicitation | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 26 | ElicitationResult | mcp.elicitation_result | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 27 | WorktreeCreate | session.worktree_create | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 28 | WorktreeRemove | session.worktree_remove | ✅ | ✅ | ✅ | ✅ | **DONE** |
| 29 | MessageDisplay | message.received | ✅ | ✅ custom | ✅ custom | ✅ | **DONE** |
| 30 | Notification | notification | ✅ | ✅ | ✅ | ✅ | **DONE** |

## Summary

| Status | Count | Percentage |
|--------|-------|-----------|
| DONE | 17 | 57% |
| MISSING | 13 | 43% |
| atlas covered | 30 | 100% |
