import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useRun } from '@a5c-ai/agent-mux-ui';

export function SessionPendingPage(): JSX.Element {
  const params = useParams<{ runId: string }>();
  const runId = params.runId ?? '';
  const run = useRun(runId);

  if (typeof run?.sessionId === 'string' && run.sessionId.length > 0) {
    return <Navigate to={`/sessions/${run.sessionId}`} replace />;
  }

  return (
    <section className="panel">
      <header>
        <div>
          <p className="eyebrow">Creating Session</p>
          <h2>{runId || 'pending session'}</h2>
        </div>
      </header>
      <p className="lede">
        The session bootstrap is still waiting for the harness to emit its real session id. This page
        will redirect into the live session as soon as the gateway sees it.
      </p>
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Agent</span>
          <strong>{String(run?.agent ?? 'unknown')}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">State</span>
          <strong>{String(run?.status ?? 'starting')}</strong>
        </div>
      </div>
      <div className="actions">
        <Link className="ghost-link" to="/sessions">
          Back to sessions
        </Link>
      </div>
    </section>
  );
}
