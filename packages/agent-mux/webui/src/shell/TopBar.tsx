import React from 'react';
import { useConnection } from '@a5c-ai/agent-mux-ui';
import { Button } from '@a5c-ai/compendium';
import { titleForPath } from './navigation.js';

export function TopBar(props: { pathname: string; onOpenPalette(): void }): JSX.Element {
  const connection = useConnection();
  return (
    <header className="app-topbar">
      <h2>{titleForPath(props.pathname)}</h2>
      <div className="app-topbar__actions">
        <span className={`connection-pill connection-${connection.status}`}>{connection.status}</span>
        <Button type="button" size="sm" onClick={props.onOpenPalette}>
          Command palette
        </Button>
      </div>
    </header>
  );
}
