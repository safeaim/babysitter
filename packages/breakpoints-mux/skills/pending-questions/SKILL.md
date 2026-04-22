# Pending Questions -- Expert Answering Skill

## When to Use

Use this skill when the user is acting as a **domain expert** and wants to:
- Check for pending questions routed to them
- Answer questions with AI-assisted context enrichment and draft generation
- Monitor for incoming questions continuously

This is the expert-answering counterpart to the `ask-expert` skill (which covers submitting questions).

## Step 1: Resolve Expert Identity

Determine who the expert is. Try these in order -- stop at the first match:

1. **Explicit argument**: If the user provided an expert ID (e.g., `/pending-questions tmuskal`), use it.
2. **Environment variables**: Check `BMUX_EXPERT_ID`. Use `BPX_EXPERT_NAME` for the display name.
3. **GitHub auto-detection**: Check if the GitHub Issues backend is active:
   - Read `.a5c/routing.json` -- if `defaultBackend` is `"github-issues"`, or if `BMUX_BACKEND` env var is `"github-issues"`, the expert ID is the user's GitHub login.
   - Detect it by running: `gh api user --jq .login`
   - The GitHub username is both the expert ID and display name for this backend.
4. **Prompt the user**: As a last resort, ask for their expert ID.

Cache the resolved identity for the rest of the session.

## Step 2: Poll for Pending Questions

Use the `poll_breakpoints` MCP tool:

```
Tool: poll_breakpoints
Args: {
  "expertId": "<resolved-expert-id>",
  "waitSeconds": 0
}
```

For **continuous mode** (user said "keep watching", "monitor", or "loop"), use `waitSeconds: 30` and repeat after each cycle.

### Presenting Results

If questions are found, present a concise summary:

```
Found 3 pending questions:

1. [01HXYZ...] "Should we use connection pooling for the Redis client?"
   Tags: backend, redis | Urgency: high | Asked: 2 min ago

2. [01HABC...] "Is this SQL migration safe for zero-downtime deploy?"
   Tags: database, devops | Urgency: medium | Asked: 15 min ago

3. [01HDEF...] "How should we handle retry logic in the payment service?"
   Tags: backend, payments | Asked: 1 hour ago
```

If no questions are pending, say so. In continuous mode, inform the user you're still watching and will notify when questions arrive.

Ask the user which question they'd like to answer (or auto-select if there's only one).

## Step 3: Claim the Question

Before answering, claim it so other experts know it's being worked on:

```
Tool: claim_breakpoint
Args: {
  "questionId": "<selected-question-id>",
  "expertId": "<resolved-expert-id>"
}
```

If claiming fails (already claimed by another expert), inform the user and offer to pick a different question.

## Step 4: Enrich Context

This is the key value-add. Before proposing a draft, do reconnaissance:

### Read Referenced Files
If the question's context includes file references, read them from the workspace. Summarize the relevant sections -- don't dump entire files.

### Analyze Code Snippets
If the question includes code snippets, analyze them in the context of the codebase. Look for:
- What the code does and how it fits into the broader system
- Potential issues or patterns relevant to the question
- Related code in the project that provides additional context

### Check Git History
If the question relates to recent changes or decisions:
- `git log --oneline -10` for recent commits in relevant files
- `git diff` if there are uncommitted changes that might be relevant

### Resolve Links
If the question includes links (PR URLs, issue URLs), fetch metadata:
- `gh pr view <number> --json title,body,state` for PR links
- `gh issue view <number> --json title,body,state` for issue links

### Present Enriched Context
Summarize your findings to the expert before the draft. Keep it concise -- the expert needs to understand the landscape, not read a novel.

## Step 5: Propose Draft Answer

Based on the question and enriched context, generate a draft answer that:

1. **Leads with the recommendation** -- direct answer to the question
2. **Provides reasoning** -- why this is the right approach, referencing specific code/context
3. **Notes caveats** -- edge cases, risks, assumptions
4. **Suggests confidence level** -- your assessment of how confident the answer should be (0-100)
5. **Lists references** -- files, docs, PRs, or external resources that support the answer

Present the draft to the expert and ask for their review:

> "Here's my proposed draft answer. Please review and let me know if you'd like to edit it, adjust the confidence level, or add/remove anything before I submit."

Offer clear options:
- **Submit as-is** -- send the draft with the suggested confidence
- **Edit** -- the expert provides changes, you incorporate them
- **Adjust confidence** -- change the confidence score
- **Reject and write from scratch** -- expert dictates their own answer
- **Skip this question** -- don't answer, unclaim if possible

## Step 6: Submit the Answer

Once the expert approves:

```
Tool: respond_to_breakpoint
Args: {
  "questionId": "<question-id>",
  "expertId": "<resolved-expert-id>",
  "expertName": "<resolved-expert-name>",
  "text": "<final-answer-text>",
  "confidence": <agreed-confidence-0-100>,
  "references": ["<relevant-file-paths-or-urls>"]
}
```

Confirm submission success to the expert.

## Step 7: Next Action

After submitting, offer:
- **Answer next question** -- return to Step 2 (re-poll to catch new arrivals)
- **Done** -- exit the skill

In continuous mode, automatically return to polling.

## Continuous Mode

When the user requests continuous monitoring:

1. Poll with `waitSeconds: 30` in a loop
2. When questions arrive, present them and enter the interactive flow (Steps 2-6)
3. After answering, resume polling
4. Exit when the user says "stop", "done", or "exit"

Between polls, let the user know you're watching:
> "Watching for questions for [expert-id]... I'll notify you when something comes in."

## Skipping and Cancelling

If the expert wants to skip a question:
- If already claimed, inform them the question will remain claimed but unanswered (another expert may need to pick it up).

If the expert wants to cancel a question entirely (e.g., it's invalid or a duplicate):

```
Tool: cancel_breakpoint
Args: { "questionId": "<question-id>" }
```

## Error Handling

- **No questions found**: "No pending questions for [expert-id]. Check back later." (In continuous mode, keep polling.)
- **Backend unreachable**: If poll fails, inform the user with the error. Suggest checking server status or GitHub token.
- **GitHub token missing**: If GitHub auto-detection fails, suggest `gh auth login` or setting `GITHUB_TOKEN`.
- **Claim conflict**: "This question was already claimed by another expert. Would you like to pick a different one?"

## Example Session

```
User: any questions for me?

Agent: [Detects GitHub backend, runs gh api user --jq .login -> "tmuskal"]
       Found 1 pending question for tmuskal:

       1. [gh-42] "Should we add rate limiting to the /api/v1/questions endpoint?"
          Tags: backend, api | Asked: 5 min ago

       Want me to help you answer this one?

User: yes

Agent: [Claims question, reads referenced files, checks server routes]
       Context: The /api/v1/questions endpoint currently has no rate limiting.
       The Express server at packages/server/src/routes/questions.ts handles
       POST (create) and GET (list) operations. Current traffic: ~50 req/min
       based on the question context.

       Draft answer (confidence: 75):
       "Yes, rate limiting is recommended for the questions endpoint..."
       [full draft]

       Review this draft? You can submit as-is, edit, or write your own.

User: bump confidence to 85, otherwise good

Agent: [Submits with confidence 85]
       Answer submitted. No more pending questions.
```
