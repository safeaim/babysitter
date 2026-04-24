import { listFallbackHarnessMetadata } from "@a5c-ai/agent-catalog";
import type { AmuxAdapterMetadata } from "./amuxMetadata";

export const STATIC_FALLBACK_METADATA: Record<string, AmuxAdapterMetadata> = Object.fromEntries(
  Object.values(listFallbackHarnessMetadata()).map((metadata) => [
    metadata.adapterName,
    {
      name: metadata.adapterName,
      hostEnvSignals: metadata.hostEnvSignals,
      capabilities: metadata.capabilities,
      sessionDir: metadata.sessionDir,
    },
  ]),
);
