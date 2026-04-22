/**
 * Factory for obtaining an AmuxClient instance.
 *
 * The package is a direct dependency, but some runtimes still cannot load the
 * full agent-mux graph (for example when a required Node built-in is absent).
 */

import { builtinModules } from "node:module";
import type { AmuxClient } from "./amuxTypes";

let cachedClient: AmuxClient | null = null;

function hasNodeSqliteBuiltin(): boolean {
  return builtinModules.includes("node:sqlite") || builtinModules.includes("sqlite");
}

function normalizeAmuxLoadError(error: unknown): Error {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  const message = error instanceof Error ? error.message : String(error);
  if (
    code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "MODULE_NOT_FOUND" ||
    message.includes("node:sqlite")
  ) {
    return new Error(
      `agent-mux runtime is unavailable in this Node environment: ${message}`,
      { cause: error },
    );
  }
  return error instanceof Error ? error : new Error(message);
}

/**
 * Get or create the singleton AmuxClient.
 */
export async function getAmuxClient(): Promise<AmuxClient> {
  if (cachedClient) return cachedClient;
  if (!hasNodeSqliteBuiltin()) {
    throw normalizeAmuxLoadError(
      new Error("Missing required built-in module: node:sqlite"),
    );
  }

  try {
    const { createClient } = await import("@a5c-ai/agent-mux");
    const client = createClient({
      stream: true,
      debug: false,
    });
    cachedClient = client as unknown as AmuxClient;
    return cachedClient;
  } catch (error) {
    throw normalizeAmuxLoadError(error);
  }
}

/**
 * Check whether agent-mux client can be created.
 */
export async function isAmuxAvailable(): Promise<boolean> {
  try {
    await getAmuxClient();
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset the cached client. For testing.
 * @internal
 */
export function _resetAmuxClientCache(): void {
  cachedClient = null;
}
