/**
 * Ensures React dependencies are locally installed in kanban's
 * node_modules to prevent version conflicts with the monorepo root (which may
 * hoist a different React version from another workspace).
 *
 * The kanban package is built and tested in isolation often enough that local
 * copies of the React-dependent test/runtime packages avoid hoisting surprises.
 */
import { existsSync, cpSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "..");
const rootDir = resolve(pkgDir, "../..");
const localNm = join(pkgDir, "node_modules");

function copyIfMissing(pkg) {
  const src = join(rootDir, "node_modules", pkg);
  const dst = join(localNm, pkg);
  if (existsSync(src) && !existsSync(dst)) {
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst, { recursive: true });
  }
}

// @testing-library packages
for (const pkg of [
  "@testing-library/react",
  "@testing-library/dom",
  "@testing-library/jest-dom",
  "@testing-library/user-event",
]) {
  copyIfMissing(pkg);
}

// @radix-ui packages
const radixDir = join(rootDir, "node_modules", "@radix-ui");
if (existsSync(radixDir)) {
  for (const entry of readdirSync(radixDir)) {
    copyIfMissing(`@radix-ui/${entry}`);
  }
}

// @floating-ui packages (used by @radix-ui/react-tooltip)
for (const pkg of [
  "@floating-ui/react-dom",
  "@floating-ui/dom",
  "@floating-ui/core",
  "@floating-ui/utils",
]) {
  copyIfMissing(pkg);
}

// @tanstack packages (react-virtual uses React hooks)
const tanstackDir = join(rootDir, "node_modules", "@tanstack");
if (existsSync(tanstackDir)) {
  for (const entry of readdirSync(tanstackDir)) {
    copyIfMissing(`@tanstack/${entry}`);
  }
}

// Other React-dependent packages
for (const pkg of [
  "react-remove-scroll",
  "react-remove-scroll-bar",
  "react-style-singleton",
  "aria-hidden",
  "use-callback-ref",
  "use-sidecar",
  "get-nonce",
  "class-variance-authority",
]) {
  copyIfMissing(pkg);
}
