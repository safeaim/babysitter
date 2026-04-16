export interface SessionCommandArgs {
  sessionId?: string;
  maxIterations?: number;
  runId?: string;
  prompt?: string;
  iteration?: number;
  lastIterationAt?: string;
  iterationTimes?: string;
  delete?: boolean;
  force?: boolean;
  json: boolean;
  runsDir?: string;
}

export interface SessionLastMessageArgs {
  transcriptPath: string;
  json: boolean;
}

export interface SessionLastMessageResult {
  found: boolean;
  text: string | null;
  hasPromise: boolean;
  promiseValue: string | null;
  error?: string;
}

export interface SessionIterationMessageArgs {
  runId?: string;
  iteration?: number;
  runsDir: string;
  pluginRoot?: string;
  json: boolean;
}

export interface SessionIterationMessageResult {
  systemMessage: string;
  runState: string | null;
  completionProof: string | null;
  pendingKinds: string | null;
  skillContext: string | null;
  iteration: number;
}
