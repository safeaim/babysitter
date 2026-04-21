// ── Types and Schemas ────────────────────────────────────────────────────
export {
  // Zod schemas
  BreakpointStatusSchema,
  BreakpointStrategySchema,
  UrgencySchema,
  InteractionKindSchema,
  CodeSnippetSchema,
  BreakpointContextLinkSchema,
  BreakpointContextSectionSchema,
  BreakpointContextArtifactSchema,
  BreakpointContextSchema,
  BreakpointRoutingSchema,
  ResponderProfileSchema,
  BreakpointAnswerRatingSchema,
  DecisionMemorySchema,
  BreakpointAnswerSchema,
  BreakpointSubmitterSchema,
  BreakpointSchema,
  BreakpointWaitResultSchema,
  ProvenBreakpointAnswerSchema,
  ProvenVerificationResultSchema,
  BackendConfigSchema,
  RoutingRuleSchema,
  RoutingConfigSchema,
  // Constants
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  BREAKPOINTS_DIR,
  BREAKPOINTS_KEYS_DIR,
  BREAKPOINTS_TRUSTED_KEYS_DIR,
  BREAKPOINTS_PRIVATE_KEYS_DIR,
  // Utility
  generateBreakpointId,
} from "./types.js";

export type {
  BreakpointStatus,
  BreakpointStrategy,
  Urgency,
  InteractionKind,
  CodeSnippet,
  BreakpointContextLink,
  BreakpointContextSection,
  BreakpointContextArtifact,
  BreakpointContext,
  BreakpointRouting,
  ResponderProfile,
  BreakpointAnswerRating,
  DecisionMemory,
  BreakpointAnswer,
  BreakpointSubmitter,
  Breakpoint,
  BreakpointWaitResult,
  ProvenBreakpointAnswer,
  ProvenVerificationResult,
  BackendConfig,
  RoutingRule,
  RoutingConfig,
} from "./types.js";

// ── Backend Interface ────────────────────────────────────────────────────
export type {
  BreakpointBackend,
  SubmitBreakpointParams,
  WaitForAnswerOptions,
  SubmitAnswerParams,
  ListRespondersParams,
} from "./backend.js";

// ── Backend Factory ──────────────────────────────────────────────────────
export {
  createBackend,
  createDefaultBackend,
  resolveBackend,
  matchRoute,
  registerBackendFactory,
  listRegisteredBackends,
} from "./backends/index.js";

export type { BackendFactory } from "./backends/index.js";

// ── Git-Native Backend ──────────────────────────────────────────────
export { GitNativeBackend } from "./backends/git-native.js";
export type { GitNativeBackendOptions } from "./backends/git-native.js";

// ── Proven Breakpoints ──────────────────────────────────────────────
export {
  generateKeyPair,
  saveTrustedPublicKey,
  savePrivateKey,
  loadTrustedPublicKeys,
  loadPrivateKey,
  rotateKey,
  signAnswer,
  verifyAnswer,
} from "./proven/index.js";

export type {
  KeyPairMetadata,
  PublicKeyRecord,
  PrivateKeyRecord,
} from "./proven/index.js";

// ── MCP Server ──────────────────────────────────────────────────────
export {
  createBreakpointMcpServer,
  startBreakpointMcpServer,
} from "./mcp/index.js";

// ── Harness Integration ─────────────────────────────────────────────
export {
  BreakpointMuxInteractionProvider,
  loadRoutingConfig,
} from "./harness/index.js";

export type { BreakpointMuxProviderOptions } from "./harness/index.js";
