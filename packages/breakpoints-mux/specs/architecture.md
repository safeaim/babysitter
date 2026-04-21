# breakpoints-mux Architecture Specification

**Package:** `@a5c-ai/breakpoints-mux`
**Version:** 0.1.0
**Status:** Draft
**Date:** 2026-04-21

---

## Table of Contents

1. [Overview](#1-overview)
2. [Package Structure](#2-package-structure)
3. [Domain Types and Zod Schemas](#3-domain-types-and-zod-schemas)
4. [Backend Interface](#4-backend-interface)
5. [Git-Native Backend](#5-git-native-backend)
6. [Proven Breakpoints (Cryptographic Signing)](#6-proven-breakpoints)
7. [MCP Server Tools](#7-mcp-server-tools)
8. [Harness Integration](#8-harness-integration)
9. [Naming Conventions](#9-naming-conventions)
10. [Extension Points](#10-extension-points)
11. [AEQ Repo Adaptation](#11-aeq-repo-adaptation)
12. [Implementation Phases](#12-implementation-phases)

---

## 1. Overview

`breakpoints-mux` is an open-source, serverless, extensible breakpoint multiplexing system with pluggable backends. It provides the foundational infrastructure for routing breakpoint questions from AI agents (or automated processes) to human responders, collecting answers, and optionally verifying answer authenticity through cryptographic signatures.

### Design Principles

- **Serverless by default.** The default git-native backend requires zero infrastructure -- no HTTP server, no database, no cloud service. Breakpoints are JSON files in a `.breakpoints/` directory, shared via git or a filesystem.
- **Pluggable backends.** Any transport can be used by implementing the `BreakpointBackend` interface. The AEQ server backend and GitHub Issues backend are kept as external extensions in the AEQ repo.
- **Cryptographic trust without a server.** The "proven breakpoints" subsystem uses Ed25519 key pairs stored in git to sign and verify answers, establishing trust chains without requiring a central authority.
- **Compatible with babysitter.** Integrates with the babysitter-harness interaction system, auto-approval rules, posture enforcement, and `ProcessContext.breakpoint()`.
- **Compatible with AEQ.** The interface design descends from AEQ's `QuestionBackend`, making migration straightforward. AEQ backends become extension backends for breakpoints-mux.

### Terminology Mapping

| AEQ Term | breakpoints-mux Term | Rationale |
|----------|---------------------|-----------|
| Question | Breakpoint | Aligns with babysitter's existing `breakpoint()` concept |
| Answer | BreakpointAnswer | Response to a breakpoint |
| Expert | Responder | More general; not all responders are "experts" |
| QuestionBackend | BreakpointBackend | Follows the Breakpoint naming |
| QuestionContext | BreakpointContext | Contextual information for the breakpoint |
| QuestionRouting | BreakpointRouting | Routing configuration |
| AnswerResult | BreakpointWaitResult | Result of waiting for an answer |

---

## 2. Package Structure

```
packages/breakpoints-mux/
  package.json
  tsconfig.json
  specs/
    architecture.md           # This file
  src/
    index.ts                  # Public API barrel export
    types.ts                  # Zod schemas, domain types
    backend.ts                # BreakpointBackend interface
    backends/
      index.ts                # Backend factory, resolution, routing
      git-native.ts           # Default git-native backend
    proven/
      index.ts                # Barrel export for proven subsystem
      keys.ts                 # Ed25519 key management (generate, load, store)
      sign.ts                 # Sign breakpoint answers
      verify.ts               # Verify breakpoint answer signatures
      types.ts                # Proven-specific types
    mcp/
      index.ts                # Barrel export for MCP server
      server.ts               # MCP server with breakpoint tools
      tools/
        ask-breakpoint.ts     # Submit breakpoint and wait for answer
        check-status.ts       # Check status of pending breakpoint
        list-breakpoints.ts   # List pending breakpoints for responder
        answer-breakpoint.ts  # Submit answer to a breakpoint
        verify-answer.ts      # Verify cryptographic signature
    harness/
      index.ts                # Barrel export for harness integration
      interaction-provider.ts # BreakpointMuxInteractionProvider
      routing-rules.ts        # Domain/tag-based backend selection
    cli.ts                    # CLI for manual breakpoint operations
    __tests__/
      types.test.ts
      git-native-backend.test.ts
      proven.test.ts
      mcp-server.test.ts
      harness-integration.test.ts
      routing-rules.test.ts
```

### Dependencies

```json
{
  "name": "@a5c-ai/breakpoints-mux",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js",
    "./backends": "./dist/backends/index.js",
    "./proven": "./dist/proven/index.js",
    "./mcp": "./dist/mcp/index.js",
    "./harness": "./dist/harness/index.js"
  },
  "dependencies": {
    "zod": "^3.23.0",
    "@modelcontextprotocol/sdk": "^1.12.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "@a5c-ai/babysitter-sdk": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "@a5c-ai/babysitter-sdk": {
      "optional": true
    }
  }
}
```

The `@a5c-ai/babysitter-sdk` peer dependency is optional: breakpoints-mux can be used standalone without the babysitter ecosystem.

---

## 3. Domain Types and Zod Schemas

**File:** `src/types.ts`

### 3.1 Status and Strategy Enums

```typescript
import { z } from "zod";

// ── Enums ────────────────────────────────────────────────────────────────

export const BreakpointStatusSchema = z.enum([
  "pending",     // Submitted, awaiting a responder
  "routed",      // Sent to specific responder(s)
  "claimed",     // A responder has claimed it
  "answered",    // At least one answer received
  "completed",   // Final answer accepted, lifecycle done
  "expired",     // Timed out without answer
  "cancelled",   // Cancelled by submitter
]);
export type BreakpointStatus = z.infer<typeof BreakpointStatusSchema>;

export const BreakpointStrategySchema = z.enum([
  "single",               // Route to exactly one responder
  "first-response-wins",  // Route to multiple, accept first answer
  "collect-all",          // Wait for all responders
  "quorum",               // Wait for majority
]);
export type BreakpointStrategy = z.infer<typeof BreakpointStrategySchema>;
```

### 3.2 Urgency

```typescript
export const UrgencySchema = z.enum(["low", "medium", "high"]);
export type Urgency = z.infer<typeof UrgencySchema>;
```

### 3.3 InteractionKind (from babysitter SDK)

```typescript
export const InteractionKindSchema = z.enum([
  "clarification",
  "approval",
  "intervention",
  "notification",
  "handoff",
]);
export type InteractionKind = z.infer<typeof InteractionKindSchema>;
```

### 3.4 Code Snippet

```typescript
export const CodeSnippetSchema = z.union([
  z.string(),
  z.object({
    filename: z.string(),
    code: z.string(),
    language: z.string().optional(),
  }),
]);
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>;
```

### 3.5 BreakpointContext

```typescript
export const BreakpointContextLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(["reference", "repo", "artifact", "external"]).optional(),
}).catchall(z.unknown());
export type BreakpointContextLink = z.infer<typeof BreakpointContextLinkSchema>;

export const BreakpointContextSectionSchema = z.object({
  title: z.string().min(1),
  markdown: z.string().min(1),
}).catchall(z.unknown());
export type BreakpointContextSection = z.infer<typeof BreakpointContextSectionSchema>;

export const BreakpointContextArtifactSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(["image", "document", "trace", "log", "build", "external"]).optional(),
  mimeType: z.string().min(1).optional(),
}).catchall(z.unknown());
export type BreakpointContextArtifact = z.infer<typeof BreakpointContextArtifactSchema>;

export const BreakpointContextSchema = z.object({
  description: z.string(),
  codeSnippets: z.array(CodeSnippetSchema),
  fileReferences: z.array(z.string()),
  tags: z.array(z.string()),
  title: z.string().optional(),
  summary: z.string().optional(),
  markdown: z.string().optional(),
  domain: z.string().optional(),
  urgency: UrgencySchema.optional(),
  interactionKind: InteractionKindSchema.optional(),
  links: z.array(BreakpointContextLinkSchema).optional(),
  sections: z.array(BreakpointContextSectionSchema).optional(),
  artifacts: z.array(BreakpointContextArtifactSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).catchall(z.unknown());
export type BreakpointContext = z.infer<typeof BreakpointContextSchema>;
```

### 3.6 BreakpointRouting

```typescript
export const BreakpointRoutingSchema = z.object({
  strategy: BreakpointStrategySchema,
  targetResponders: z.array(z.string()),
  timeoutMs: z.number().positive(),
  presentToUser: z.boolean(),
  /** Canonical breakpoint identity for cross-run matching. */
  breakpointId: z.string().optional(),
  /** Auto-approve after N consecutive approvals (-1 = disabled). */
  autoApproveAfterN: z.number().int().optional(),
});
export type BreakpointRouting = z.infer<typeof BreakpointRoutingSchema>;
```

### 3.7 ResponderProfile

```typescript
export const ResponderProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  domains: z.array(z.string()),
  tags: z.array(z.string()),
  availability: z.boolean(),
  responseTimeSla: z.number().positive(),
  /** Public key fingerprint for proven breakpoints. */
  publicKeyFingerprint: z.string().optional(),
});
export type ResponderProfile = z.infer<typeof ResponderProfileSchema>;
```

### 3.8 BreakpointAnswer

```typescript
export const BreakpointAnswerRatingSchema = z.object({
  helpful: z.boolean(),
  comment: z.string().optional(),
  ratedAt: z.string().datetime(),
});
export type BreakpointAnswerRating = z.infer<typeof BreakpointAnswerRatingSchema>;

export const DecisionMemorySchema = z.object({
  applicabilityContext: z.string().min(1),
  reasoning: z.string().min(1),
  enrichedContext: z.string().optional(),
  savedAt: z.string().datetime(),
});
export type DecisionMemory = z.infer<typeof DecisionMemorySchema>;

export const BreakpointAnswerSchema = z.object({
  id: z.string().min(1),
  breakpointId: z.string().min(1),
  responderId: z.string().min(1),
  responderName: z.string().min(1),
  text: z.string(),
  approved: z.boolean().optional(),
  confidence: z.number().min(0).max(100),
  references: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  answeredAt: z.string().datetime(),
  rating: BreakpointAnswerRatingSchema.optional(),
  decisionMemory: DecisionMemorySchema.optional(),
});
export type BreakpointAnswer = z.infer<typeof BreakpointAnswerSchema>;
```

### 3.9 Breakpoint

```typescript
export const BreakpointSubmitterSchema = z.object({
  sub: z.string().min(1),
  login: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
});
export type BreakpointSubmitter = z.infer<typeof BreakpointSubmitterSchema>;

export const BreakpointSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  context: BreakpointContextSchema,
  status: BreakpointStatusSchema,
  routing: BreakpointRoutingSchema,
  answers: z.array(BreakpointAnswerSchema),
  selectedAnswer: z.string().optional(),
  projectId: z.string().optional(),
  repoId: z.string().optional(),
  createdBy: BreakpointSubmitterSchema.optional(),
  claimedByResponderId: z.string().min(1).optional(),
  claimedByResponderName: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type Breakpoint = z.infer<typeof BreakpointSchema>;
```

### 3.10 BreakpointWaitResult

```typescript
export const BreakpointWaitResultSchema = z.object({
  answered: z.boolean(),
  breakpoint: BreakpointSchema,
  answer: BreakpointAnswerSchema.optional(),
  allAnswers: z.array(BreakpointAnswerSchema),
  resolution: z.string().optional(),
  elapsedMs: z.number().nonnegative(),
});
export type BreakpointWaitResult = z.infer<typeof BreakpointWaitResultSchema>;
```

### 3.11 Proven Breakpoint Types

```typescript
export const ProvenBreakpointAnswerSchema = BreakpointAnswerSchema.extend({
  signature: z.string().min(1),
  publicKeyFingerprint: z.string().min(1),
  signedAt: z.string().datetime(),
  signedFields: z.array(z.string()),
});
export type ProvenBreakpointAnswer = z.infer<typeof ProvenBreakpointAnswerSchema>;

export const ProvenVerificationResultSchema = z.object({
  valid: z.boolean(),
  publicKeyFingerprint: z.string().optional(),
  responderName: z.string().optional(),
  reason: z.string().optional(),
  verifiedAt: z.string().datetime(),
});
export type ProvenVerificationResult = z.infer<typeof ProvenVerificationResultSchema>;
```

### 3.12 Routing Configuration (for multi-backend mux)

```typescript
export const BackendConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("git-native"),
    breakpointsDir: z.string().optional(),
    pollIntervalMs: z.number().positive().optional(),
    timeoutMs: z.number().positive().optional(),
  }),
  // Extension backends register via the discriminated union at runtime.
  // The base package only ships git-native. See Section 10 for extension config schemas.
]);
export type BackendConfig = z.infer<typeof BackendConfigSchema>;

export const RoutingRuleSchema = z.object({
  domains: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  backend: z.string().min(1),
  backendConfig: z.record(z.string(), z.unknown()),
});
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

export const RoutingConfigSchema = z.object({
  defaultBackend: z.string().min(1),
  routes: z.array(RoutingRuleSchema),
});
export type RoutingConfig = z.infer<typeof RoutingConfigSchema>;
```

### 3.13 Constants

```typescript
export const DEFAULT_POLL_INTERVAL_MS = 3_000;
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000; // 30 minutes
export const BREAKPOINTS_DIR = ".breakpoints";
export const BREAKPOINTS_KEYS_DIR = ".breakpoints/.keys";
export const BREAKPOINTS_TRUSTED_KEYS_DIR = ".breakpoints/.keys/trusted";
export const BREAKPOINTS_PRIVATE_KEYS_DIR = ".breakpoints/.keys/private";
```

### 3.14 Utility: ID Generation

```typescript
import { randomBytes } from "node:crypto";

export function generateBreakpointId(): string {
  return randomBytes(12).toString("hex");
}
```

---

## 4. Backend Interface

**File:** `src/backend.ts`

The `BreakpointBackend` interface is the pluggable contract that all backends must implement. It mirrors the lifecycle of a breakpoint from submission to answer retrieval or cancellation.

```typescript
import type {
  Breakpoint,
  BreakpointAnswer,
  BreakpointContext,
  BreakpointRouting,
  BreakpointWaitResult,
  ResponderProfile,
} from "./types.js";

/**
 * Parameters for submitting a new breakpoint to a backend.
 */
export interface SubmitBreakpointParams {
  /** The breakpoint question text. */
  text: string;
  /** Rich context for the breakpoint. */
  context: BreakpointContext;
  /** Routing configuration. */
  routing: BreakpointRouting;
  /** Optional project scope. */
  projectId?: string;
  /** Optional repository scope. */
  repoId?: string;
}

/**
 * Options for waiting for an answer from a backend.
 */
export interface WaitForAnswerOptions {
  /** Maximum time to wait in milliseconds. */
  timeoutMs?: number;
  /** Polling interval in milliseconds (for polling-based backends). */
  pollIntervalMs?: number;
  /** Whether to prefer event-based updates over polling. */
  preferStreaming?: boolean;
  /** AbortSignal for external cancellation. */
  signal?: AbortSignal;
}

/**
 * Parameters for submitting an answer to a breakpoint.
 */
export interface SubmitAnswerParams {
  /** ID of the responder submitting the answer. */
  responderId: string;
  /** Display name of the responder. */
  responderName: string;
  /** The answer text. */
  text: string;
  /** Whether the breakpoint action is approved (for approval-type breakpoints). */
  approved?: boolean;
  /** Confidence score 0-100. */
  confidence?: number;
  /** Reference links or file paths. */
  references?: string[];
  /** Follow-up questions to consider. */
  followUpQuestions?: string[];
  /** Decision memory for future reference. */
  decisionMemory?: { applicabilityContext: string; reasoning: string };
}

/**
 * Options for listing responders.
 */
export interface ListRespondersParams {
  projectId?: string;
  repoId?: string;
}

/**
 * Backend-agnostic interface for breakpoint lifecycle operations.
 *
 * Implementations may target different transports (git filesystem,
 * HTTP server, GitHub Issues, etc.) while presenting a uniform API.
 */
export interface BreakpointBackend {
  /** Human-readable name for this backend (e.g., "git-native", "aeq-server"). */
  readonly name: string;

  /**
   * Submit a new breakpoint.
   * Returns the created Breakpoint with a backend-assigned ID.
   */
  submitBreakpoint(params: SubmitBreakpointParams): Promise<Breakpoint>;

  /**
   * Retrieve a breakpoint by its ID.
   */
  getBreakpoint(id: string): Promise<Breakpoint>;

  /**
   * Wait for an answer to a breakpoint.
   * Resolves when an answer arrives, the breakpoint reaches a terminal state,
   * the timeout elapses, or the operation is aborted.
   */
  waitForAnswer(id: string, options?: WaitForAnswerOptions): Promise<BreakpointWaitResult>;

  /**
   * List pending breakpoints, optionally filtered by responder.
   */
  listPendingBreakpoints(responderId?: string): Promise<Breakpoint[]>;

  /**
   * Submit an answer for a breakpoint.
   */
  answerBreakpoint(id: string, answer: SubmitAnswerParams): Promise<BreakpointAnswer>;

  /**
   * Cancel a pending breakpoint.
   */
  cancelBreakpoint(id: string): Promise<void>;

  /**
   * List available responder profiles.
   * Optional -- backends that don't manage responder discovery may return [].
   */
  listResponders?(params?: ListRespondersParams): Promise<ResponderProfile[]>;

  /**
   * Claim a breakpoint, indicating intent to answer.
   * Optional -- not all backends support explicit claiming.
   */
  claimBreakpoint?(id: string, responderId: string): Promise<Breakpoint>;
}
```

### 4.1 Backend Lifecycle Diagram

```
  Submitter                    Backend                     Responder
  ────────                    ───────                     ─────────
      │                          │                            │
      │── submitBreakpoint() ──> │                            │
      │<── Breakpoint (pending)  │                            │
      │                          │                            │
      │── waitForAnswer() ────>  │                            │
      │   (blocks/polls)         │                            │
      │                          │ <── listPendingBreakpoints()
      │                          │ ──> Breakpoint[]           │
      │                          │                            │
      │                          │ <── claimBreakpoint()      │
      │                          │ ──> Breakpoint (claimed)   │
      │                          │                            │
      │                          │ <── answerBreakpoint()     │
      │                          │ ──> BreakpointAnswer       │
      │                          │                            │
      │<── BreakpointWaitResult  │                            │
      │    (answered: true)      │                            │
```

---

## 5. Git-Native Backend

**File:** `src/backends/git-native.ts`

The git-native backend is the **default, zero-infrastructure backend**. It uses a `.breakpoints/` directory in the repository (or any filesystem path) to store breakpoints as JSON files and detect answers by watching for new files.

### 5.1 File Layout

```
.breakpoints/
  .gitignore                    # Ignores .keys/private/
  <id>.json                     # Breakpoint definition
  <id>.answer.json              # Answer to breakpoint (created by responder)
  <id>.answer.proven.json       # Proven (signed) answer (optional)
  .keys/
    trusted/                    # Git-tracked public keys
      <fingerprint>.pub.json    # Public key + responder metadata
    private/                    # Gitignored private keys
      <fingerprint>.key.json    # Private key (encrypted at rest)
```

### 5.2 Breakpoint File Format

**`<id>.json`** -- Written by `submitBreakpoint()`:

```json
{
  "id": "a1b2c3d4e5f6a1b2c3d4e5f6",
  "text": "Should we use connection pooling for the Redis client?",
  "context": {
    "description": "We're seeing high latency on Redis operations under load.",
    "codeSnippets": [],
    "fileReferences": ["src/cache/redis-client.ts"],
    "tags": ["performance", "redis", "infrastructure"],
    "domain": "backend",
    "urgency": "medium"
  },
  "status": "pending",
  "routing": {
    "strategy": "first-response-wins",
    "targetResponders": [],
    "timeoutMs": 1800000,
    "presentToUser": false
  },
  "answers": [],
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T10:00:00.000Z",
  "expiresAt": "2026-04-21T10:30:00.000Z"
}
```

**`<id>.answer.json`** -- Written by `answerBreakpoint()`:

```json
{
  "id": "f6e5d4c3b2a1f6e5d4c3b2a1",
  "breakpointId": "a1b2c3d4e5f6a1b2c3d4e5f6",
  "responderId": "tal",
  "responderName": "Tal M",
  "text": "Yes, use connection pooling. ioredis supports it natively via `new Redis.Cluster()`...",
  "approved": true,
  "confidence": 90,
  "references": ["https://github.com/redis/ioredis#cluster"],
  "followUpQuestions": [],
  "answeredAt": "2026-04-21T10:05:00.000Z"
}
```

### 5.3 Implementation

```typescript
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type {
  BreakpointBackend,
  SubmitBreakpointParams,
  WaitForAnswerOptions,
  SubmitAnswerParams,
} from "../backend.js";
import type {
  Breakpoint,
  BreakpointAnswer,
  BreakpointWaitResult,
  ResponderProfile,
} from "../types.js";
import {
  generateBreakpointId,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  BREAKPOINTS_DIR,
  BreakpointSchema,
  BreakpointAnswerSchema,
} from "../types.js";

export interface GitNativeBackendOptions {
  /** Path to the .breakpoints directory. Defaults to `.breakpoints` in cwd. */
  breakpointsDir?: string;
  /** Default poll interval in ms. Defaults to 3000. */
  pollIntervalMs?: number;
  /** Default timeout in ms. Defaults to 30 minutes. */
  timeoutMs?: number;
}

export class GitNativeBackend implements BreakpointBackend {
  readonly name = "git-native";

  private breakpointsDir: string;
  private defaultPollIntervalMs: number;
  private defaultTimeoutMs: number;

  constructor(options?: GitNativeBackendOptions) {
    this.breakpointsDir = options?.breakpointsDir
      ?? path.resolve(process.cwd(), BREAKPOINTS_DIR);
    this.defaultPollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.defaultTimeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private breakpointPath(id: string): string {
    return path.join(this.breakpointsDir, `${id}.json`);
  }

  private answerPath(id: string): string {
    return path.join(this.breakpointsDir, `${id}.answer.json`);
  }

  async submitBreakpoint(params: SubmitBreakpointParams): Promise<Breakpoint> {
    await fs.mkdir(this.breakpointsDir, { recursive: true });

    const id = generateBreakpointId();
    const now = new Date().toISOString();
    const timeoutMs = params.routing.timeoutMs || this.defaultTimeoutMs;

    const breakpoint: Breakpoint = {
      id,
      text: params.text,
      context: params.context,
      status: "pending",
      routing: params.routing,
      answers: [],
      projectId: params.projectId,
      repoId: params.repoId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + timeoutMs).toISOString(),
    };

    // Validate before writing
    BreakpointSchema.parse(breakpoint);

    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );

    return breakpoint;
  }

  async getBreakpoint(id: string): Promise<Breakpoint> {
    const raw = await fs.readFile(this.breakpointPath(id), "utf-8");
    const breakpoint = BreakpointSchema.parse(JSON.parse(raw));

    // Check for answer file
    try {
      const answerRaw = await fs.readFile(this.answerPath(id), "utf-8");
      const answer = BreakpointAnswerSchema.parse(JSON.parse(answerRaw));
      if (!breakpoint.answers.some(a => a.id === answer.id)) {
        breakpoint.answers.push(answer);
      }
      if (breakpoint.status === "pending" || breakpoint.status === "claimed") {
        breakpoint.status = "answered";
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }

    return breakpoint;
  }

  async waitForAnswer(
    id: string,
    options?: WaitForAnswerOptions,
  ): Promise<BreakpointWaitResult> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const pollIntervalMs = options?.pollIntervalMs ?? this.defaultPollIntervalMs;
    const signal = options?.signal;
    const startTime = Date.now();

    while (true) {
      if (signal?.aborted) {
        const breakpoint = await this.getBreakpoint(id);
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "aborted",
          elapsedMs: Date.now() - startTime,
        };
      }

      // Check for answer file
      try {
        await fs.access(this.answerPath(id));
        const breakpoint = await this.getBreakpoint(id);
        const answer = breakpoint.answers[0];
        return {
          answered: true,
          breakpoint: { ...breakpoint, status: "answered" },
          answer,
          allAnswers: breakpoint.answers,
          elapsedMs: Date.now() - startTime,
        };
      } catch {
        // No answer yet
      }

      // Check expiration
      const breakpoint = await this.getBreakpoint(id);
      if (breakpoint.status === "cancelled") {
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "cancelled",
          elapsedMs: Date.now() - startTime,
        };
      }

      if (Date.now() - startTime >= timeoutMs) {
        return {
          answered: false,
          breakpoint,
          allAnswers: [],
          resolution: "timeout",
          elapsedMs: Date.now() - startTime,
        };
      }

      // Wait before next poll
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, pollIntervalMs);
        if (signal) {
          const onAbort = () => { clearTimeout(timer); resolve(); };
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
  }

  async listPendingBreakpoints(responderId?: string): Promise<Breakpoint[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.breakpointsDir);
    } catch {
      return [];
    }

    const pending: Breakpoint[] = [];
    for (const file of files) {
      if (!file.endsWith(".json") || file.includes(".answer.") || file.includes(".proven.")) {
        continue;
      }
      try {
        const raw = await fs.readFile(
          path.join(this.breakpointsDir, file),
          "utf-8",
        );
        const bp = BreakpointSchema.parse(JSON.parse(raw));
        if (bp.status !== "pending" && bp.status !== "routed") continue;

        // Check expiration
        if (new Date(bp.expiresAt) < new Date()) continue;

        // Filter by responder if specified
        if (responderId && bp.routing.targetResponders.length > 0) {
          if (!bp.routing.targetResponders.includes(responderId)) continue;
        }

        // Check if answer already exists
        try {
          await fs.access(this.answerPath(bp.id));
          continue; // Already answered
        } catch {
          // No answer, include it
        }

        pending.push(bp);
      } catch {
        // Skip malformed files
      }
    }

    return pending;
  }

  async answerBreakpoint(
    id: string,
    answer: SubmitAnswerParams,
  ): Promise<BreakpointAnswer> {
    // Verify breakpoint exists
    await this.getBreakpoint(id);

    const answerId = generateBreakpointId();
    const now = new Date().toISOString();

    const breakpointAnswer: BreakpointAnswer = {
      id: answerId,
      breakpointId: id,
      responderId: answer.responderId,
      responderName: answer.responderName,
      text: answer.text,
      approved: answer.approved,
      confidence: answer.confidence ?? 80,
      references: answer.references ?? [],
      followUpQuestions: answer.followUpQuestions ?? [],
      answeredAt: now,
      decisionMemory: answer.decisionMemory
        ? { ...answer.decisionMemory, savedAt: now }
        : undefined,
    };

    BreakpointAnswerSchema.parse(breakpointAnswer);

    await fs.writeFile(
      this.answerPath(id),
      JSON.stringify(breakpointAnswer, null, 2) + "\n",
      "utf-8",
    );

    // Update the breakpoint status
    const breakpoint = await this.getBreakpoint(id);
    breakpoint.status = "answered";
    breakpoint.updatedAt = now;
    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );

    return breakpointAnswer;
  }

  async cancelBreakpoint(id: string): Promise<void> {
    const breakpoint = await this.getBreakpoint(id);
    breakpoint.status = "cancelled";
    breakpoint.updatedAt = new Date().toISOString();

    await fs.writeFile(
      this.breakpointPath(id),
      JSON.stringify(breakpoint, null, 2) + "\n",
      "utf-8",
    );
  }
}
```

### 5.4 .gitignore for .breakpoints/

```gitignore
# Private keys must never be committed
.keys/private/
```

### 5.5 Multi-User Workflow

The git-native backend supports multi-user collaboration through standard git operations:

1. **Submitter** runs a process that creates `.breakpoints/<id>.json` and commits + pushes.
2. **Responder** pulls, sees pending breakpoints, creates `.breakpoints/<id>.answer.json`, commits + pushes.
3. **Submitter's** polling loop detects the new answer file on pull (or via filesystem watcher on shared mounts).

For real-time scenarios on the same machine (e.g., babysitter + CLI in the same repo), filesystem polling is sufficient. For remote collaboration, a periodic `git pull` in the poll loop can be enabled via configuration:

```typescript
export interface GitNativeBackendOptions {
  // ... existing options ...
  /** When true, run `git pull` before each poll cycle. Default false. */
  gitPullOnPoll?: boolean;
  /** When true, run `git add + git commit + git push` after submitting/answering. Default false. */
  gitPushOnWrite?: boolean;
}
```

---

## 6. Proven Breakpoints

**File:** `src/proven/`

The "proven" subsystem adds cryptographic signing to breakpoint answers, enabling trust verification without a central authority. Trust is established via git-tracked public keys.

### 6.1 Key Management

**File:** `src/proven/keys.ts`

```typescript
import { generateKeyPairSync, createPublicKey, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  BREAKPOINTS_TRUSTED_KEYS_DIR,
  BREAKPOINTS_PRIVATE_KEYS_DIR,
} from "../types.js";

export interface KeyPairMetadata {
  /** Hex-encoded fingerprint (SHA-256 of public key). */
  fingerprint: string;
  /** Responder identity associated with this key. */
  responderId: string;
  responderName: string;
  /** ISO timestamp of key creation. */
  createdAt: string;
  /** ISO timestamp when this key should no longer be used for signing. */
  expiresAt?: string;
  /** Human-readable note. */
  note?: string;
}

export interface PublicKeyRecord {
  /** Base64-encoded Ed25519 public key (DER format). */
  publicKey: string;
  metadata: KeyPairMetadata;
}

export interface PrivateKeyRecord {
  /** Base64-encoded Ed25519 private key (PKCS8 format). */
  privateKey: string;
  /** Fingerprint linking to the corresponding public key. */
  fingerprint: string;
  responderId: string;
}

/**
 * Generate a new Ed25519 key pair for a responder.
 */
export function generateKeyPair(
  responderId: string,
  responderName: string,
): { publicKeyRecord: PublicKeyRecord; privateKeyRecord: PrivateKeyRecord } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privPkcs8 = privateKey.export({ type: "pkcs8", format: "der" });

  const fingerprint = createHash("sha256").update(pubDer).digest("hex");
  const now = new Date().toISOString();

  return {
    publicKeyRecord: {
      publicKey: pubDer.toString("base64"),
      metadata: {
        fingerprint,
        responderId,
        responderName,
        createdAt: now,
      },
    },
    privateKeyRecord: {
      privateKey: privPkcs8.toString("base64"),
      fingerprint,
      responderId,
    },
  };
}

/**
 * Save a public key to the trusted keys directory (git-tracked).
 */
export async function saveTrustedPublicKey(
  publicKeyRecord: PublicKeyRecord,
  baseDir?: string,
): Promise<string> {
  const dir = baseDir
    ? path.join(baseDir, ".keys", "trusted")
    : path.resolve(process.cwd(), BREAKPOINTS_TRUSTED_KEYS_DIR);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${publicKeyRecord.metadata.fingerprint}.pub.json`);
  await fs.writeFile(filePath, JSON.stringify(publicKeyRecord, null, 2) + "\n", "utf-8");
  return filePath;
}

/**
 * Save a private key to the private keys directory (gitignored).
 */
export async function savePrivateKey(
  privateKeyRecord: PrivateKeyRecord,
  baseDir?: string,
): Promise<string> {
  const dir = baseDir
    ? path.join(baseDir, ".keys", "private")
    : path.resolve(process.cwd(), BREAKPOINTS_PRIVATE_KEYS_DIR);
  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `${privateKeyRecord.fingerprint}.key.json`);
  await fs.writeFile(filePath, JSON.stringify(privateKeyRecord, null, 2) + "\n", "utf-8");
  return filePath;
}

/**
 * Load all trusted public keys from the trusted directory.
 */
export async function loadTrustedPublicKeys(
  baseDir?: string,
): Promise<PublicKeyRecord[]> {
  const dir = baseDir
    ? path.join(baseDir, ".keys", "trusted")
    : path.resolve(process.cwd(), BREAKPOINTS_TRUSTED_KEYS_DIR);

  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const keys: PublicKeyRecord[] = [];
  for (const file of files) {
    if (!file.endsWith(".pub.json")) continue;
    const raw = await fs.readFile(path.join(dir, file), "utf-8");
    keys.push(JSON.parse(raw) as PublicKeyRecord);
  }
  return keys;
}

/**
 * Load a private key by fingerprint.
 */
export async function loadPrivateKey(
  fingerprint: string,
  baseDir?: string,
): Promise<PrivateKeyRecord | null> {
  const dir = baseDir
    ? path.join(baseDir, ".keys", "private")
    : path.resolve(process.cwd(), BREAKPOINTS_PRIVATE_KEYS_DIR);

  const filePath = path.join(dir, `${fingerprint}.key.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as PrivateKeyRecord;
  } catch {
    return null;
  }
}

/**
 * Rotate a key: generate new pair, save both, mark old public key as expired.
 */
export async function rotateKey(
  responderId: string,
  responderName: string,
  oldFingerprint: string,
  baseDir?: string,
): Promise<{ publicKeyRecord: PublicKeyRecord; privateKeyRecord: PrivateKeyRecord }> {
  // Mark old key as expired
  const trustedDir = baseDir
    ? path.join(baseDir, ".keys", "trusted")
    : path.resolve(process.cwd(), BREAKPOINTS_TRUSTED_KEYS_DIR);
  const oldKeyPath = path.join(trustedDir, `${oldFingerprint}.pub.json`);
  try {
    const raw = await fs.readFile(oldKeyPath, "utf-8");
    const oldKey = JSON.parse(raw) as PublicKeyRecord;
    oldKey.metadata.expiresAt = new Date().toISOString();
    oldKey.metadata.note = `Rotated. Superseded by new key for ${responderId}.`;
    await fs.writeFile(oldKeyPath, JSON.stringify(oldKey, null, 2) + "\n", "utf-8");
  } catch {
    // Old key may not exist; that's fine
  }

  // Generate and save new pair
  const newPair = generateKeyPair(responderId, responderName);
  await saveTrustedPublicKey(newPair.publicKeyRecord, baseDir);
  await savePrivateKey(newPair.privateKeyRecord, baseDir);
  return newPair;
}
```

### 6.2 Signing

**File:** `src/proven/sign.ts`

```typescript
import { createPrivateKey, sign as cryptoSign } from "node:crypto";
import type { BreakpointAnswer, ProvenBreakpointAnswer } from "../types.js";
import { loadPrivateKey } from "./keys.js";

/**
 * Fields included in the signature. The order is canonical.
 */
const SIGNED_FIELDS = [
  "id",
  "breakpointId",
  "responderId",
  "text",
  "approved",
  "confidence",
  "answeredAt",
] as const;

/**
 * Build the canonical signing payload from an answer.
 * Fields are sorted, null/undefined serialized as empty string.
 */
function buildSigningPayload(answer: BreakpointAnswer): Buffer {
  const parts: string[] = [];
  for (const field of SIGNED_FIELDS) {
    const value = answer[field as keyof BreakpointAnswer];
    parts.push(`${field}=${value ?? ""}`);
  }
  return Buffer.from(parts.join("\n"), "utf-8");
}

/**
 * Sign a BreakpointAnswer with the responder's private key.
 *
 * Returns a ProvenBreakpointAnswer with the signature and key metadata.
 */
export async function signAnswer(
  answer: BreakpointAnswer,
  fingerprint: string,
  baseDir?: string,
): Promise<ProvenBreakpointAnswer> {
  const keyRecord = await loadPrivateKey(fingerprint, baseDir);
  if (!keyRecord) {
    throw new Error(`Private key not found for fingerprint: ${fingerprint}`);
  }

  const privateKey = createPrivateKey({
    key: Buffer.from(keyRecord.privateKey, "base64"),
    format: "der",
    type: "pkcs8",
  });

  const payload = buildSigningPayload(answer);
  const signature = cryptoSign(null, payload, privateKey);

  return {
    ...answer,
    signature: signature.toString("base64"),
    publicKeyFingerprint: fingerprint,
    signedAt: new Date().toISOString(),
    signedFields: [...SIGNED_FIELDS],
  };
}
```

### 6.3 Verification

**File:** `src/proven/verify.ts`

```typescript
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import type { ProvenBreakpointAnswer, ProvenVerificationResult, BreakpointAnswer } from "../types.js";
import { loadTrustedPublicKeys } from "./keys.js";

/**
 * Rebuild the canonical signing payload for verification.
 */
function buildSigningPayload(answer: BreakpointAnswer, signedFields: string[]): Buffer {
  const parts: string[] = [];
  for (const field of signedFields) {
    const value = answer[field as keyof BreakpointAnswer];
    parts.push(`${field}=${value ?? ""}`);
  }
  return Buffer.from(parts.join("\n"), "utf-8");
}

/**
 * Verify a proven breakpoint answer against trusted public keys.
 */
export async function verifyAnswer(
  provenAnswer: ProvenBreakpointAnswer,
  baseDir?: string,
): Promise<ProvenVerificationResult> {
  const trustedKeys = await loadTrustedPublicKeys(baseDir);
  const matchingKey = trustedKeys.find(
    (k) => k.metadata.fingerprint === provenAnswer.publicKeyFingerprint,
  );

  if (!matchingKey) {
    return {
      valid: false,
      publicKeyFingerprint: provenAnswer.publicKeyFingerprint,
      reason: "Public key not found in trusted keys",
      verifiedAt: new Date().toISOString(),
    };
  }

  // Check key expiration
  if (matchingKey.metadata.expiresAt) {
    const expiresAt = new Date(matchingKey.metadata.expiresAt);
    const signedAt = new Date(provenAnswer.signedAt);
    if (signedAt > expiresAt) {
      return {
        valid: false,
        publicKeyFingerprint: provenAnswer.publicKeyFingerprint,
        responderName: matchingKey.metadata.responderName,
        reason: "Key was expired at time of signing",
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  // Verify signature
  const publicKey = createPublicKey({
    key: Buffer.from(matchingKey.publicKey, "base64"),
    format: "der",
    type: "spki",
  });

  const payload = buildSigningPayload(provenAnswer, provenAnswer.signedFields);
  const signatureBuffer = Buffer.from(provenAnswer.signature, "base64");

  const isValid = cryptoVerify(null, payload, publicKey, signatureBuffer);

  return {
    valid: isValid,
    publicKeyFingerprint: provenAnswer.publicKeyFingerprint,
    responderName: matchingKey.metadata.responderName,
    reason: isValid ? "Signature verified successfully" : "Signature verification failed",
    verifiedAt: new Date().toISOString(),
  };
}
```

### 6.4 Trust Model

The proven breakpoints trust model operates entirely without a server:

1. **Key generation:** Each responder generates an Ed25519 key pair. The public key is committed to `.breakpoints/.keys/trusted/` (git-tracked). The private key stays in `.breakpoints/.keys/private/` (gitignored).

2. **Trust establishment:** When a new public key appears in a PR or commit, team members review and approve it -- the same way they'd review code. This uses git's existing trust/review infrastructure.

3. **Signing:** When a responder answers a breakpoint, they sign the answer with their private key. The signed answer is saved as `<id>.answer.proven.json`.

4. **Verification:** Anyone can verify an answer by checking the signature against the trusted public keys directory.

5. **Key rotation:** Old keys are marked with an `expiresAt` timestamp. Answers signed before expiration remain valid. New answers must use the new key.

6. **Revocation:** Remove or modify the public key file in git. All future verifications will fail for that key.

---

## 7. MCP Server Tools

**File:** `src/mcp/server.ts`

The MCP server exposes breakpoint operations as tools for AI agents via the Model Context Protocol (stdio transport).

### 7.1 Tool: ask_breakpoint

Submit a breakpoint question and wait for an answer.

```typescript
import { z } from "zod";

export const askBreakpointParams = {
  question: z.string().describe("The breakpoint question text."),
  context: z.string().optional().describe(
    "Additional context: what was tried, relevant code, etc.",
  ),
  markdown: z.string().optional().describe(
    "Rich markdown context for rendering.",
  ),
  codeSnippets: z.array(z.object({
    filename: z.string(),
    code: z.string(),
    language: z.string().optional(),
  })).optional().describe("Structured code snippets with metadata."),
  fileReferences: z.array(z.string()).optional().describe(
    "File paths relevant to the breakpoint.",
  ),
  tags: z.array(z.string()).optional().describe(
    "Keywords for categorizing and routing the breakpoint.",
  ),
  domain: z.string().optional().describe(
    "Domain area (e.g., 'backend', 'security', 'devops').",
  ),
  urgency: z.enum(["low", "medium", "high"]).optional().describe(
    "Urgency level of the breakpoint.",
  ),
  interactionKind: z.enum([
    "clarification", "approval", "intervention", "notification", "handoff",
  ]).optional().describe(
    "Semantic classification of the interaction type.",
  ),
  targetResponders: z.array(z.string()).optional().describe(
    "Specific responder IDs to route this breakpoint to.",
  ),
  routingStrategy: z.enum([
    "single", "first-response-wins", "collect-all", "quorum",
  ]).default("first-response-wins").describe(
    "How to route the breakpoint to responders.",
  ),
  timeout: z.number().positive().optional().describe(
    "Timeout in milliseconds. Defaults to 30 minutes.",
  ),
  breakpointId: z.string().optional().describe(
    "Canonical breakpoint identity for cross-run matching and auto-approval rules.",
  ),
  backend: z.string().optional().describe(
    "Explicit backend to use (e.g., 'git-native'). Defaults to configured backend.",
  ),
  breakpointsDir: z.string().optional().describe(
    "Path to .breakpoints directory (git-native backend).",
  ),
  proven: z.boolean().optional().describe(
    "When true, require the answer to be cryptographically signed.",
  ),
};

export const askBreakpointDescription =
  "Submit a breakpoint question and wait for a human responder's answer. " +
  "Use this when you encounter a decision, approval, or question that " +
  "requires human judgment. The tool blocks until an answer is received, " +
  "the timeout elapses, or the breakpoint is cancelled.";
```

**Handler behavior:**
1. Resolve the backend (from `backend` param, environment, routing config, or default git-native).
2. Build `BreakpointContext` and `BreakpointRouting` from params.
3. Call `backend.submitBreakpoint()`.
4. Call `backend.waitForAnswer()` with timeout.
5. If `proven` is true, verify the answer signature before returning.
6. Return JSON result with breakpoint status, answer text, and metadata.

### 7.2 Tool: check_breakpoint_status

```typescript
export const checkBreakpointStatusParams = {
  breakpointId: z.string().describe("The ID of the breakpoint to check."),
  backend: z.string().optional(),
  breakpointsDir: z.string().optional(),
};

export const checkBreakpointStatusDescription =
  "Check the current status of a pending breakpoint. Returns the breakpoint " +
  "state, any answers received, and timing information.";
```

### 7.3 Tool: list_breakpoints

```typescript
export const listBreakpointsParams = {
  responderId: z.string().optional().describe(
    "Filter by responder ID. Omit to list all pending breakpoints.",
  ),
  backend: z.string().optional(),
  breakpointsDir: z.string().optional(),
};

export const listBreakpointsDescription =
  "List pending breakpoints awaiting answers. Optionally filter by responder.";
```

### 7.4 Tool: answer_breakpoint

```typescript
export const answerBreakpointParams = {
  breakpointId: z.string().describe("The ID of the breakpoint to answer."),
  text: z.string().describe("The answer text."),
  approved: z.boolean().optional().describe(
    "For approval-type breakpoints, whether to approve or reject.",
  ),
  responderId: z.string().describe("Your responder identity."),
  responderName: z.string().describe("Your display name."),
  confidence: z.number().min(0).max(100).optional().describe(
    "Confidence level 0-100. Defaults to 80.",
  ),
  references: z.array(z.string()).optional().describe(
    "Supporting references or links.",
  ),
  sign: z.boolean().optional().describe(
    "When true, cryptographically sign the answer with your private key.",
  ),
  keyFingerprint: z.string().optional().describe(
    "Ed25519 key fingerprint to use for signing. Required when sign=true.",
  ),
  backend: z.string().optional(),
  breakpointsDir: z.string().optional(),
};

export const answerBreakpointDescription =
  "Submit an answer to a pending breakpoint. Optionally sign the answer " +
  "cryptographically for verified trust.";
```

### 7.5 Tool: verify_breakpoint_answer

```typescript
export const verifyBreakpointAnswerParams = {
  breakpointId: z.string().describe(
    "The ID of the breakpoint whose answer to verify.",
  ),
  backend: z.string().optional(),
  breakpointsDir: z.string().optional(),
};

export const verifyBreakpointAnswerDescription =
  "Verify the cryptographic signature of a breakpoint answer against " +
  "trusted public keys. Returns verification status and signer identity.";
```

### 7.6 MCP Server Configuration

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export function createBreakpointMcpServer(): McpServer {
  const server = new McpServer({
    name: "breakpoints-mux",
    version: "0.1.0",
  });

  server.tool(
    "ask_breakpoint",
    askBreakpointDescription,
    askBreakpointParams,
    async (args) => handleAskBreakpoint(args),
  );

  server.tool(
    "check_breakpoint_status",
    checkBreakpointStatusDescription,
    checkBreakpointStatusParams,
    async (args) => handleCheckBreakpointStatus(args),
  );

  server.tool(
    "list_breakpoints",
    listBreakpointsDescription,
    listBreakpointsParams,
    async (args) => handleListBreakpoints(args),
  );

  server.tool(
    "answer_breakpoint",
    answerBreakpointDescription,
    answerBreakpointParams,
    async (args) => handleAnswerBreakpoint(args),
  );

  server.tool(
    "verify_breakpoint_answer",
    verifyBreakpointAnswerDescription,
    verifyBreakpointAnswerParams,
    async (args) => handleVerifyBreakpointAnswer(args),
  );

  return server;
}

export async function startBreakpointMcpServer(): Promise<void> {
  const server = createBreakpointMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

---

## 8. Harness Integration

**File:** `src/harness/`

The harness integration connects breakpoints-mux to babysitter-harness's interaction system, enabling breakpoints to flow through the babysitter orchestration pipeline with auto-approval, posture enforcement, and UX routing.

### 8.1 BreakpointMuxInteractionProvider

**File:** `src/harness/interaction-provider.ts`

```typescript
import type { BreakpointBackend, SubmitBreakpointParams, WaitForAnswerOptions } from "../backend.js";
import type {
  Breakpoint,
  BreakpointAnswer,
  BreakpointContext,
  BreakpointRouting,
  BreakpointWaitResult,
  InteractionKind,
} from "../types.js";
import type { RoutingConfig, RoutingRule } from "../types.js";

/**
 * Options for configuring the interaction provider.
 */
export interface BreakpointMuxProviderOptions {
  /** The default backend to use when no routing rule matches. */
  defaultBackend: BreakpointBackend;
  /** Additional backends available for routing. Keyed by backend name. */
  backends?: Record<string, BreakpointBackend>;
  /** Routing configuration for domain/tag-based backend selection. */
  routingConfig?: RoutingConfig;
  /** Default timeout in ms. */
  defaultTimeoutMs?: number;
}

/**
 * Maps a babysitter ProcessContext.breakpoint() call to a breakpoints-mux
 * backend call, handling routing, context assembly, and result mapping.
 */
export class BreakpointMuxInteractionProvider {
  private defaultBackend: BreakpointBackend;
  private backends: Record<string, BreakpointBackend>;
  private routingConfig?: RoutingConfig;
  private defaultTimeoutMs: number;

  constructor(options: BreakpointMuxProviderOptions) {
    this.defaultBackend = options.defaultBackend;
    this.backends = {
      [options.defaultBackend.name]: options.defaultBackend,
      ...(options.backends ?? {}),
    };
    this.routingConfig = options.routingConfig;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30 * 60 * 1000;
  }

  /**
   * Route a breakpoint through the appropriate backend.
   *
   * This method is called from the babysitter harness when a process
   * invokes `ctx.breakpoint(payload, options)`.
   *
   * @param payload - The breakpoint payload from the process context.
   * @param options - Breakpoint routing options from the process context.
   * @returns A BreakpointResult compatible with babysitter's ProcessContext.
   */
  async handleBreakpoint(
    payload: unknown,
    options: {
      label?: string;
      expert?: string | string[];
      tags?: string[];
      strategy?: string;
      breakpointId?: string;
      autoApproveAfterN?: number;
      presentAlwaysApprove?: boolean;
      interactionKind?: InteractionKind;
      domain?: string;
      timeoutMs?: number;
    },
  ): Promise<{
    approved: boolean;
    response?: string;
    feedback?: string;
    respondedBy?: string;
  }> {
    // 1. Resolve backend via routing rules
    const backend = this.resolveBackend(options.domain, options.tags);

    // 2. Build BreakpointContext from payload and options
    const context = this.buildContext(payload, options);

    // 3. Build BreakpointRouting
    const responders = Array.isArray(options.expert)
      ? options.expert
      : options.expert
        ? [options.expert]
        : [];

    const routing: BreakpointRouting = {
      strategy: (options.strategy as BreakpointRouting["strategy"]) ?? "first-response-wins",
      targetResponders: responders,
      timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
      presentToUser: options.presentAlwaysApprove ?? true,
      breakpointId: options.breakpointId,
      autoApproveAfterN: options.autoApproveAfterN,
    };

    // 4. Submit and wait
    const breakpoint = await backend.submitBreakpoint({
      text: options.label ?? this.extractTextFromPayload(payload),
      context,
      routing,
    });

    const result = await backend.waitForAnswer(breakpoint.id, {
      timeoutMs: routing.timeoutMs,
    });

    // 5. Map to babysitter BreakpointResult shape
    return {
      approved: result.answer?.approved ?? result.answered,
      response: result.answer?.text,
      feedback: result.answer?.text,
      respondedBy: result.answer?.responderName,
    };
  }

  /**
   * Resolve the backend using routing configuration.
   */
  private resolveBackend(domain?: string, tags?: string[]): BreakpointBackend {
    if (!this.routingConfig) return this.defaultBackend;

    for (const rule of this.routingConfig.routes) {
      if (this.matchesRule(rule, domain, tags)) {
        const backend = this.backends[rule.backend];
        if (backend) return backend;
      }
    }

    return this.defaultBackend;
  }

  /**
   * Check if a routing rule matches the given domain and tags.
   */
  private matchesRule(
    rule: RoutingRule,
    domain?: string,
    tags?: string[],
  ): boolean {
    if (rule.domains && domain) {
      if (rule.domains.includes(domain)) return true;
    }
    if (rule.tags && tags) {
      if (rule.tags.some((t) => tags.includes(t))) return true;
    }
    return false;
  }

  /**
   * Build a BreakpointContext from the process payload and options.
   */
  private buildContext(
    payload: unknown,
    options: { label?: string; tags?: string[]; domain?: string; interactionKind?: InteractionKind },
  ): BreakpointContext {
    const description = typeof payload === "string"
      ? payload
      : JSON.stringify(payload, null, 2);

    return {
      description,
      codeSnippets: [],
      fileReferences: [],
      tags: options.tags ?? [],
      domain: options.domain,
      interactionKind: options.interactionKind,
    };
  }

  /**
   * Extract a text summary from an arbitrary payload.
   */
  private extractTextFromPayload(payload: unknown): string {
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object" && "question" in payload) {
      return String((payload as Record<string, unknown>).question);
    }
    if (payload && typeof payload === "object" && "text" in payload) {
      return String((payload as Record<string, unknown>).text);
    }
    return "Breakpoint requires human input";
  }
}
```

### 8.2 Routing Rules

**File:** `src/harness/routing-rules.ts`

```typescript
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { RoutingConfig } from "../types.js";
import { RoutingConfigSchema } from "../types.js";

const DEFAULT_CONFIG_PATHS = [
  ".a5c/breakpoints-routing.json",
  ".breakpoints/routing.json",
];

/**
 * Load routing configuration from the filesystem.
 * Searches default paths in order, returns the first found.
 */
export async function loadRoutingConfig(
  configPath?: string,
  cwd?: string,
): Promise<RoutingConfig | null> {
  const basePath = cwd ?? process.cwd();

  if (configPath) {
    const absPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(basePath, configPath);
    return readAndParseConfig(absPath);
  }

  for (const relPath of DEFAULT_CONFIG_PATHS) {
    const absPath = path.resolve(basePath, relPath);
    const config = await readAndParseConfig(absPath);
    if (config) return config;
  }

  return null;
}

async function readAndParseConfig(filePath: string): Promise<RoutingConfig | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return RoutingConfigSchema.parse(parsed);
  } catch {
    return null;
  }
}
```

### 8.3 Routing Configuration File Format

**`.a5c/breakpoints-routing.json`** or **`.breakpoints/routing.json`**:

```json
{
  "defaultBackend": "git-native",
  "routes": [
    {
      "domains": ["security", "auth"],
      "tags": ["security-review"],
      "backend": "aeq-server",
      "backendConfig": {
        "type": "server",
        "url": "https://aeq.a5c.ai/api/v1"
      }
    },
    {
      "domains": ["infrastructure"],
      "tags": ["ops", "deploy"],
      "backend": "github-issues",
      "backendConfig": {
        "type": "github-issues",
        "owner": "myorg",
        "repo": "ops-questions",
        "labels": ["breakpoint"]
      }
    }
  ]
}
```

### 8.4 Integration with babysitter-harness

The harness integration plugs into the existing interaction system in `packages/babysitter-harness/src/interaction/`. The breakpoints-mux provider is registered alongside the existing terminal-based `askUserQuestion` system.

The integration point is in the harness's breakpoint effect resolver. When a process calls `ctx.breakpoint(payload, options)`, the harness:

1. Evaluates auto-approval rules (existing babysitter SDK logic, unchanged).
2. If not auto-approved, delegates to the `BreakpointMuxInteractionProvider`.
3. The provider selects a backend, submits the breakpoint, and waits for the answer.
4. The answer is mapped back to `BreakpointResult` and returned to the process.

```
ProcessContext.breakpoint()
        |
        v
  Auto-Approval Evaluator (babysitter SDK)
        |
        |-- auto-approved --> BreakpointResult { approved: true }
        |
        |-- needs human -->
        v
  BreakpointMuxInteractionProvider.handleBreakpoint()
        |
        v
  Backend Resolution (routing rules)
        |
        v
  BreakpointBackend.submitBreakpoint() + waitForAnswer()
        |
        v
  Map to BreakpointResult
```

---

## 9. Naming Conventions

### 9.1 Package Naming

| Entity | Convention | Example |
|--------|-----------|---------|
| Package name | `@a5c-ai/breakpoints-mux` | npm scope |
| File names | kebab-case | `git-native.ts`, `interaction-provider.ts` |
| Classes | PascalCase | `GitNativeBackend`, `BreakpointMuxInteractionProvider` |
| Functions | camelCase | `submitBreakpoint`, `verifyAnswer` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT_MS`, `BREAKPOINTS_DIR` |
| Types/Interfaces | PascalCase | `BreakpointBackend`, `ProvenBreakpointAnswer` |
| Zod schemas | PascalCase + `Schema` suffix | `BreakpointSchema`, `BreakpointAnswerSchema` |

### 9.2 Domain Term Mapping

All public APIs use the breakpoints-mux terminology:

| AEQ Term | breakpoints-mux Term |
|----------|---------------------|
| `Question` | `Breakpoint` |
| `Answer` | `BreakpointAnswer` |
| `Expert` / `ExpertProfile` | `Responder` / `ResponderProfile` |
| `QuestionBackend` | `BreakpointBackend` |
| `QuestionContext` | `BreakpointContext` |
| `QuestionRouting` | `BreakpointRouting` |
| `AnswerResult` | `BreakpointWaitResult` |
| `submitQuestion()` | `submitBreakpoint()` |
| `getQuestion()` | `getBreakpoint()` |
| `waitForAnswer()` | `waitForAnswer()` (unchanged) |
| `listExperts()` | `listResponders()` |
| `claimQuestion()` | `claimBreakpoint()` |
| `submitAnswer()` | `answerBreakpoint()` |
| `cancelQuestion()` | `cancelBreakpoint()` |
| `listPendingQuestions()` | `listPendingBreakpoints()` |
| `expertId` | `responderId` |
| `expertName` | `responderName` |
| `questionId` (in Answer) | `breakpointId` (in BreakpointAnswer) |
| `targetExperts` | `targetResponders` |

### 9.3 MCP Tool Naming

| AEQ Tool | breakpoints-mux Tool |
|----------|---------------------|
| `ask_expert_question` | `ask_breakpoint` |
| `check_question_status` | `check_breakpoint_status` |
| `list_domain_experts` | `list_breakpoints` |
| `cancel_expert_question` | (via `ask_breakpoint` cancellation) |
| `poll_expert_questions` | `list_breakpoints` |
| `claim_expert_question` | (via `answer_breakpoint`) |
| `answer_expert_question` | `answer_breakpoint` |
| (new) | `verify_breakpoint_answer` |

---

## 10. Extension Points

The `BreakpointBackend` interface is the primary extension point. Any external package can provide a backend implementation by implementing this interface.

### 10.1 AEQ Server Backend (Extension)

**Kept in the AEQ repo** as `@a5c-ai/aeq-server-backend` (or within `@a5c-ai/aeq-sdk`).

Wraps the existing `ServerBackend` from AEQ, adapting the `QuestionBackend` interface to `BreakpointBackend`:

```typescript
import type { BreakpointBackend } from "@a5c-ai/breakpoints-mux";
// Internal AEQ imports for ServerClient, AnswerPoller, etc.

export class AeqServerBreakpointBackend implements BreakpointBackend {
  readonly name = "aeq-server";

  // Adapts ServerClient calls to BreakpointBackend interface.
  // Maps Breakpoint <-> Question, BreakpointAnswer <-> Answer, etc.

  async submitBreakpoint(params: SubmitBreakpointParams): Promise<Breakpoint> {
    // Convert SubmitBreakpointParams -> SubmitQuestionParams
    // Call this.client.submitQuestion()
    // Convert Question -> Breakpoint
  }

  // ... remaining methods follow the same adaptation pattern
}
```

**Backend config schema (registered externally):**

```typescript
const AeqServerBackendConfigSchema = z.object({
  type: z.literal("server"),
  url: z.string().min(1),
  authToken: z.string().min(1).optional(),
});
```

### 10.2 GitHub Issues Backend (Extension)

**Kept in the AEQ repo** as part of `@a5c-ai/aeq-sdk`.

Wraps the existing `GitHubIssuesBackend` from AEQ:

```typescript
import type { BreakpointBackend } from "@a5c-ai/breakpoints-mux";

export class GitHubIssuesBreakpointBackend implements BreakpointBackend {
  readonly name = "github-issues";

  // Adapts GitHubIssuesBackend to BreakpointBackend interface.
  // Maps Breakpoint <-> Question, BreakpointAnswer <-> Answer, etc.
}
```

**Backend config schema (registered externally):**

```typescript
const GitHubIssuesBackendConfigSchema = z.object({
  type: z.literal("github-issues"),
  owner: z.string().min(1),
  repo: z.string().min(1),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  pollIntervalMs: z.number().positive().optional(),
  timeoutMs: z.number().positive().optional(),
});
```

### 10.3 Custom Backend Registration

Third-party backends can be registered at runtime via a backend factory:

**File:** `src/backends/index.ts`

```typescript
import type { BreakpointBackend } from "../backend.js";
import { GitNativeBackend } from "./git-native.js";
import type { GitNativeBackendOptions } from "./git-native.js";

/**
 * Factory function type for creating backends from config.
 */
export type BackendFactory = (config: Record<string, unknown>) => BreakpointBackend;

/**
 * Registry of backend factories.
 */
const backendFactories = new Map<string, BackendFactory>();

// Register the built-in git-native backend
backendFactories.set("git-native", (config) => {
  return new GitNativeBackend(config as GitNativeBackendOptions);
});

/**
 * Register a custom backend factory.
 * Called by extension packages (e.g., AEQ server backend, GitHub Issues backend).
 */
export function registerBackendFactory(
  name: string,
  factory: BackendFactory,
): void {
  backendFactories.set(name, factory);
}

/**
 * Create a backend from a type name and config object.
 */
export function createBackend(
  type: string,
  config: Record<string, unknown>,
): BreakpointBackend {
  const factory = backendFactories.get(type);
  if (!factory) {
    throw new Error(
      `Unknown backend type: "${type}". ` +
      `Available: ${[...backendFactories.keys()].join(", ")}. ` +
      `Use registerBackendFactory() to add custom backends.`,
    );
  }
  return factory(config);
}

/**
 * Create the default git-native backend with optional config.
 */
export function createDefaultBackend(
  options?: GitNativeBackendOptions,
): GitNativeBackend {
  return new GitNativeBackend(options);
}

/**
 * List all registered backend types.
 */
export function listRegisteredBackends(): string[] {
  return [...backendFactories.keys()];
}
```

### 10.4 Backend Resolution for MCP Tools

The MCP tools resolve backends using a strategy similar to AEQ's `backend-resolver.ts`:

```typescript
/**
 * Resolution order for MCP tool backend selection:
 *
 * 1. Explicit `backend` parameter in tool args.
 * 2. BREAKPOINTS_BACKEND environment variable.
 * 3. Routing configuration (.a5c/breakpoints-routing.json) matched
 *    against domain/tags from the breakpoint context.
 * 4. Default: git-native backend.
 */
export function resolveBreakpointBackend(
  options?: {
    backend?: string;
    domain?: string;
    tags?: string[];
    breakpointsDir?: string;
  },
): BreakpointBackend {
  // 1. Explicit backend
  if (options?.backend) {
    return createBackend(options.backend, {
      breakpointsDir: options.breakpointsDir,
    });
  }

  // 2. Environment variable
  const envBackend = process.env.BREAKPOINTS_BACKEND;
  if (envBackend) {
    return createBackend(envBackend, {
      breakpointsDir: options?.breakpointsDir,
    });
  }

  // 3. Routing config (loaded synchronously from filesystem)
  // ... match domain/tags against routing rules ...

  // 4. Default: git-native
  return createDefaultBackend({
    breakpointsDir: options?.breakpointsDir,
  });
}
```

---

## 11. AEQ Repo Adaptation

In the final phase, the AEQ repo will be adapted to work as an extension ecosystem for breakpoints-mux rather than a standalone system. This section outlines what moves, what stays, and what gets renamed.

### 11.1 What Moves to breakpoints-mux

| Current AEQ Location | New Location | Notes |
|----------------------|--------------|-------|
| `packages/shared/src/types.ts` (core types) | `breakpoints-mux/src/types.ts` | Renamed (Question->Breakpoint, etc.) |
| `packages/sdk/src/providers/question-backend.ts` | `breakpoints-mux/src/backend.ts` | Renamed interface |
| `packages/mcp-tool/src/server.ts` (tool registration) | `breakpoints-mux/src/mcp/server.ts` | New tool names |
| (new) git-native backend | `breakpoints-mux/src/backends/git-native.ts` | New implementation |
| (new) proven subsystem | `breakpoints-mux/src/proven/` | New implementation |

### 11.2 What Stays in AEQ

| AEQ Component | Reason |
|---------------|--------|
| `packages/server` | AEQ HTTP server, runs as a hosted backend service |
| `packages/sdk/src/providers/server-backend.ts` | Adapts AEQ server to BreakpointBackend interface |
| `packages/sdk/src/providers/github-issues-backend.ts` | Adapts GitHub Issues to BreakpointBackend interface |
| `packages/auth` | JWT/OAuth, specific to AEQ server |
| `packages/dashboard` | Next.js dashboard, specific to AEQ server |
| `packages/cli` | AEQ-specific CLI for server interaction |
| `packages/shared` (non-core types) | Auth types, project types, team types |

### 11.3 What Gets Renamed in AEQ

The AEQ SDK backends will be updated to implement `BreakpointBackend` from `@a5c-ai/breakpoints-mux` instead of the local `QuestionBackend` interface:

```typescript
// Before (AEQ-only):
import type { QuestionBackend } from "./question-backend.js";
export class ServerBackend implements QuestionBackend { ... }

// After (breakpoints-mux extension):
import type { BreakpointBackend } from "@a5c-ai/breakpoints-mux";
export class AeqServerBreakpointBackend implements BreakpointBackend { ... }
```

The existing `QuestionBackend` interface will be deprecated with a type alias:

```typescript
/** @deprecated Use BreakpointBackend from @a5c-ai/breakpoints-mux */
export type QuestionBackend = import("@a5c-ai/breakpoints-mux").BreakpointBackend;
```

### 11.4 Migration Path

1. **Phase 1:** breakpoints-mux ships with git-native backend and proven subsystem. AEQ is unmodified.
2. **Phase 2:** AEQ SDK adds `@a5c-ai/breakpoints-mux` as a dependency. Server and GitHub Issues backends implement `BreakpointBackend` alongside the existing `QuestionBackend`.
3. **Phase 3:** AEQ MCP tool is updated to use breakpoints-mux's backend resolution, making git-native the default with AEQ server as an extension.
4. **Phase 4:** Deprecate `QuestionBackend` interface. All new code uses `BreakpointBackend`.

### 11.5 Backward Compatibility

During the migration period:
- The AEQ server continues to work unchanged.
- The AEQ SDK exports both `QuestionBackend` (deprecated) and adapters for `BreakpointBackend`.
- The MCP tool accepts both old tool names (via aliases) and new tool names.
- Routing configuration supports both `.a5c/routing.json` (AEQ format) and `.a5c/breakpoints-routing.json` (new format).

---

## 12. Implementation Phases

### Phase 1: Core Types and Backend Interface
- `src/types.ts` -- All Zod schemas and domain types
- `src/backend.ts` -- `BreakpointBackend` interface
- `src/index.ts` -- Barrel export
- `__tests__/types.test.ts` -- Schema validation tests
- `package.json`, `tsconfig.json`

### Phase 2: Git-Native Backend
- `src/backends/git-native.ts` -- Full implementation
- `src/backends/index.ts` -- Factory and registration
- `__tests__/git-native-backend.test.ts` -- File I/O, polling, lifecycle tests
- `.breakpoints/.gitignore` template

### Phase 3: Proven Breakpoints -- Key Management
- `src/proven/keys.ts` -- Key generation, storage, loading, rotation
- `src/proven/types.ts` -- Proven-specific types
- `src/proven/index.ts` -- Barrel export
- `__tests__/proven-keys.test.ts`

### Phase 4: Proven Breakpoints -- Signing and Verification
- `src/proven/sign.ts` -- Answer signing
- `src/proven/verify.ts` -- Answer verification
- `__tests__/proven-sign-verify.test.ts` -- Round-trip tests, tampering detection, key rotation

### Phase 5: MCP Server Tools
- `src/mcp/server.ts` -- MCP server with all 5 tools
- `src/mcp/tools/ask-breakpoint.ts`
- `src/mcp/tools/check-status.ts`
- `src/mcp/tools/list-breakpoints.ts`
- `src/mcp/tools/answer-breakpoint.ts`
- `src/mcp/tools/verify-answer.ts`
- `src/mcp/index.ts`
- `__tests__/mcp-server.test.ts`

### Phase 6: Harness Integration
- `src/harness/interaction-provider.ts` -- `BreakpointMuxInteractionProvider`
- `src/harness/routing-rules.ts` -- Config loading and matching
- `src/harness/index.ts`
- `__tests__/harness-integration.test.ts`
- `__tests__/routing-rules.test.ts`

### Phase 7: CLI
- `src/cli.ts` -- Commander.js CLI for manual operations
  - `breakpoints submit` -- Submit a breakpoint interactively
  - `breakpoints list` -- List pending breakpoints
  - `breakpoints answer <id>` -- Answer a breakpoint
  - `breakpoints status <id>` -- Check breakpoint status
  - `breakpoints cancel <id>` -- Cancel a breakpoint
  - `breakpoints keys generate` -- Generate key pair
  - `breakpoints keys list` -- List trusted keys
  - `breakpoints keys rotate` -- Rotate a key
  - `breakpoints verify <id>` -- Verify answer signature
- `bin/breakpoints-mux.js` -- CLI entry point

### Phase 8: AEQ Repo Adaptation
- Add `@a5c-ai/breakpoints-mux` dependency to AEQ SDK
- Implement `AeqServerBreakpointBackend` adapter
- Implement `GitHubIssuesBreakpointBackend` adapter
- Update AEQ MCP tool to use breakpoints-mux backend resolution
- Deprecate `QuestionBackend` with type alias
- Add backward-compatible tool name aliases

---

## Appendix A: Public API Surface

**`@a5c-ai/breakpoints-mux`** (main export):

```typescript
// Types
export type {
  Breakpoint,
  BreakpointStatus,
  BreakpointStrategy,
  BreakpointContext,
  BreakpointRouting,
  BreakpointAnswer,
  BreakpointWaitResult,
  BreakpointSubmitter,
  ResponderProfile,
  ProvenBreakpointAnswer,
  ProvenVerificationResult,
  InteractionKind,
  Urgency,
  CodeSnippet,
  DecisionMemory,
  BreakpointAnswerRating,
  RoutingConfig,
  RoutingRule,
} from "./types.js";

// Zod Schemas
export {
  BreakpointSchema,
  BreakpointStatusSchema,
  BreakpointStrategySchema,
  BreakpointContextSchema,
  BreakpointRoutingSchema,
  BreakpointAnswerSchema,
  BreakpointWaitResultSchema,
  ResponderProfileSchema,
  ProvenBreakpointAnswerSchema,
  ProvenVerificationResultSchema,
  RoutingConfigSchema,
  RoutingRuleSchema,
} from "./types.js";

// Backend Interface
export type {
  BreakpointBackend,
  SubmitBreakpointParams,
  WaitForAnswerOptions,
  SubmitAnswerParams,
  ListRespondersParams,
} from "./backend.js";

// Constants
export {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  BREAKPOINTS_DIR,
  generateBreakpointId,
} from "./types.js";
```

**`@a5c-ai/breakpoints-mux/backends`**:

```typescript
export { GitNativeBackend } from "./git-native.js";
export type { GitNativeBackendOptions } from "./git-native.js";
export {
  registerBackendFactory,
  createBackend,
  createDefaultBackend,
  listRegisteredBackends,
} from "./index.js";
export type { BackendFactory } from "./index.js";
```

**`@a5c-ai/breakpoints-mux/proven`**:

```typescript
export { generateKeyPair, saveTrustedPublicKey, savePrivateKey, loadTrustedPublicKeys, loadPrivateKey, rotateKey } from "./keys.js";
export { signAnswer } from "./sign.js";
export { verifyAnswer } from "./verify.js";
export type { KeyPairMetadata, PublicKeyRecord, PrivateKeyRecord } from "./keys.js";
```

**`@a5c-ai/breakpoints-mux/mcp`**:

```typescript
export { createBreakpointMcpServer, startBreakpointMcpServer } from "./server.js";
```

**`@a5c-ai/breakpoints-mux/harness`**:

```typescript
export { BreakpointMuxInteractionProvider } from "./interaction-provider.js";
export type { BreakpointMuxProviderOptions } from "./interaction-provider.js";
export { loadRoutingConfig } from "./routing-rules.js";
```

---

## Appendix B: Configuration Files Reference

### B.1 `.breakpoints/routing.json`

```json
{
  "defaultBackend": "git-native",
  "routes": [
    {
      "domains": ["security"],
      "backend": "aeq-server",
      "backendConfig": { "type": "server", "url": "https://aeq.a5c.ai/api/v1" }
    }
  ]
}
```

### B.2 `.breakpoints/.gitignore`

```gitignore
.keys/private/
```

### B.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BREAKPOINTS_BACKEND` | Force a specific backend type | (routing config or git-native) |
| `BREAKPOINTS_DIR` | Override `.breakpoints` directory path | `.breakpoints` |
| `BREAKPOINTS_TIMEOUT_MS` | Default timeout in ms | `1800000` (30 min) |
| `BREAKPOINTS_POLL_INTERVAL_MS` | Polling interval in ms | `3000` |

---

## Appendix C: Compatibility Matrix

| Feature | git-native | aeq-server (ext) | github-issues (ext) |
|---------|-----------|-------------------|---------------------|
| submitBreakpoint | Yes | Yes | Yes |
| getBreakpoint | Yes | Yes | Yes |
| waitForAnswer | Polling | SSE + Polling | Polling |
| listPendingBreakpoints | Yes | Yes | Yes |
| answerBreakpoint | Yes | Yes | Yes |
| cancelBreakpoint | Yes | Yes | Yes |
| listResponders | No (file-based) | Yes | Yes (from assignees) |
| claimBreakpoint | No (implicit) | Yes | Yes |
| Proven (signing) | Yes | Possible | No |
| Server required | No | Yes | No (GitHub API) |
| Multi-user | Git push/pull | Real-time | GitHub notifications |

---

## Appendix D: Test Strategy

All tests use Vitest with the conventions established in both the AEQ and babysitter repos:

- **Unit tests:** Test types, schemas, key management, signing, verification in isolation.
- **Integration tests:** Test git-native backend file I/O with a temporary directory, test MCP server tool handlers with mock backends.
- **Factory functions:** Each test file provides factory helpers for creating test fixtures (breakpoints, answers, keys).
- **Fake timers:** Used for polling/timeout tests in `waitForAnswer`.
- **No real git operations in tests:** Tests use temporary directories and direct file operations, not `git` commands.

Target: 100+ tests across all test files, mirroring the coverage density of both parent repos.
