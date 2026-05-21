# Advanced Babysitter Patterns - Agent/Skill Execution and Iterative Convergence

**Date:** 2026-01-19
**Added to:** SKILL.md Section 3.7 Common Patterns

---

## Summary

Added three new advanced patterns to the babysitter skill documentation:

1. **Pattern 5:** Agent-based execution (LLM-powered tasks)
2. **Pattern 6:** Skill-based execution (Claude Code skill invocation)
3. **Pattern 7:** Complex iterative convergence with scoring

These patterns demonstrate sophisticated orchestration capabilities beyond basic task execution.

---

## Pattern 5: Agent-Based Execution

### Concept

Tasks can have `kind: "agent"` to invoke agentic tasks. The orchestrator routes these to the appropriate agent runtime.

### TaskDef Structure

```javascript
{
  kind: "agent",
  title: "Agentic code review",
  description: "Code review using an agent",

  agent: {
    name: "code-reviewer",         // The sub-agent name (not the runtime)
    prompt: {                       // Structured prompt as JSON for clarity
      role: "senior code reviewer",
      task: "Analyze code for quality, security, and best practices",
      context: {
        diff: "...",
        files: [...]
      },
      instructions: [
        "Review each file",
        "Identify issues by severity",
        "Provide suggestions"
      ],
      outputFormat: "Structured JSON with summary and issues"
    },
    outputSchema: {                 // Optional structured output schema
      type: "object",
      properties: { ... }
    }
  },

  io: {
    inputJsonPath: "...",
    outputJsonPath: "..."
  },

  labels: ["agent", "code-review"]
}
```

### Key Features

- **Structured prompts:** Single JSON-structured prompt (role, task, context, instructions, outputFormat)
- **Sub-agent name:** Identifies the specific agent to use (e.g., "code-reviewer", "quality-scorer")
- **Output schema:** Enforce structured JSON output via schema
- **Metadata-driven:** Agent doesn't need to be installed locally - orchestrator handles dispatch

### Example Use Case

Code review agent that:
1. Receives diff and file list
2. Analyzes for quality, security, best practices
3. Returns structured review with issues categorized by severity
4. Process can check for critical issues and breakpoint if found

### Why This Matters

Agents are **just tasks** - no special API needed. Process code treats agent execution the same as any other task:

```javascript
const review = await ctx.task(codeReviewAgentTask, {
  diffContent: inputs.diff
});
```

---

## Pattern 6: Skill-Based Execution

### Concept

Tasks can have `kind: "skill"` to invoke Claude Code skills. Useful for reusing specialized skills within orchestrated workflows.

### TaskDef Structure

```javascript
{
  kind: "skill",
  title: "Analyze with skill",
  description: "Use specialized skill",

  skill: {
    name: "codebase-analyzer",    // Skill identifier
    context: {                     // Structured context with instructions
      scope: "src/",
      depth: "detailed",
      targetFiles: [...],
      analysisType: "consistency",
      criteria: ["Code consistency", "Naming conventions"],
      instructions: [               // Instructions for the skill
        "Scan specified paths",
        "Check consistency",
        "Analyze patterns",
        "Generate report"
      ]
    }
  },

  io: {
    inputJsonPath: "...",
    outputJsonPath: "..."
  },

  labels: ["skill", "analysis"]
}
```

### Key Features

- **Skill invocation:** Call existing skills as tasks
- **Argument passing:** String args + structured context
- **Reusability:** Skills can be composed into larger workflows
- **Metadata-driven:** Skill name + context is all that's needed

### Example Use Case

Invoke a codebase analyzer skill to:
1. Scan specific file paths
2. Check consistency against criteria
3. Return structured analysis results
4. Process can aggregate results from multiple skill invocations

### Why This Matters

Skills become **composable building blocks**. A workflow can orchestrate multiple skills:

```javascript
const analysis1 = await ctx.task(analyzeSkillTask, { scope: "api/" });
const analysis2 = await ctx.task(analyzeSkillTask, { scope: "ui/" });
const combined = mergeAnalyses(analysis1, analysis2);
```

---

## Pattern 7: Complex Iterative Convergence with Scoring

### Concept

Multi-step process where each iteration:
1. **Analyzes** current state
2. **Scores** quality against criteria (using agent)
3. **Improves** based on recommendations (using agent)
4. **Verifies** improvements
5. **Loops** until convergence (score >= threshold)

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Iterative Convergence Loop                     │
│                                                  │
│  ┌──────────┐     ┌──────────┐                 │
│  │ Analyze  │ --> │  Score   │ (agent-based)   │
│  │ (node)   │     │ (0-100)  │                 │
│  └──────────┘     └────┬─────┘                 │
│                        │                        │
│                 [score >= threshold?]           │
│                   │           │                 │
│                  YES         NO                 │
│                   │           │                 │
│              ┌────┴───┐  ┌───┴─────┐           │
│              │ Return │  │ Improve │ (agent)   │
│              └────────┘  └────┬────┘           │
│                               │                 │
│                          ┌────┴────┐           │
│                          │ Verify  │ (node)    │
│                          └────┬────┘           │
│                               │                 │
│                          [passed?]              │
│                          │      │               │
│                         YES    NO               │
│                          │      │               │
│                     [loop]  [breakpoint]        │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Key Features

1. **Score-based convergence:** Clear threshold (e.g., 85/100)
2. **Multi-criteria evaluation:** Agent evaluates against 5+ criteria
3. **Safety mechanisms:**
   - `maxIterations` prevents infinite loops
   - Breakpoint if minimal improvement (< 5 points)
   - Breakpoint if verification fails
   - Breakpoint if max iterations reached
4. **Progress tracking:** `history` array records each iteration
5. **Labeled tasks:** Each task labeled with iteration number for traceability
6. **Agent-based scoring:** LLM evaluates subjective quality
7. **Structured output:** Agent returns scores with justifications

### Example Iteration Flow

**Iteration 1:**
```
Analyze → Score: 45/85 → Improve → Verify → Loop
```

**Iteration 2:**
```
Analyze → Score: 62/85 → Improve → Verify → Loop
```

**Iteration 3:**
```
Analyze → Score: 68/85 (improvement only +6)
         ↓
    [Breakpoint: "Minimal improvement detected"]
         ↓
    Human reviews → Continues
```

**Iteration 4:**
```
Analyze → Score: 87/85 ✓ Converged!
```

### Breakpoint Routing

Breakpoints support routing fields to control who receives them and how responses are collected:

```javascript
const approval = await ctx.breakpoint({
  question: "Review the security audit results?",
  options: ["Approve", "Request changes"],
  expert: "security-reviewer",       // route to a specific domain expert
  tags: ["security", "audit"],       // categorization tags for filtering
  strategy: "first-response-wins",   // collect strategy (single | first-response-wins | collect-all | quorum)
});
```

Use `expert: 'owner'` to route back to the run requester. The `strategy` field is only meaningful when `expert !== 'owner'`.

### Breakpoint Rejection Handling — Retry/Refine Pattern

Processes must ALWAYS loop back on rejection, never fail. Use `previousFeedback` and `attempt` fields to track retry state:

```javascript
let lastFeedback = null;
for (let attempt = 0; attempt < 3; attempt++) {
  if (lastFeedback) {
    currentResult = await ctx.task(refineTask, { ...args, feedback: lastFeedback, attempt: attempt + 1 });
  }
  const approval = await ctx.breakpoint({
    question: 'Review and approve this step?',
    options: ['Approve', 'Request changes'],
    expert: 'owner',
    tags: ['approval-gate'],
    previousFeedback: lastFeedback || undefined,
    attempt: attempt > 0 ? attempt + 1 : undefined,
  });
  if (approval.approved) break;
  lastFeedback = approval.response || approval.feedback || 'Changes requested';
}
```

### Breakpoint Strategy

Smart breakpoints prevent wasted iterations:

1. **Minimal improvement:** `< 5 points` triggers review
   - Prevents oscillation
   - Human can adjust criteria or accept current state

2. **Verification failure:** Improvements break tests
   - Human reviews what went wrong
   - Can rollback or fix

3. **Max iterations:** Didn't converge in time
   - Human decides: accept or continue with more iterations
   - Prevents infinite loops

### History Tracking

Each iteration records:
```javascript
{
  iteration: 3,
  score: 68,
  analysis: { ... },
  scoring: {
    overallScore: 68,
    criteriaScores: [
      { criterion: "Best practices", score: 75, justification: "..." },
      { criterion: "Edge cases", score: 60, justification: "..." },
      ...
    ],
    recommendations: ["Add null checks", "Improve error messages"]
  },
  improvements: {
    changesMade: ["Added null checks in api.js", ...],
    filesModified: ["api.js", "utils.js"]
  },
  verification: {
    passed: true
  }
}
```

This enables:
- **Debugging:** See exactly what happened each iteration
- **Auditing:** Full trail of decisions and changes
- **Learning:** Analyze convergence patterns

### Agent-Based Scoring

The `scoreTask` uses an agent to evaluate quality:

**Agent Prompt (structured JSON):**
```json
{
  "role": "quality scorer",
  "task": "Evaluate the code against criteria and return a score 0-100",
  "context": {
    "analysis": { ... },
    "criteria": [
      "Code follows best practices",
      "All edge cases handled",
      "Error handling comprehensive",
      "Documentation clear",
      "Performance optimized"
    ],
    "iteration": 3
  },
  "instructions": [
    "Review the analysis results",
    "Score each criterion from 0-100",
    "Provide justification for each score",
    "Calculate overall score (average of criteria scores)",
    "Generate actionable recommendations for improvement"
  ],
  "outputFormat": "JSON with overallScore, criteriaScores array, and recommendations array"
}
```

**Output (structured):**
```json
{
  "overallScore": 68,
  "criteriaScores": [
    {
      "criterion": "Code follows best practices",
      "score": 75,
      "justification": "Good use of async/await, but some magic numbers"
    },
    {
      "criterion": "All edge cases handled",
      "score": 60,
      "justification": "Missing null checks in 3 locations"
    },
    ...
  ],
  "recommendations": [
    "Add null checks in parseInput(), handleRequest(), formatOutput()",
    "Extract magic numbers to named constants",
    "Add JSDoc comments for public API"
  ]
}
```

### Why This Pattern Matters

**Real-world applicability:**
- Code quality improvement
- Design iteration
- Content refinement
- Test coverage optimization
- Performance tuning

**Deterministic + Subjective:**
- Combines objective verification (tests pass)
- With subjective evaluation (code quality)
- Agent provides consistency in scoring

**Resumable:**
- Each iteration is event-sourced
- Can pause and resume
- Full audit trail of convergence

**Safe:**
- Multiple safety mechanisms
- Human oversight at key decision points
- No infinite loops

---

## Integration Examples

### Combining Patterns

You can combine these patterns in sophisticated ways:

**Example: Multi-phase improvement with agent review**

```javascript
export async function process(inputs, ctx) {
  // Phase 1: Automated analysis
  const staticAnalysis = await ctx.task(analyzeTask, inputs);

  // Phase 2: Agent-based code review
  const agentReview = await ctx.task(codeReviewAgentTask, {
    analysis: staticAnalysis,
    files: inputs.files
  });

  // Phase 3: Skill-based specialized check
  const securityCheck = await ctx.task(securitySkillTask, {
    scope: inputs.target,
    findings: agentReview.issues
  });

  // Phase 4: Iterative improvement if issues found
  if (securityCheck.criticalIssues.length > 0) {
    const approval = await ctx.breakpoint({
      reason: "Critical security issues",
      issues: securityCheck.criticalIssues,
      question: "Start iterative improvement?",
      options: ["Approve", "Reject"]
    });
    if (!approval.approved) {
      return { ok: false, reason: "User rejected iterative improvement", feedback: approval.response || approval.feedback };
    }

    // Run convergence loop (Pattern 7)
    const improvement = await ctx.task(iterativeImprovementTask, {
      issues: securityCheck.criticalIssues,
      threshold: 90
    });

    return improvement;
  }

  return { ok: true, review: agentReview };
}
```

This combines:
- Node task (static analysis)
- Agent task (code review)
- Skill task (security check)
- Iterative convergence (improvement loop)
- Breakpoints (human approval)

---

## Effect Execution Hints

Tasks can include an `execution` field to express preferences about how the effect should be dispatched:

```javascript
defineTask('security-scan', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Security vulnerability scan',
  execution: {
    model: 'claude-opus-4-6',       // universal — used by plugins + internal harness
    harness: 'pi',                  // internal harness only — ignored by plugins
    permissions: ['file:read', 'net:fetch'],  // internal harness only
  },
  agent: {
    name: 'security-scanner',
    prompt: {
      role: 'Security engineer',
      task: 'Scan for vulnerabilities',
      context: { ...args },
      instructions: ['Scan dependencies', 'Check for known CVEs'],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['findings'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));
```

**Field scope:**

| Field | Scope | Description |
|-------|-------|-------------|
| `execution.model` | Universal | Preferred model for the task. Used by both plugins and internal harness. |
| `execution.harness` | Internal harness only | Preferred harness CLI. ONLY used by `harness:create-run`. Ignored by plugins. |
| `execution.permissions` | Internal harness only | Free-form permission list. ONLY used by `harness:create-run`. |

**Note:** In plugin SKILL.md files, the `harness` field is ignored. Only `model` is considered for subagent selection.

---

## Task Kind Reference

Based on these patterns, here are the task `kind` values:

| Kind | Description | Executor |
|------|-------------|----------|
| `node` | Node.js script | Local node process |
| `agent` | LLM-powered agent | Agent runtime (Claude Code, etc.) |
| `skill` | Claude Code skill | Skill system |
| `breakpoint` | Human intervention | UI/CLI |
| `sleep` | Time gate | Scheduler |
| `orchestrator_task` | Orchestrator-internal | Orchestrator |

All task kinds use the same `ctx.task()` API - the orchestrator routes based on `kind`.

---

## Best Practices

### When to Use Agent Tasks

✅ **Good use cases:**
- Code review and analysis
- Documentation generation
- Test case generation
- Refactoring suggestions
- Design feedback

❌ **Avoid for:**
- Simple data transformation (use node task)
- Deterministic computation (use node task)
- File I/O operations (use node task)

### When to Use Skill Tasks

✅ **Good use cases:**
- Reusing existing skills in workflows
- Composing multiple specialized tools
- Delegating complex multi-step work

❌ **Avoid for:**
- Simple operations (write new task)
- When you need full control (use node/agent)

### When to Use Iterative Convergence

✅ **Good use cases:**
- Quality improvement loops
- Multi-criteria optimization
- Refinement processes
- Test-driven development

❌ **Avoid for:**
- One-shot operations
- Deterministic algorithms
- Simple validation

---

---

## Pattern 8: `page.setContent` Stub for Playwright Structural Specs

### Concept

When a babysitter run authors new UI features that need Playwright coverage, the temptation is to write full end-to-end tests that boot a browser, sign in, hit the real auth provider, seed a database, and click through the actual UI. That's the right test for *behaviour*, but it's the wrong test for the *structural contract* — "the new `pantry-sticky-header` testid exists, the merge banner is inside the sticky region, the path-switcher has 3 tiles instead of 2." Those are markup invariants. Boot-the-world tests for markup invariants are slow, flaky, and tightly coupled to auth + DB seed plumbing.

A faster, more reliable pattern from production usage of babysitter on the [cookbook project](https://github.com/rogelsm/cookbook):

**Use `page.setContent(html)` to inject the expected markup atomically, then assert testids and class shapes — no navigation, no DB, no flakes.**

### The pattern, side by side

```ts
// ❌ Flaky pattern (race between navigation + DOM injection)
async function stubFlaky(page) {
  await page.goto('/login');
  await page.evaluate(() => {
    document.body.innerHTML = '';
  });
  await page.evaluate(() => {
    const root = document.createElement('div');
    root.innerHTML = `<section data-testid="my-feature">…</section>`;
    document.body.appendChild(root);
  });
}
```

```ts
// ✅ Atomic pattern (no navigation, no race)
async function stubAtomic(page) {
  const html = `<!doctype html>
    <html><head><style>/* inline css for the assertions you care about */</style></head>
    <body>
      <section data-testid="my-feature">…</section>
      <div style="height: 2000px"></div>  <!-- tall sentinel for scroll tests -->
    </body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="my-feature"]', { state: 'attached' });
}
```

### Why it works

- `page.setContent()` replaces the entire document in one operation — no race with hydration, no leftover login-page markup, no router replacing your DOM.
- `waitUntil: 'domcontentloaded'` returns as soon as the markup is parsed (faster than `networkidle`).
- The follow-up `waitForSelector(..., { state: 'attached' })` is belt-and-braces: it ensures any synchronous assertions immediately after the stub call see the markup.

### Real-world measurement

One cookbook run (`01KS3BNJ` · 2026-05-20) used the original `goto + evaluate + appendChild` pattern:
- 4/6 tests passing (2 unexpected failures + 2 flaky on retry)
- 1 minute 42 seconds total wall time across the spec

After switching to `page.setContent`:
- 6/6 tests passing cleanly, zero retries
- 5.5 seconds total wall time

That's **~20× faster** with **no flakes**. The pattern was then adopted from the start in the next four playwright spec authoring rounds and remained flake-free through all of them.

### When NOT to use this

- **You're testing behaviour that depends on real auth or DB state.** A stub can't catch RLS bugs, server-action validation errors, or auth-gate redirects. Keep your full e2e specs for those.
- **You're testing client-side hydration or React state.** Stub markup is dead HTML; React doesn't mount.
- **You're testing scroll behaviour that depends on the real CSS bundle.** Inlining a huge chunk of Tailwind defeats the purpose; a real navigation is cheaper at that point.

### When TO use this

- **Markup contract tests** — "this testid exists, this aria-label is set, this href points where it should."
- **Layout invariants** — "the responsive grid renders 3 columns at 1440px, 1 at 390px."
- **Sticky / scroll invariants** — works fine because `setContent` honours your inlined CSS.
- **Wire-up assertions** — "the merge banner is rendered inside the sticky header container, not as a sibling."

### Spec scaffold

```ts
import { test, expect } from '@playwright/test';

const STICKY_CLASSES =
  'sticky top-0 z-20 -mx-3 px-3 pb-3 pt-2 bg-white/90 backdrop-blur-sm border-b';

async function stubMyFeature(page: import('@playwright/test').Page) {
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>stub</title>
    <style>
      .sticky { position: sticky; }
      .top-0 { top: 0; }
      .z-20 { z-index: 20; }
      /* inline only what your assertions need */
    </style>
  </head>
  <body>
    <section data-testid="pantry-view">
      <div data-testid="my-feature-header" class="${STICKY_CLASSES}">
        <input data-testid="my-feature-input" />
      </div>
      <div style="height: 2000px"></div>
    </section>
  </body>
</html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="my-feature-header"]', { state: 'attached' });
}

test.describe('my feature · structural contract', () => {
  test('the feature header is present', async ({ page }) => {
    await stubMyFeature(page);
    await expect(page.getByTestId('my-feature-header')).toBeVisible();
    await expect(page.getByTestId('my-feature-input')).toBeVisible();
  });
});
```

### Trade-offs

- **Coupling to markup.** Refactoring the component changes the stub. That's a feature, not a bug — it forces the stub to track the contract. But it does mean stubs need maintenance.
- **Not a hydration test.** Anything that requires `useEffect`, `useState`, or Next.js client hydration won't fire. Real e2e specs cover that surface separately.
- **No router context.** `useRouter()`, `useSearchParams()`, etc. won't work. If your component reads from them, pass equivalent data via props in the stub or set the URL beforehand with `page.goto('about:blank')` followed by `page.setContent`.

### Reference

The pattern crystallized during a multi-run development sprint on the cookbook project (May 2026), where it converted a flaky 1m42s spec into a 5.5s clean one. Four subsequent playwright spec authoring rounds adopted the pattern from the start; all stayed flake-free.

---

## Summary

These patterns extend babysitter's capabilities:

1. **Agent tasks** - LLM-powered work with structured I/O
2. **Skill tasks** - Composable skill invocation
3. **Iterative convergence** - Score-based improvement loops with safety mechanisms
4. **`page.setContent` stub** - Atomic Playwright markup injection for structural-contract testing (Pattern 8)

All patterns use the same SDK API (`ctx.task()`) or standard Playwright APIs, maintaining consistency while enabling sophisticated workflows.
