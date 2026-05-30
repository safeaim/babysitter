# Missing Hook Capabilities — Agent Stack Gaps

Beyond the 13 missing events, the agent stack lacks several hook capabilities that Claude Code supports.

## 1. Handler Types (4/5 missing)

Claude Code supports 5 hook handler types. Agent-platform/hooks-mux only support `command`.

| Handler Type | Claude Code | Agent Stack | Gap |
|-------------|------------|-------------|-----|
| `command` | ✅ Shell subprocess | ✅ hooks-mux runner.ts | — |
| `http` | ✅ POST to webhook URL | ❌ | Need HTTP handler in hooks-mux runner |
| `mcp_tool` | ✅ Call MCP server tool | ❌ | Need MCP tool handler in hooks-mux |
| `prompt` | ✅ LLM evaluates prompt | ❌ | Need prompt handler (model call) |
| `agent` | ✅ Spawn subagent to evaluate | ❌ | Need agent handler (subagent spawn) |

### Changes needed

**hooks-mux/core:**
- `src/normalizer/runner.ts` — Add handler dispatch by type (currently shell-only)
- `src/types/plan.ts` — Extend `HandlerRef` with `type` field and type-specific config
- New: `src/handlers/http.ts` — HTTP POST handler with header interpolation
- New: `src/handlers/mcp-tool.ts` — MCP tool invocation handler
- New: `src/handlers/prompt.ts` — LLM prompt evaluation handler
- New: `src/handlers/agent.ts` — Subagent spawn handler

**agent-platform:**
- `src/harness/amux/amuxBridge.ts` — Pass hook handler type config through bridge

## 2. Decision Types (3 missing)

| Decision | Claude Code | Agent Stack | Gap |
|----------|------------|-------------|-----|
| `allow` | ✅ PreToolUse | ✅ hooks-mux | — |
| `deny` | ✅ PreToolUse | ✅ hooks-mux | — |
| `ask` | ✅ PreToolUse | ✅ hooks-mux | — |
| `defer` | ✅ Let normal flow decide | ❌ | Need in hooks-mux result types |
| `block` | ✅ Block action with reason | ❌ | Need in hooks-mux + agent-platform |
| `retry` | ✅ PermissionDenied recovery | ❌ | Need in hooks-mux + agent-platform |

### Changes needed

**hooks-mux/core:**
- `src/types/result.ts` — Add `defer`, `block`, `retry` to decision union
- `src/normalizer/evaluator.ts` — Handle new decision types

**hooks-mux/adapter-claude:**
- `src/renderer.ts` — Render `defer`, `block`, `retry` decisions for Claude Code

**agent-platform:**
- `src/harness/internal/createRun/orchestration/effects.ts` — Handle `block` decision in effect resolution
- `src/governance/` — Integrate `block` with governance policy engine

## 3. Matcher Patterns (regex, negation, OR missing)

| Capability | Claude Code | Agent Stack | Gap |
|-----------|------------|-------------|-----|
| Exact match | ✅ `"Bash"` | ✅ dot-path equality | — |
| Pipe-separated OR | ✅ `"Edit\|Write"` | ❌ AND-only | Need OR logic |
| Regex patterns | ✅ `"mcp__.*"` | ❌ exact only | Need regex support |
| Negation | ✅ (via regex `^(?!rm)`) | ❌ | Need negation operator |
| `if` conditional | ✅ `"Bash(rm *)"` permission syntax | ❌ | Need `if` field parsing |

### Changes needed

**hooks-mux/core:**
- `src/normalizer/plan-resolver.ts` — Extend `evaluateWhen()` with regex, OR, negation
- `src/types/plan.ts` — Add `if` field to HookPlanEntry

## 4. Async Execution (fully missing)

| Capability | Claude Code | Agent Stack | Gap |
|-----------|------------|-------------|-----|
| `async: true` | ✅ Background, non-blocking | ❌ | Need async handler spawn |
| `asyncRewake: true` | ✅ Background + rewake on exit 2 | ❌ | Need rewake mechanism |
| `once: true` | ✅ Run only once per session | ❌ | Need per-session dedup |

### Changes needed

**hooks-mux/core:**
- `src/normalizer/runner.ts` — Add async spawn mode (don't await)
- `src/normalizer/runner.ts` — Add rewake: monitor exit code, inject stderr as system reminder
- New: `src/state/hook-execution-tracker.ts` — Track `once` per session

**agent-platform:**
- Background hook results need to feed back into orchestration context

## 5. Environment Variables (2 missing)

| Variable | Claude Code | Agent Stack | Gap |
|----------|------------|-------------|-----|
| `CLAUDE_PROJECT_DIR` | ✅ | ❌ | Map to `AGENT_WORKSPACE_ROOT` or add |
| `CLAUDE_ENV_FILE` | ✅ Persist env vars | ❌ | Need env file mechanism |
| `CLAUDE_PLUGIN_ROOT` | ✅ | ✅ via `PI_PLUGIN_ROOT` | Naming mismatch |
| `CLAUDE_PLUGIN_DATA` | ✅ | ❌ | Need plugin data dir |
| `CLAUDE_EFFORT` | ✅ | ❌ | Need effort level propagation |
| `CLAUDE_CODE_REMOTE` | ✅ | ❌ | Need remote detection |

### Changes needed

**hooks-mux/core:**
- `src/propagation/materialize.ts` — Add missing env vars to injection
- New: env file mechanism for SessionStart/Setup/CwdChanged/FileChanged hooks

**agent-platform:**
- Propagate `CLAUDE_EFFORT` from session options

## 6. Hook Output Processing (partial)

| Capability | Claude Code | Agent Stack | Gap |
|-----------|------------|-------------|-----|
| `continue: false` | ✅ Stop entire session | ❌ | Need session abort signal |
| `stopReason` | ✅ Message on stop | ❌ | Need reason propagation |
| `suppressOutput` | ✅ Hide hook output | ❌ | Need output suppression |
| `systemMessage` | ✅ Warning to user | Partial | Exists but not all events |
| `terminalSequence` | ✅ Terminal escape codes | ❌ | Need terminal sequence injection |
| `additionalContext` | ✅ Context for Claude | Partial | Some events only |
| `updatedInput` | ✅ Modify tool input | ❌ | Need input mutation pipeline |
| `sessionTitle` | ✅ Set session name | ❌ | Need session title API |
| `watchPaths` | ✅ Add file watchers | ❌ | Need dynamic watcher registration |

### Changes needed

**hooks-mux/core:**
- `src/types/result.ts` — Extend UnifiedHookResult with all output fields
- `src/normalizer/evaluator.ts` — Process `continue`, `stopReason`, `suppressOutput`, `updatedInput`

**agent-platform:**
- `src/harness/internal/createRun/orchestration/` — Handle `continue: false` as session abort
- `src/session/` — Session title API for `sessionTitle` output
- `src/harness/` — Tool input mutation pipeline for `updatedInput`

**agent-runtime:**
- `src/daemon/` — Dynamic file watcher registration for `watchPaths`

## 7. Hook Configuration (partial)

| Capability | Claude Code | Agent Stack | Gap |
|-----------|------------|-------------|-----|
| `disableAllHooks` | ✅ Global kill switch | ❌ | Need in hooks-mux config |
| `statusMessage` | ✅ Custom spinner text | ❌ | Need in hook UI |
| `timeout` per hook | ✅ Configurable | ❌ | Need per-hook timeout in runner |
| `shell` selection | ✅ bash/powershell | ❌ | Need in hook command config |
| Header env interpolation | ✅ `$VAR` in headers | ❌ | Need for HTTP handler |
| `allowedEnvVars` | ✅ Restrict env leaks | ❌ | Need for HTTP handler |

### Changes needed

**hooks-mux/core:**
- `src/config.ts` — Add `disableAllHooks` support
- `src/normalizer/runner.ts` — Per-hook timeout, shell selection
- New HTTP handler: header interpolation with allowedEnvVars
