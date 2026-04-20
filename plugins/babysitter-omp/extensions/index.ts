import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { execSync } from "child_process";
import * as path from "path";

const PLUGIN_ROOT = path.resolve(__dirname, "..");

const COMMANDS = [
  "assimilate", "babysit", "call", "cleanup", "contrib", "doctor", "forever", "help", "observe", "plan", "plugins", "project-install", "resume", "retrospect", "user-install", "yolo"
] as const;

function toSkillPrompt(name: string, args: string): string {
  return `/skill:${name}${args ? ` ${args}` : ""}`;
}

function runProxiedHook(
  scriptName: string,
  inputData?: Record<string, unknown>
): Record<string, unknown> {
  const scriptPath = path.join(PLUGIN_ROOT, "hooks", scriptName);
  try {
    const result = execSync(`node "${scriptPath}"`, {
      input: inputData ? JSON.stringify(inputData) : undefined,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
      env: {
        ...process.env,
        OMP_PLUGIN_ROOT: PLUGIN_ROOT,
      },
    });
    return JSON.parse(result.toString("utf8").trim());
  } catch {
    return {};
  }
}

export default function activate(pi: ExtensionAPI): void {
  runProxiedHook("session-start.js", {
    event: "session_start",
    cwd: process.cwd(),
  });

  const forwardPrimary = async (args: unknown) => {
    pi.sendUserMessage(toSkillPrompt("babysitter", String(args ?? "").trim()));
  };

  pi.registerCommand("babysitter", {
    description: "Load the babysitter skill",
    handler: forwardPrimary,
  });

  for (const name of COMMANDS) {
    const forward = async (args: unknown) => {
      pi.sendUserMessage(toSkillPrompt(name, String(args ?? "").trim()));
    };

    pi.registerCommand(name, {
      description: `Open the ${name} skill`,
      handler: forward,
    });

    pi.registerCommand(`babysitter:${name}`, {
      description: `Alias for /${name}`,
      handler: forward,
    });
  }
}
