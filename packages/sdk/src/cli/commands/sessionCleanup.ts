/**
 * session:cleanup — garbage-collect dead session-marker files and deactivate
 * stale session state (.md) files whose sessions are no longer reachable via
 * any live harness ancestor.
 *
 * Conservative: only deactivates state files whose associated runs are
 * terminal (RUN_COMPLETED / RUN_FAILED) OR whose lastIterationAt is older than
 * the staleness threshold. If the run dir is missing, the terminal check is
 * skipped and the 24h threshold is the sole criterion.
 */

import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import { getGlobalStateDir, DEFAULTS } from "../../config";
import { isProcessAlive } from "../../utils/processLiveness";
import { readSessionFile, writeSessionFile } from "../../session";

const STATE_STALE_MS = 24 * 60 * 60 * 1000;

export interface SessionCleanupArgs {
  harness?: string;
  dryRun?: boolean;
  json?: boolean;
  /** Override state dir (tests). */
  stateDir?: string;
  /** Override runs dir (tests/CLI). */
  runsDir?: string;
}

export interface SessionCleanupResult {
  markersRemoved: string[];
  statesDeactivated: string[];
  dryRun: boolean;
}

interface MarkerInfo {
  file: string;
  absPath: string;
  harness: string;
  pid: number;
  alive: boolean;
  sessionId?: string;
}

function sanitizeHarnessSlug(harness: string): string {
  return harness
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse a marker filename of form `current-session-<harness>-pid-<pid>`.
 * Returns undefined if the name doesn't match.
 */
export function parseMarkerFilename(
  name: string,
): { harness: string; pid: number } | undefined {
  // We allow harness slug to contain hyphens. The pid is the trailing
  // numeric segment after `-pid-`.
  const prefix = "current-session-";
  if (!name.startsWith(prefix)) return undefined;
  const rest = name.slice(prefix.length);
  const match = rest.match(/^(.+)-pid-(\d+)$/);
  if (!match) return undefined;
  const harness = match[1];
  const pid = parseInt(match[2], 10);
  if (!Number.isFinite(pid) || pid <= 0) return undefined;
  return { harness, pid };
}

function listMarkerFiles(stateDir: string, harnessFilter?: string): MarkerInfo[] {
  let entries: string[];
  try {
    entries = readdirSync(stateDir);
  } catch {
    return [];
  }
  const slugFilter = harnessFilter ? sanitizeHarnessSlug(harnessFilter) : undefined;
  const out: MarkerInfo[] = [];
  for (const name of entries) {
    const parsed = parseMarkerFilename(name);
    if (!parsed) continue;
    if (slugFilter && parsed.harness !== slugFilter) continue;
    const absPath = path.join(stateDir, name);
    let sessionId: string | undefined;
    try {
      const raw = readFileSync(absPath, "utf8").trim();
      sessionId = raw || undefined;
    } catch {
      // unreadable marker — we can still decide based on pid liveness
    }
    out.push({
      file: name,
      absPath,
      harness: parsed.harness,
      pid: parsed.pid,
      alive: isProcessAlive(parsed.pid),
      sessionId,
    });
  }
  return out;
}

function isRunTerminal(runsDir: string, runId: string): boolean | undefined {
  const journalDir = path.join(runsDir, runId, "journal");
  let files: string[];
  try {
    files = readdirSync(journalDir);
  } catch {
    return undefined;
  }
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();
  const last = jsonFiles.at(-1);
  if (!last) return false;
  try {
    const parsed = JSON.parse(
      readFileSync(path.join(journalDir, last), "utf8"),
    ) as { type?: string };
    const type = parsed.type;
    return type === "RUN_COMPLETED" || type === "RUN_FAILED";
  } catch {
    return false;
  }
}

function isStaleByTime(lastIterationAt: string): boolean {
  if (!lastIterationAt) return true;
  const t = Date.parse(lastIterationAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > STATE_STALE_MS;
}

/**
 * Programmatic entrypoint for the cleanup logic. Exported for tests and for
 * in-process invocation from session-start hooks.
 */
export async function runSessionCleanup(
  args: SessionCleanupArgs,
): Promise<SessionCleanupResult> {
  const dryRun = Boolean(args.dryRun);
  const stateDir = args.stateDir ?? getGlobalStateDir();
  const runsDir = args.runsDir ?? process.env.BABYSITTER_RUNS_DIR ?? DEFAULTS.runsDir;

  const markers = listMarkerFiles(stateDir, args.harness);
  const deadMarkers = markers.filter((m) => !m.alive);
  const liveSessionIds = new Set<string>(
    markers.filter((m) => m.alive && m.sessionId).map((m) => m.sessionId as string),
  );

  const markersRemoved: string[] = [];
  if (!dryRun) {
    for (const m of deadMarkers) {
      try {
        unlinkSync(m.absPath);
        markersRemoved.push(m.file);
      } catch {
        // best effort
      }
    }
  } else {
    for (const m of deadMarkers) markersRemoved.push(m.file);
  }

  // Scan .md state files
  let mdEntries: string[] = [];
  try {
    mdEntries = readdirSync(stateDir);
  } catch {
    mdEntries = [];
  }

  const statesDeactivated: string[] = [];
  for (const name of mdEntries) {
    if (!name.endsWith(".md")) continue;
    const sessionId = name.slice(0, -3);
    if (liveSessionIds.has(sessionId)) continue;
    const filePath = path.join(stateDir, name);
    let state;
    let prompt: string;
    try {
      const parsed = await readSessionFile(filePath);
      state = parsed.state;
      prompt = parsed.prompt;
    } catch {
      continue;
    }
    if (!state.active) continue;

    let qualifies = false;
    let terminal: boolean | undefined;
    if (state.runId) {
      terminal = isRunTerminal(runsDir, state.runId);
    }
    if (terminal === true) {
      qualifies = true;
    } else if (isStaleByTime(state.lastIterationAt)) {
      qualifies = true;
    }
    if (!qualifies) continue;

    if (!dryRun) {
      try {
        await writeSessionFile(filePath, { ...state, active: false }, prompt);
        statesDeactivated.push(sessionId);
      } catch {
        // best effort
      }
    } else {
      statesDeactivated.push(sessionId);
    }
  }

  return { markersRemoved, statesDeactivated, dryRun };
}

export async function handleSessionCleanup(args: SessionCleanupArgs): Promise<number> {
  const result = await runSessionCleanup(args);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(
      `[session:cleanup] dryRun=${result.dryRun} markersRemoved=${result.markersRemoved.length} statesDeactivated=${result.statesDeactivated.length}`,
    );
    for (const f of result.markersRemoved) console.log(`  marker: ${f}`);
    for (const s of result.statesDeactivated) console.log(`  deactivated: ${s}`);
  }
  return 0;
}

