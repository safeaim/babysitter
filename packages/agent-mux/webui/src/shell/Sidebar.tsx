import React from 'react';
import { NavLink } from 'react-router-dom-v6';
import { cx } from '@a5c-ai/compendium';

const NAV_ITEMS = [
  { to: '/projects', label: 'Projects' },
  { to: '/runs', label: 'Runs' },
  { to: '/agents', label: 'Agents' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/sessions/new', label: 'New session' },
  { to: '/workspaces', label: 'Workspaces' },
  { to: '/inbox', label: 'Hook inbox' },
  { to: '/automations', label: 'Automations' },
  { to: '/pair-device', label: 'Pair device' },
  { to: '/settings', label: 'Settings' },
];

export function Sidebar(): JSX.Element {
  return (
    <aside className="tkc-panel" style={{ width: 240, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8, borderRight: '1px solid var(--tkc-rule)', flexShrink: 0 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--tkc-ink-soft)', margin: '0 0 4px 8px' }}>agent-mux</p>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cx('tkc-tree__node', isActive && 'tkc-tree__node--selected')}
            style={{ textDecoration: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.875rem' }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
