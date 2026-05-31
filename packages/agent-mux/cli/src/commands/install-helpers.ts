/**
 * Re-export shim — install helpers now live in @a5c-ai/agent-config-mux.
 */
export {
  makeSpawnRunner,
  defaultSpawnRunner,
  silentSpawnRunner,
  runSilently,
} from '@a5c-ai/agent-config-mux';

export type { SpawnRunner } from '@a5c-ai/agent-config-mux';
