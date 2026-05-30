# Missing Hook Events — Specs for Implementation

13 Claude Code hook events are defined in the atlas graph but NOT handled by hooks-mux, agent-platform, or SDK.

## Priority 1 — Tool & Turn Lifecycle (4 events)

### PostToolUseFailure
**Canonical phase:** `tool.after_failure`
**Fires:** After a tool call fails (error, timeout, permission denied at execution)
**Input:** `{ tool_name, tool_input, error, exit_code }`
**Decisions:** Cannot block (side-effect only). Can inject `additionalContext`.
**Where to implement:**
- hooks-mux: Add `tool.after_failure` to CanonicalPhase union
- agent-platform: Fire after tool execution error in effect resolution
- SDK: Add to runtime hook dispatch in `callRuntimeHook()`

### PostToolBatch
**Canonical phase:** `tool.after_batch`
**Fires:** After a parallel batch of tool calls resolves (all tools in one model turn)
**Input:** `{ batch_results: [{ tool_name, tool_input, success, output }] }`
**Decisions:** Can block (prevents next model invocation). Can inject `additionalContext`.
**Where to implement:**
- hooks-mux: Add `tool.after_batch` to CanonicalPhase union
- agent-platform: Fire after all effects in one iteration resolve
- SDK: Add batch-level hook dispatch after parallel task resolution

### StopFailure
**Canonical phase:** `turn.stop_failure`
**Fires:** When a turn ends due to API error (rate limit, auth failure, server error)
**Input:** `{ error_type, error_message, retry_after }`
**Matcher:** Error type (`rate_limit`, `authentication_failed`, `billing_error`, `server_error`)
**Decisions:** Cannot block. Can inject context for recovery.
**Where to implement:**
- hooks-mux: Add `turn.stop_failure` to CanonicalPhase union
- agent-platform: Fire on API errors in orchestration loop
- agent-core: Emit error event from session.prompt() catch block

### UserPromptExpansion
**Canonical phase:** `turn.prompt_expansion`
**Fires:** Before a slash command/skill expands into its content
**Input:** `{ expansion_type, command_name, command_args, command_source, prompt }`
**Matcher:** Command name
**Decisions:** Can block (prevent expansion). Can modify prompt via `additionalContext`.
**Where to implement:**
- hooks-mux: Add `turn.prompt_expansion` to CanonicalPhase union
- SDK: Fire before skill invocation in CLI dispatch

## Priority 2 — Task & Team (3 events)

### TaskCreated
**Canonical phase:** `task.created`
**Fires:** When a task/effect is being created (ctx.task() in process)
**Input:** `{ task_id, task_kind, task_title, task_labels }`
**Decisions:** Can block (prevent task creation). Can modify task metadata.
**Where to implement:**
- SDK: Fire in `runTaskIntrinsic()` before effect dispatch
- agent-platform: Fire before effect journaling

### TaskCompleted
**Canonical phase:** `task.completed`
**Fires:** When a task/effect is marked complete
**Input:** `{ task_id, task_kind, task_status, task_result }`
**Decisions:** Can block (prevent completion, request re-do).
**Where to implement:**
- SDK: Fire in effect result commit
- agent-platform: Fire after task:post

### TeammateIdle
**Canonical phase:** `team.idle`
**Fires:** When a teammate agent is about to go idle (no more work)
**Input:** `{ agent_id, agent_type, idle_reason }`
**Decisions:** Can block (assign more work before idle).
**Where to implement:**
- agent-platform: Fire in subagent lifecycle management
- Requires multi-agent coordination infrastructure

## Priority 3 — Session & Config (3 events)

### Setup
**Canonical phase:** `session.setup`
**Fires:** One-time initialization (`--init-only`, `--init`, `--maintenance`)
**Input:** `{ trigger: "init" | "maintenance" }`
**Decisions:** Cannot block. Can inject initial context.
**Where to implement:**
- SDK: Fire on first-time project initialization
- agent-platform: Fire during harness install/setup

### InstructionsLoaded
**Canonical phase:** `session.instructions_loaded`
**Fires:** When CLAUDE.md or rules files are loaded
**Input:** `{ file_path, memory_type, load_reason, globs, trigger_file_path, parent_file_path }`
**Matcher:** Load reason (`session_start`, `nested_traversal`, `path_glob_match`, `include`)
**Decisions:** Cannot block. Can inject `additionalContext`.
**Where to implement:**
- SDK: Fire when babysitterMdDiscovery loads instructions
- agent-platform: Fire when process library instructions load

### ConfigChange
**Note:** Already handled for session.config_changed, but the Claude Code spec also allows blocking.
**Gap:** Current implementation fires the event but doesn't support blocking decisions.
**Where to fix:**
- hooks-mux: Add block support to config_changed handler

## Priority 4 — Advanced (3 events)

### MessageDisplay
**Note:** Partially handled. Custom rendering exists but not as a formal hookable event.
**Gap:** No formal `message.received` canonical phase in hooks-mux.
**Where to fix:**
- hooks-mux: Formalize as canonical phase
- agent-platform: Emit during streaming output

### model.before_request / model.after_response (Gemini-specific)
**Note:** These are in the atlas graph for Gemini adapter but not in the Claude Code 30-event spec.
**Status:** Low priority — only relevant for Gemini CLI integration.

### planner.before_tool_selection (Gemini-specific)
**Note:** Atlas graph only. Not in Claude Code spec.
**Status:** Low priority.
