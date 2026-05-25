export interface AgentCliProgram {
  readonly variant: "agent";
  readonly commandName: "omni";
  readonly packageName: "@a5c-ai/omni";
}

export const AGENT_PROGRAM: AgentCliProgram = {
  variant: "agent",
  commandName: "omni",
  packageName: "@a5c-ai/omni",
};
