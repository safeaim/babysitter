const pkg = require("../package.json") as { version?: unknown };

export const BABYSITTER_SDK_VERSION =
  typeof pkg.version === "string" && pkg.version.trim() !== ""
    ? pkg.version
    : "0.0.0-unknown";

export function withSdkVersion<T extends Record<string, unknown>>(record: T): T & { sdkVersion: string } {
  return {
    ...record,
    sdkVersion: BABYSITTER_SDK_VERSION,
  };
}
