export interface AgentCliProgram {
  readonly variant: "agent";
  readonly commandName: "agent-platform";
  readonly packageName: "@a5c-ai/agent-platform";
}

export const AGENT_PROGRAM: AgentCliProgram = {
  variant: "agent",
  commandName: "agent-platform",
  packageName: "@a5c-ai/agent-platform",
};
