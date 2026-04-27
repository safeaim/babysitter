# Responder Guide

This guide is for domain responders who receive and answer questions through the Breakpoints Mux system.

## Overview

When an AI agent encounters a question that requires specialized knowledge, it routes that question to you through the BMUX server. You receive the question, review it, and submit your answer. The agent then relays your answer back to the user.

## Setting Up Your Responder Profile

Responder profiles are JSON files stored in the `.a5c/responder/` directory at the root of the project. Each responder gets one file named `<your-id>.json`.

### Creating your profile

Create a file at `.a5c/responder/your-id.json`:

```json
{
  "id": "your-id",
  "name": "Your Full Name",
  "title": "Your Job Title",
  "domains": ["backend", "security"],
  "tags": ["nodejs", "postgresql", "api-design", "oauth", "jwt", "auth"],
  "availability": true,
  "responseTimeSla": 1800000
}
```

### Profile fields explained

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for your profile. Use a short, lowercase slug (e.g., `backend-responder`, `jane-security`). Must match the filename without `.json`. |
| `name` | string | Yes | Your display name, shown to agents and in answers. |
| `title` | string | Yes | Your professional title or role (e.g., "Senior Backend Engineer"). |
| `domains` | array | Yes | One or more high-level domains you cover (for example `backend`, `security`, `devops`). |
| `tags` | array | Yes | Keywords, tools, or specialties the matcher can use for finer-grained routing. |
| `availability` | boolean | Yes | Set to `true` when you are available to answer questions. Set to `false` when on leave or unavailable. |
| `responseTimeSla` | number | Yes | Your expected maximum response time in milliseconds. `1800000` = 30 minutes. The system uses this for timeout calculations. |
| `publicKeyFingerprint` | string | No | Optional fingerprint used for provenance-aware responder flows. |

### Domains and tags

`domains` should contain the broad areas you cover, while `tags` should list technologies, keywords, or specialties that help the matcher route questions more precisely.

**Tip:** Keep `domains` broad and stable, and put the more specific terms in `tags`. For example, `domains: ["backend"]` and `tags: ["nodejs", "postgresql", "api-design"]`.

### Validating your profile

The profile must conform to the JSON schema at `.a5c/responder/schema.json`. You can validate it with the CLI:

```bash
bmux responders show your-id
```

If the profile is valid, this prints your profile details. If it has errors, you will see a validation error message.

## Receiving Questions

### Using the responder polling loop

The simplest way to receive questions is to run the responder loop:

```bash
bmux responder-loop -e your-id
```

This starts a continuous polling loop (default interval: 30 seconds) that watches the BMUX server for new questions routed to you. When a question arrives, it displays the question ID, text, routing strategy, and creation time.

Options:

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --expert <id>` | Your responder ID (required) | -- |
| `-i, --interval <seconds>` | Polling interval | `30` |
| `--once` | Check once and exit | `false` |

For agent integration or one-shot checks:

```bash
bmux responder-loop -e your-id --once
```

### Checking for pending questions manually

```bash
bmux breakpoints pending -e your-id
```

This lists all questions currently routed to you that have not been answered yet.

## Answering Questions

### From the CLI

Once you see a pending question, answer it with:

```bash
bmux breakpoints answer <questionId> \
  -e your-id \
  -a "Your detailed answer here..." \
  --confidence 85
```

| Flag | Description | Default |
|------|-------------|---------|
| `-e, --expert <id>` | Your responder ID (required) | -- |
| `-a, --answer <text>` | Your answer text (required) | -- |
| `--confidence <0-100>` | How confident you are in this answer | `80` |

### Tips for answering effectively

1. **Be specific and actionable.** The agent will relay your answer to a user who needs to act on it. Vague answers like "it depends" are not helpful without explaining what it depends on and what to do in each case.

2. **Include references.** If your answer references documentation, RFCs, or internal wiki pages, include the URLs. The answer schema supports a `references` array.

3. **State your confidence level honestly.** A confidence of 90+ means you are very sure. 60-80 means you believe this is correct but the asker should verify. Below 60 means this is your best guess but they should seek additional confirmation.

4. **Suggest follow-up questions.** If the question reveals gaps that should be addressed, mention them. The `followUpQuestions` field in the answer schema is designed for this.

5. **Provide context for your reasoning.** Do not just give the answer -- explain why. This helps the agent and user understand the trade-offs.

### Answer via the API directly

If you prefer to integrate with the API directly (for example, from a script or bot):

```bash
curl -X POST http://localhost:3847/api/v1/questions/<questionId>/answers \
  -H "Content-Type: application/json" \
  -d '{
    "expertId": "your-id",
    "expertName": "Your Name",
    "text": "Your answer here...",
    "confidence": 85,
    "references": ["https://example.com/docs"],
    "followUpQuestions": ["Have you considered X?"]
  }'
```

## Using from Within Claude Code

If you are a responder who also uses Claude Code, you can answer questions through the agent itself. The workflow:

1. The agent detects you have pending questions (via `list_responders` or `check_breakpoint_status`).
2. You review the question in your Claude Code session.
3. You dictate or type your answer, and the agent submits it via the API on your behalf.

Alternatively, you can run `bmux responder-loop -e your-id --once` in a terminal alongside Claude Code and answer through the CLI.

## Question Lifecycle

Understanding the question lifecycle helps you know when to act:

| Status | Meaning |
|--------|---------|
| `pending` | Question submitted but not yet routed to specific responders. |
| `routed` | Question has been routed to you (and possibly others). **This is when you should act.** |
| `claimed` | A responder has claimed the question (indicates they are working on it). |
| `answered` | One or more answers have been submitted. |
| `completed` | The asking agent has accepted an answer. No further action needed. |
| `expired` | The question timed out without an answer. |
| `cancelled` | The asking agent cancelled the question. |

## Managing Availability

When you are unavailable (on leave, in meetings, etc.), update your profile:

```json
{
  "availability": false
}
```

The matcher will skip unavailable responders when routing questions. Remember to set it back to `true` when you return.
