/**
 * Shared session-marker primitives.
 *
 * Provides a harness-agnostic mechanism for persisting a "current session ID"
 * keyed by the PID of a harness ancestor process. This lets descendant
 * processes (hooks, Bash tool calls, etc.) resolve the session they belong to
 * by walking the process tree back to the harness.
 *
 * The ancestor walk has a platform-specific strategy cascade on Windows to
 * survive environments where `wmic` has been removed (Windows 11 24H2+).
 */

import * as path from "node:path";
import {
  execSync,
} from "node:child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
} from "node:fs";
import { getGlobalStateDir } from "../config";
import { isProcessAlive } from "../utils/processLiveness";

export interface AncestorInfo {
  pid: number;
  startTime?: string;
}

const ANCESTOR_CACHE_TTL_MS = 30_000;

interface AncestorCacheEntry {
  info: AncestorInfo | undefined;
  resolvedAt: number;
  processNamesKey: string;
}

let ancestorCache: AncestorCacheEntry | undefined;

type WindowsStrategy = "powershell" | "wmic" | "tasklist-incapable";
let cachedWindowsStrategy: WindowsStrategy | undefined;

export function __resetCacheForTests(): void {
  ancestorCache = undefined;
  cachedWindowsStrategy = undefined;
  ancestorResolverOverride = undefined;
}

// Test seam: allow tests to inject a fake ancestor resolver. Never used in
// production code paths.
let ancestorResolverOverride:
  | ((processNames: string[]) => AncestorInfo | undefined)
  | undefined;

export function __setAncestorResolverForTests(
  fn: ((processNames: string[]) => AncestorInfo | undefined) | undefined,
): void {
  ancestorResolverOverride = fn;
}

function sanitizeHarnessSlug(harness: string): string {
  return harness
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getSessionMarkerPath(harness: string, ancestorPid: number): string {
  const slug = sanitizeHarnessSlug(harness) || "harness";
  return path.join(getGlobalStateDir(), `current-session-${slug}-pid-${ancestorPid}`);
}

// ---------------------------------------------------------------------------
// Ancestor walk
// ---------------------------------------------------------------------------

interface ParentInfo {
  ppid: number;
  name: string;
  startTime?: string;
}

function runCmd(cmd: string, timeoutMs = 5000): string {
  return execSync(cmd, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: timeoutMs,
  });
}

function parsePosixPs(pid: number): ParentInfo | undefined {
  try {
    const out = runCmd(`ps -p ${pid} -o ppid=,comm=,lstart=`).trim();
    // ppid comm lstart...
    const match = out.match(/^\s*(\d+)\s+(\S+)\s*(.*)$/);
    if (!match) return undefined;
    const ppid = parseInt(match[1], 10);
    const name = path.basename(match[2]);
    const startTime = match[3]?.trim() || undefined;
    return { ppid, name, startTime };
  } catch {
    return undefined;
  }
}

function parseWindowsViaPowershell(pid: number): ParentInfo | undefined {
  try {
    const script = `Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\" | Select-Object ParentProcessId,Name,CreationDate | ConvertTo-Json -Compress`;
    const out = runCmd(
      `powershell -NoProfile -Command "${script}"`,
    ).trim();
    if (!out) return undefined;
    const parsed = JSON.parse(out) as
      | { ParentProcessId?: number; Name?: string; CreationDate?: string | { DateTime?: string } }
      | Array<{ ParentProcessId?: number; Name?: string; CreationDate?: string | { DateTime?: string } }>;
    const entry = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!entry) return undefined;
    const ppid = typeof entry.ParentProcessId === "number" ? entry.ParentProcessId : NaN;
    const name = entry.Name ? String(entry.Name) : "";
    let startTime: string | undefined;
    if (typeof entry.CreationDate === "string") {
      startTime = entry.CreationDate;
    } else if (entry.CreationDate && typeof entry.CreationDate === "object") {
      const dt = (entry.CreationDate as { DateTime?: string }).DateTime;
      if (dt) startTime = dt;
    }
    if (!Number.isFinite(ppid) || !name) return undefined;
    return { ppid, name, startTime };
  } catch {
    return undefined;
  }
}

function parseWindowsViaWmic(pid: number): ParentInfo | undefined {
  try {
    const out = runCmd(
      `wmic process where ProcessId=${pid} get ParentProcessId,Name,CreationDate /format:csv`,
    ).trim();
    const lines = out.split(/\r?\n/).filter((l) => l.includes(","));
    if (lines.length < 2) return undefined;
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const row = lines[1].split(",");
    const nameIdx = header.indexOf("name");
    const ppidIdx = header.indexOf("parentprocessid");
    const startIdx = header.indexOf("creationdate");
    if (nameIdx < 0 || ppidIdx < 0) return undefined;
    const name = (row[nameIdx] || "").trim();
    const ppid = parseInt((row[ppidIdx] || "").trim(), 10);
    const startTime = startIdx >= 0 ? (row[startIdx] || "").trim() || undefined : undefined;
    if (!Number.isFinite(ppid) || !name) return undefined;
    return { ppid, name, startTime };
  } catch {
    return undefined;
  }
}

function parseWindows(pid: number): ParentInfo | undefined {
  // Try cached strategy first.
  if (cachedWindowsStrategy === "wmic") {
    const info = parseWindowsViaWmic(pid);
    if (info) return info;
  } else if (cachedWindowsStrategy === "powershell") {
    const info = parseWindowsViaPowershell(pid);
    if (info) return info;
  } else if (cachedWindowsStrategy === "tasklist-incapable") {
    return undefined;
  }

  // Cascade. We try wmic first because on most Windows hosts it is
  // dramatically faster than PowerShell (which has a multi-hundred-ms
  // startup cost per invocation). Windows 11 24H2 removed wmic, so we fall
  // back to PowerShell's Get-CimInstance. Finally, tasklist has Name but no
  // ParentProcessId, so if we're down to only tasklist the ancestor walk is
  // impossible and we bail.
  const wmicInfo = parseWindowsViaWmic(pid);
  if (wmicInfo) {
    cachedWindowsStrategy = "wmic";
    return wmicInfo;
  }
  const psInfo = parseWindowsViaPowershell(pid);
  if (psInfo) {
    cachedWindowsStrategy = "powershell";
    return psInfo;
  }
  cachedWindowsStrategy = "tasklist-incapable";
  return undefined;
}

function getParentInfo(pid: number): ParentInfo | undefined {
  if (process.platform === "win32") return parseWindows(pid);
  return parsePosixPs(pid);
}

function normalizeProcName(name: string): string {
  return path.basename(name).toLowerCase().replace(/\.exe$/, "");
}

export function findHarnessAncestorPid(processNames: string[]): AncestorInfo | undefined {
  if (ancestorResolverOverride) return ancestorResolverOverride(processNames);
  const processNamesKey = processNames.join("|");
  const now = Date.now();

  if (
    ancestorCache &&
    ancestorCache.processNamesKey === processNamesKey &&
    now - ancestorCache.resolvedAt < ANCESTOR_CACHE_TTL_MS
  ) {
    if (!ancestorCache.info) return undefined;
    if (isProcessAlive(ancestorCache.info.pid)) return ancestorCache.info;
    // Cached ancestor died — invalidate and re-walk.
    ancestorCache = undefined;
  }

  const targets = processNames.map((n) => n.toLowerCase().replace(/\.exe$/, ""));
  let pid = process.pid;
  let found: AncestorInfo | undefined;

  for (let depth = 0; depth < 20; depth++) {
    const info = getParentInfo(pid);
    if (!info) break;
    const base = normalizeProcName(info.name || "");
    if (targets.includes(base)) {
      found = { pid, startTime: info.startTime };
      break;
    }
    if (!Number.isFinite(info.ppid) || info.ppid <= 0 || info.ppid === pid) break;
    pid = info.ppid;
  }

  ancestorCache = { info: found, resolvedAt: now, processNamesKey };
  return found;
}

// ---------------------------------------------------------------------------
// Marker file I/O
// ---------------------------------------------------------------------------

function atomicWriteString(target: string, content: string): void {
  mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, content);
  renameSync(tmp, target);
}

/**
 * Write a session marker for the given harness. Returns the path written, or
 * undefined if no ancestor could be located (in which case there is nothing to
 * key the marker against). Throws if the ancestor is found but the write
 * itself fails — callers can try/catch to preserve legacy error reporting.
 */
export function writeSessionMarker(harness: string, sessionId: string): string | undefined {
  // Any harness writer implies its own ancestor name(s). For claude-code this
  // is the string "claude"; other callers pass their own names via the common
  // convention of harness basename.
  const info = findHarnessAncestorPid(deriveProcessNames(harness));
  if (!info) return undefined;
  const target = getSessionMarkerPath(harness, info.pid);
  atomicWriteString(target, `${sessionId}\n`);
  return target;
}

/**
 * Read the session marker for the given harness. Returns undefined when no
 * ancestor can be located, when the marker file does not exist, or when the
 * ancestor is no longer alive.
 */
export function readSessionMarker(harness: string): string | undefined {
  const info = findHarnessAncestorPid(deriveProcessNames(harness));
  if (!info) return undefined;
  if (!isProcessAlive(info.pid)) return undefined;
  const target = getSessionMarkerPath(harness, info.pid);
  if (!existsSync(target)) return undefined;
  try {
    const content = readFileSync(target, "utf8").trim();
    return content || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Derive the canonical set of process names to look for based on the harness
 * slug. This is deliberately conservative: callers that need a custom set
 * should use `findHarnessAncestorPid` directly.
 */
export function deriveProcessNames(harness: string): string[] {
  const slug = sanitizeHarnessSlug(harness);
  switch (slug) {
    case "claude-code":
      return ["claude"];
    case "codex":
      return ["codex"];
    case "cursor":
      return ["cursor"];
    case "gemini-cli":
    case "gemini":
      return ["gemini"];
    case "github-copilot":
      return ["copilot", "gh"];
    case "pi":
    case "oh-my-pi":
      return ["pi"];
    default:
      return [slug];
  }
}
