# Live-Stack Sequence Diagrams

Detailed sequence diagrams for each scenario the live-stack E2E matrix covers. Each diagram traces a complete request through all components.

See [live-stack-architecture.md](./live-stack-architecture.md) for component descriptions and the overall architecture.

## Table of Contents

1. [Vanilla NI: Claude Code + Foundry](#1-vanilla-ni-claude-code--foundry)
2. [Vanilla NI: Claude Code + Gemini](#2-vanilla-ni-claude-code--gemini)
3. [Vanilla Bridged-Interactive: Claude Code](#3-vanilla-bridged-interactive-claude-code)
4. [Vanilla Interactive: Claude Code](#4-vanilla-interactive-claude-code)
5. [Vanilla NI: Codex + Foundry](#5-vanilla-ni-codex--foundry)
6. [BP Bridged-Hooks: Claude Code + Foundry](#6-bp-bridged-hooks-claude-code--foundry)
7. [BP Interactive: Claude Code + Foundry](#7-bp-interactive-claude-code--foundry)

---

## 1. Vanilla NI: Claude Code + Foundry

The simplest proxy path. Claude Code runs with `-p` (autonomous), talks Anthropic protocol to the proxy, which translates to OpenAI and forwards to Azure Foundry.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant PA as prepareClaudeAutomationState
    participant TM as transport-mux Proxy
    participant OE as OpenAI Engine
    participant AZ as Azure Foundry
    participant CC as Claude Code (-p)

    TR->>AL: executeCommand(amux launch claude foundry<br/>--no-interactive -p "Write Odyssey...")
    AL->>AL: resolveLaunchPlan()<br/>claude + foundry → proxyRequired=true
    AL->>TM: startTransportMuxRuntime({<br/>targetProvider: foundry,<br/>exposedTransport: anthropic})
    TM-->>AL: { url: http://127.0.0.1:PORT, authToken }
    AL->>AL: applyHarnessEnv(plan.env)<br/>ANTHROPIC_BASE_URL=proxy, ANTHROPIC_API_KEY=token
    AL->>AL: Clear ANTHROPIC_AUTH_TOKEN (avoid auth conflict)
    AL->>PA: prepareClaudeAutomationState(cwd, plan.env)<br/>Pre-approve API key, skip onboarding
    AL->>CC: spawn("claude", ["-p", prompt, "--max-turns", "15"])

    loop Each model turn (up to max-turns)
        CC->>TM: POST /v1/messages<br/>{messages, tools, model, stream: true}
        TM->>TM: buildCompletionRequest()<br/>Extract tools, rawContent
        TM->>OE: engine.stream(request)
        OE->>OE: translateMessagesToOpenAi()<br/>tool_result → role:"tool"<br/>tool_use → role:"assistant" + tool_calls
        OE->>OE: normalizeOpenAiTools()<br/>input_schema → parameters
        OE->>AZ: POST /openai/deployments/gpt-5.5/chat/completions<br/>{messages, tools, stream: true}
        AZ-->>OE: SSE: delta.content + delta.tool_calls
        OE->>OE: Accumulate tool_calls across chunks
        OE-->>TM: yield text-delta / tool-call events
        TM->>TM: anthropicStreamResponse()<br/>content_block_start(tool_use) +<br/>input_json_delta + content_block_stop
        TM-->>CC: SSE: Anthropic streaming format
        CC->>CC: Execute tool (Write file)
    end

    CC-->>AL: exit 0
    AL->>TM: stop()
    AL-->>TR: exit code

    TR->>TR: Verify file-creation<br/>.a5c-live-test/UUID-odyssey.md > 500 bytes
```

---

## 2. Vanilla NI: Claude Code + Gemini

Same as Foundry but with Google/Vertex engine. Key difference: `thoughtSignature` must be preserved across turns.

```mermaid
sequenceDiagram
    participant CC as Claude Code (-p)
    participant TM as transport-mux Proxy
    participant GE as Google Engine
    participant VX as Vertex AI
    participant SS as thoughtSignatureStore

    Note over CC,VX: Setup same as Foundry path (proxy start, env inject, automation state)

    CC->>TM: POST /v1/messages {messages, tools}
    TM->>GE: engine.stream(request)
    GE->>GE: translateMessagesToGoogle(messages, sigStore)<br/>First turn: no prior tool_use to translate
    GE->>GE: buildGoogleBody(messages, tools)<br/>tools → [{functionDeclarations: [...]}]
    GE->>VX: POST /v1/projects/.../models/gemini-3.1-pro:streamGenerateContent
    VX-->>GE: SSE: {candidates: [{content: {parts: [{functionCall: {name, args}, thoughtSignature: "sig123"}]}}]}
    GE->>SS: store("call_0", "sig123")
    GE->>GE: extractGoogleToolCalls() → [{id, name, args, metadata: {thoughtSignature}}]
    GE-->>TM: yield tool-call event (with metadata)
    TM->>TM: anthropicStreamResponse()<br/>content_block_start includes metadata
    TM-->>CC: SSE: tool_use block

    CC->>CC: Execute tool (Write file)

    CC->>TM: POST /v1/messages {messages with tool_use + tool_result}
    TM->>GE: engine.stream(request)
    GE->>GE: translateMessagesToGoogle(messages, sigStore)<br/>tool_use block → functionCall<br/>Lookup sigStore("call_0") → inject thoughtSignature<br/>tool_result block → functionResponse
    GE->>VX: POST streamGenerateContent<br/>{contents: [{parts: [{functionCall + thoughtSignature}, {functionResponse}]}]}
    VX-->>GE: Response (no 400 error — signature present)
    GE-->>TM: text-delta events
    TM-->>CC: SSE: text content

    CC-->>CC: Task complete, exit
```

---

## 3. Vanilla Bridged-Interactive: Claude Code

PTY-based bridge. Claude Code runs interactively but output is parsed into structured NDJSON events. Auto-responds to onboarding prompts.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant PTY as node-pty
    participant CC as Claude Code (PTY)
    participant TM as transport-mux Proxy

    TR->>AL: executeCommand(amux launch claude foundry<br/>--no-interactive --bridge-interactive)
    AL->>AL: resolveLaunchPlan()
    AL->>TM: startTransportMuxRuntime()
    AL->>AL: prepareClaudeAutomationState()<br/>Pre-approve API key + onboarding
    AL->>PTY: spawn("claude", ["--bare", "--max-turns", "15", ...])

    PTY-->>AL: onData: ANSI welcome screen
    Note over AL: outputBuf accumulates

    alt API Key Prompt Detected
        AL->>AL: stripped.includes('usethisAPIkey')
        AL->>PTY: write('\x1b[A\r') — Up + Enter = "Yes"
    end

    alt Bypass Permissions Prompt
        AL->>AL: stripped.includes('BypassPermissionsmode')
        AL->>PTY: write('\x1b[B\r') — Down + Enter = "Yes, I accept"
    end

    Note over AL: waitForOutputThenInject()
    AL->>AL: outputBuf.length > 0 → output seen
    AL->>AL: Check for prompts, wait 8s stabilization
    AL->>PTY: write(prompt)
    AL->>PTY: write('\r') — submit

    loop Model turns
        CC->>TM: API call through proxy
        TM-->>CC: Streaming response
        PTY-->>AL: onData: ANSI output chunks
        AL->>AL: Strip ANSI, feed to adapter.parseEvent()
        AL->>AL: Emit NDJSON bridge events to stdout

        alt message_stop / turn_end detected
            AL->>PTY: kill('SIGTERM') after 1s
        end
    end

    PTY-->>AL: onExit
    AL->>AL: Flush remaining output as final event
    AL-->>TR: exit code
```

---

## 4. Vanilla Interactive: Claude Code

Full interactive PTY with prompt as positional argument for autonomous execution.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant PTY as node-pty
    participant CC as Claude Code (Interactive)
    participant TM as transport-mux Proxy

    TR->>AL: executeCommand(amux launch claude foundry<br/>"Write Odyssey..." --max-turns 15 --yolo)

    AL->>TM: startTransportMuxRuntime()
    AL->>AL: prepareClaudeAutomationState()
    AL->>AL: appendHarnessSessionArgs():<br/>prompt as positional arg (autonomous mode)
    AL->>PTY: spawn("claude", [prompt, "--max-turns", "15",<br/>"--dangerously-skip-permissions"])

    Note over AL: Auto-respond to onboarding prompts<br/>(same as bridged-interactive)

    PTY-->>AL: onData → process.stdout.write(data)
    AL->>AL: Turn detection via adapter.parseEvent()

    CC->>TM: API calls through proxy (multi-turn)
    TM-->>CC: Responses with tool_use

    CC->>CC: Execute tools, write files
    CC-->>AL: Process exits (task complete or max-turns)
    AL-->>TR: exit code
```

---

## 5. Vanilla NI: Codex + Foundry

Codex uses `exec` subcommand for NI mode. May not need proxy if provider is OpenAI-compatible.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant TM as transport-mux Proxy
    participant CX as Codex (exec mode)
    participant AZ as Azure Foundry

    TR->>AL: executeCommand(amux launch codex foundry<br/>--no-interactive --prompt "Write Odyssey...")
    AL->>AL: resolveLaunchPlan()<br/>codex + foundry → proxyRequired depends on transport
    AL->>TM: startTransportMuxRuntime() (if needed)
    AL->>AL: prepareCodexAutomationState()
    AL->>CX: spawn("codex", ["exec", prompt])

    CX->>TM: OpenAI-format API calls
    TM->>AZ: Forward to Azure
    AZ-->>TM: Response
    TM-->>CX: Response

    CX->>CX: Execute tools, write file
    CX-->>AL: exit 0
    AL-->>TR: exit code
```

---

## 6. BP Bridged-Hooks: Claude Code + Foundry

Babysitter-plugin with hook emulation. The BridgeHookEmulator wraps the harness execution with lifecycle hooks.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant BHE as BridgeHookEmulator
    participant SDK as babysitter CLI
    participant CC as Claude Code (-p)
    participant TM as transport-mux Proxy
    participant FS as .a5c/runs/

    TR->>AL: executeCommand(amux launch claude foundry<br/>--no-interactive --bridge-hooks -p "Use babysitter skill...")

    AL->>TM: startTransportMuxRuntime()
    AL->>BHE: new BridgeHookEmulator({harness, cwd, env})
    BHE->>SDK: babysitter hook:run --hook-type session-start
    SDK->>FS: Create session state + bare run
    SDK-->>BHE: { runId, emulated: true }

    AL->>AL: prepareClaudeAutomationState()
    AL->>CC: spawn("claude", ["-p", prompt, "--max-turns", "30"])

    CC->>TM: API calls through proxy
    TM-->>CC: Responses (multi-turn tool use)
    CC->>CC: Invoke babysitter skill → run:create, iterate, post
    CC-->>AL: exit (task complete or max-turns)

    AL->>BHE: emulateStop()
    BHE->>SDK: babysitter run:status <runDir>
    SDK-->>BHE: { state, needsMoreIterations, shouldContinue }

    alt shouldContinue = true
        AL->>CC: respawn with --resume
        CC-->>AL: exit
        AL->>BHE: emulateStop()
    end

    AL->>BHE: emulateSessionEnd()
    BHE->>SDK: babysitter hook:run --hook-type session-end
    AL-->>TR: exit code

    TR->>TR: Verify: file-creation ✓<br/>stop-hooks ✓<br/>babysitter-completion-proof ✓
```

---

## 7. BP Interactive: Claude Code + Foundry

Native hooks — Claude Code fires lifecycle hooks from its installed babysitter plugin.

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant AL as amux launch
    participant PTY as node-pty
    participant CC as Claude Code (Interactive + Plugin)
    participant HM as hooks-mux (native)
    participant SDK as babysitter SDK
    participant TM as transport-mux Proxy
    participant FS as .a5c/runs/

    TR->>AL: executeCommand(amux launch claude foundry<br/>"Use babysitter skill..." --max-turns 30 --yolo)

    Note over TR: Setup: generate:plugins + install + harness:install-plugin<br/>+ copy summarize-translate-test.mjs to .a5c/processes/

    AL->>TM: startTransportMuxRuntime()
    AL->>AL: prepareClaudeAutomationState()
    AL->>PTY: spawn("claude", [prompt, "--max-turns", "30",<br/>"--dangerously-skip-permissions"])

    Note over CC: Claude Code starts with babysitter plugin installed

    CC->>HM: SessionStart hook (native, from plugin)
    HM->>SDK: babysitter hook:run --hook-type session-start
    SDK->>FS: Create session + run

    CC->>TM: API calls through proxy
    TM-->>CC: Responses
    CC->>CC: Invoke babysitter skill<br/>→ Uses .a5c/processes/summarize-translate-test.mjs<br/>→ run:create, iterate, task execution, post

    CC->>HM: Stop hook (native)
    HM->>SDK: babysitter hook:run --hook-type stop
    SDK->>FS: Write journal: RUN_COMPLETED + completionProof

    CC->>HM: SessionEnd hook (native)
    CC-->>AL: exit

    AL-->>TR: exit code

    TR->>TR: Verify: file-creation ✓<br/>stop-hooks ✓ (journal evidence)<br/>hooks-mux-session ✓<br/>babysitter-run-completion ✓<br/>babysitter-completion-proof ✓
```

---

## Auth Conflict Resolution

CI runners may have both `ANTHROPIC_AUTH_TOKEN` (native auth) and `ANTHROPIC_API_KEY` (from proxy). Claude Code shows an "Auth conflict" warning and exits confused.

```mermaid
sequenceDiagram
    participant AL as amux launch
    participant ENV as Environment
    participant CC as Claude Code

    Note over ENV: CI sets ANTHROPIC_AUTH_TOKEN (native)<br/>Proxy sets ANTHROPIC_API_KEY (proxy token)

    AL->>ENV: applyHarnessEnv() → ANTHROPIC_API_KEY = proxy token
    AL->>ENV: Clear ANTHROPIC_AUTH_TOKEN = ''
    Note over ENV: Only ANTHROPIC_API_KEY remains

    AL->>CC: spawn with clean env
    CC->>CC: Detects single API key → uses it (proxy)
    CC->>CC: No auth conflict warning
```
