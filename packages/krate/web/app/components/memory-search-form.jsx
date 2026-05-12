'use client';
import { useState } from 'react';

const MODES = [
  { value: 'graph-only', label: 'Graph only', description: 'Structured records by node kind' },
  { value: 'grep-only', label: 'Grep only', description: 'Full-text across documents' },
  { value: 'graph-and-grep', label: 'Graph + Grep', description: 'Graph narrows candidates, grep searches' },
];

export function MemorySearchForm({ org }) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('graph-and-grep');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | searching | done | error
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('searching');
    setError('');
    setResults(null);
    try {
      const res = await fetch('/api/orgs/' + org + '/agents/memory/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), mode }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data);
        setStatus('done');
      } else {
        setError(data.message || data.error || 'Search failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  const graphMatches = results?.graphMatches || results?.graph?.matches || [];
  const grepExcerpts = results?.grepExcerpts || results?.grep?.excerpts || [];
  const totalCount = graphMatches.length + grepExcerpts.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Query</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search agent memory..."
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>Search mode</label>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {MODES.map(m => (
              <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="searchMode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={status === 'searching' || !query.trim()}
          style={{ alignSelf: 'flex-start', padding: '0.5rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: status === 'searching' ? 'not-allowed' : 'pointer', opacity: status === 'searching' ? 0.7 : 1 }}
        >
          {status === 'searching' ? 'Searching...' : 'Search'}
        </button>
      </form>

      {status === 'error' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.375rem', padding: '0.75rem', color: '#dc2626', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {status === 'done' && totalCount === 0 && (
        <div style={{ color: '#6b7280', fontSize: '0.875rem', padding: '1rem', textAlign: 'center', background: '#f9fafb', borderRadius: '0.375rem' }}>
          No matches found for &quot;{query}&quot;
        </div>
      )}

      {status === 'done' && totalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
            Found {totalCount} result{totalCount !== 1 ? 's' : ''} — {graphMatches.length} graph record{graphMatches.length !== 1 ? 's' : ''}, {grepExcerpts.length} excerpt{grepExcerpts.length !== 1 ? 's' : ''}
          </div>

          {graphMatches.length > 0 && (
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#374151' }}>Graph matches</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {graphMatches.map((match, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
                      {match.nodeKind || match.kind || 'node'}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>{match.id || match.name || 'unknown'}</span>
                    {(match.score !== undefined) && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>score: {typeof match.score === 'number' ? match.score.toFixed(3) : match.score}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {grepExcerpts.length > 0 && (
            <div>
              <h4 style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem', color: '#374151' }}>Text excerpts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {grepExcerpts.map((excerpt, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <span style={{ fontWeight: 500 }}>{excerpt.path || excerpt.file || 'unknown'}</span>
                      {excerpt.lineNumber !== undefined && <span>line {excerpt.lineNumber}</span>}
                    </div>
                    <pre style={{ margin: 0, fontSize: '0.8125rem', fontFamily: 'monospace', background: '#1e1e2e', color: '#cdd6f4', padding: '0.5rem', borderRadius: '0.25rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {excerpt.line || excerpt.text || excerpt.content || ''}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
