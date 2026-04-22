import React from 'react';
import { View } from 'react-native';
import { useStore } from 'zustand';

import { CostMeter } from '../components/CostMeter.js';
import { EventList } from '../components/EventList.js';
import { InputBar } from '../components/InputBar.js';
import { RunStatusBadge } from '../components/RunStatusBadge.js';
import { Text } from '../components/primitives/Text.js';
import { selectCostTotals, selectVisibleEventNodes } from '../store/selectors.js';
import { useGateway } from '../hooks/useGateway.js';
import { useSendSessionMessage } from '../hooks/useSendSessionMessage.js';
import { useSession } from '../hooks/useSession.js';

export function SessionDetailScreen(props: { sessionId: string }): JSX.Element {
  const { store } = useGateway();
  const session = useSession(props.sessionId);
  const runs = useStore(store, (state) =>
    Object.values(state.runs.byId)
      .filter((run) => run.sessionId === props.sessionId)
      .sort((left, right) => Number(right.startedAt ?? 0) - Number(left.startedAt ?? 0)),
  );
  const primaryRunId =
    typeof session?.activeRunId === 'string'
      ? session.activeRunId
      : typeof runs[0]?.runId === 'string'
        ? runs[0].runId
        : '';
  const visibleNodes = useStore(store, (state) => (primaryRunId ? selectVisibleEventNodes(state, primaryRunId) : []));
  const totals = useStore(store, (state) => (primaryRunId ? selectCostTotals(state, primaryRunId) : { totalUsd: 0 }));
  const sendSessionMessage = useSendSessionMessage();
  return (
    <View>
      <RunStatusBadge status={String(session?.status ?? 'unknown')} />
      <CostMeter totalUsd={totals.totalUsd} />
      <Text>{String(session?.agent ?? 'unknown')} · {props.sessionId}</Text>
      <EventList items={visibleNodes} agent={typeof session?.agent === 'string' ? session.agent : undefined} />
      <InputBar
        onSubmit={(value) => {
          if (!value.trim()) {
            return;
          }
          void sendSessionMessage({
            sessionId: props.sessionId,
            prompt: value,
            agent: typeof session?.agent === 'string' ? session.agent : undefined,
          });
        }}
      />
    </View>
  );
}
