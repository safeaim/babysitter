/**
 * Harness auto-detection.
 *
 * Probes environment variables to determine which harness the current
 * process is running inside. Used when `--adapter auto` is passed
 * to the CLI, sparing the caller from having to know or care which
 * particular flavour of AI assistant has summoned us.
 */

export interface DetectedHarness {
  /** Adapter name (e.g. 'claude', 'codex', 'gemini'). */
  adapter: string;
  /** How confident we are in the detection. */
  confidence: 'high' | 'medium' | 'low';
  /** What signals were found in the environment. */
  evidence: string[];
}

/**
 * Detection rule: a named probe that checks for harness-specific
 * environment variables.
 */
interface DetectionRule {
  adapter: string;
  confidence: 'high' | 'medium' | 'low';
  /** Env vars that, if any is set, constitute evidence for this harness. */
  signals: string[];
  /**
   * Optional predicate for rules that need absence-of-other-signals logic
   * (e.g. Codex medium-confidence requires no Claude signals).
   */
  condition?: (env: Record<string, string | undefined>) => boolean;
}

/**
 * Ordered list of detection rules.
 * First high-confidence match wins; checked sequentially.
 */
const DETECTION_RULES: DetectionRule[] = [
  // 1. Claude Code
  {
    adapter: 'claude',
    confidence: 'high',
    signals: ['CLAUDE_PLUGIN_ROOT', 'CLAUDE_ENV_FILE'],
  },
  // 2. Codex — high if CODEX_PLUGIN_ROOT is set
  {
    adapter: 'codex',
    confidence: 'high',
    signals: ['CODEX_PLUGIN_ROOT'],
  },
  // 2b. Codex — medium if OPENAI_API_KEY is set but no Claude signals
  {
    adapter: 'codex',
    confidence: 'medium',
    signals: ['OPENAI_API_KEY'],
    condition: (env) =>
      !env['CLAUDE_PLUGIN_ROOT'] && !env['CLAUDE_ENV_FILE'],
  },
  // 3. Gemini CLI
  {
    adapter: 'gemini',
    confidence: 'high',
    signals: ['GEMINI_EXTENSION_PATH', 'BABYSITTER_EXTENSION_PATH'],
  },
  // 4. GitHub Copilot
  {
    adapter: 'copilot',
    confidence: 'high',
    signals: ['GITHUB_COPILOT_PLUGIN_ROOT'],
  },
  // 5. Cursor
  {
    adapter: 'cursor',
    confidence: 'medium',
    signals: ['CURSOR_PLUGIN_ROOT'],
  },
  // 6. Pi
  {
    adapter: 'pi',
    confidence: 'high',
    signals: ['PI_EXTENSION_DIR', 'PI_SESSION_ID'],
  },
  // 7. Oh-My-Pi
  {
    adapter: 'oh-my-pi',
    confidence: 'high',
    signals: ['OMP_EXTENSION_DIR', 'OMP_SESSION_ID'],
  },
  // 8. OpenCode
  {
    adapter: 'opencode',
    confidence: 'high',
    signals: ['OPENCODE_PLUGIN_DIR'],
  },
  // 9. OpenClaw
  {
    adapter: 'openclaw',
    confidence: 'medium',
    signals: ['OPENCLAW_PLUGIN_DIR'],
  },
];

/**
 * Detect which harness the current process is running inside.
 *
 * Probes environment variables (and optionally process context)
 * looking for harness-specific signals. Returns the first
 * high-confidence match, or failing that the first match of any
 * confidence level.
 *
 * @param env - Environment variables to probe. Defaults to `process.env`.
 * @returns The detected harness, or `null` if nothing matched.
 */
export function detectHarness(
  env: Record<string, string | undefined> = process.env,
): DetectedHarness | null {
  let bestMatch: DetectedHarness | null = null;

  for (const rule of DETECTION_RULES) {
    // Check optional condition (e.g. absence of other signals)
    if (rule.condition && !rule.condition(env)) {
      continue;
    }

    // Collect evidence — which of the rule's signals are actually present
    const evidence: string[] = [];
    for (const signal of rule.signals) {
      if (env[signal] != null && env[signal] !== '') {
        evidence.push(signal);
      }
    }

    if (evidence.length === 0) {
      continue;
    }

    const match: DetectedHarness = {
      adapter: rule.adapter,
      confidence: rule.confidence,
      evidence,
    };

    // High confidence: return immediately (first match wins)
    if (match.confidence === 'high') {
      return match;
    }

    // Otherwise, keep the first non-high match as a fallback
    if (!bestMatch) {
      bestMatch = match;
    }
  }

  return bestMatch;
}
