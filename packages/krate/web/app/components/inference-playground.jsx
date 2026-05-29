'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ───────────── keyframes ───────────── */
const KEYFRAMES_ID = '__krate-playground-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes krate-pg-spin {
      to { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .pg-grid { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ───────────── simple markdown renderer ───────────── */
function renderMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const nl = inner.indexOf('\n');
      const lang = nl >= 0 ? inner.slice(0, nl).trim() : '';
      const code = nl >= 0 ? inner.slice(nl + 1) : inner;
      return (
        <div key={i} style={{ marginTop: 8, marginBottom: 4 }}>
          {lang && <div style={s.codeHeader}>{lang}</div>}
          <pre style={{ ...s.codeBlock, ...(lang ? { borderRadius: '0 0 6px 6px', marginTop: 0 } : {}) }}>{code}</pre>
        </div>
      );
    }
    const lines = part.split('\n');
    const elems = [];
    let listItems = [];
    let listType = null;
    function flushList() {
      if (!listItems.length) return;
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elems.push(<Tag key={`l-${elems.length}`} style={{ margin: '6px 0', paddingLeft: 20 }}>{listItems.map((li, j) => <li key={j}>{renderInline(li)}</li>)}</Tag>);
      listItems = [];
      listType = null;
    }
    for (const line of lines) {
      const ul = line.match(/^\s*[-*]\s+(.*)/);
      if (ul) { if (listType === 'ol') flushList(); listType = 'ul'; listItems.push(ul[1]); continue; }
      const ol = line.match(/^\s*\d+\.\s+(.*)/);
      if (ol) { if (listType === 'ul') flushList(); listType = 'ol'; listItems.push(ol[1]); continue; }
      flushList();
      const hm = line.match(/^(#{1,4})\s+(.*)/);
      if (hm) { const sz = { 1: 18, 2: 16, 3: 14, 4: 13 }; elems.push(<div key={`h-${elems.length}`} style={{ fontWeight: 700, fontSize: sz[hm[1].length] || 14, marginTop: 10, marginBottom: 4 }}>{renderInline(hm[2])}</div>); continue; }
      if (line.trim()) elems.push(<div key={`p-${elems.length}`} style={{ marginBottom: 4 }}>{renderInline(line)}</div>);
    }
    flushList();
    return <span key={i}>{elems}</span>;
  });
}

function renderInline(text) {
  if (!text) return null;
  const segs = text.split(/(`[^`]+`)/g);
  return segs.map((seg, j) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return <code key={j} style={s.inlineCode}>{seg.slice(1, -1)}</code>;
    }
    let r = seg.replace(/\*\*\*([^*]+)\*\*\*/g, '<<<BI:$1>>>');
    r = r.replace(/\*\*([^*]+)\*\*/g, '<<<B:$1>>>');
    r = r.replace(/\*([^*]+)\*/g, '<<<I:$1>>>');
    const tokens = r.split(/(<<<(?:BI|B|I):[^>]+>>>)/g);
    return tokens.map((tok, k) => {
      const bi = tok.match(/<<<BI:(.+)>>>/); if (bi) return <strong key={`${j}-${k}`}><em>{bi[1]}</em></strong>;
      const b = tok.match(/<<<B:(.+)>>>/); if (b) return <strong key={`${j}-${k}`}>{b[1]}</strong>;
      const im = tok.match(/<<<I:(.+)>>>/); if (im) return <em key={`${j}-${k}`}>{im[1]}</em>;
      return tok;
    });
  });
}

/* ───────────── styles ───────────── */
const s = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  controls: {
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8,
  },
  promptArea: {
    width: '100%', minHeight: 80, resize: 'vertical', border: '1px solid var(--border)',
    borderRadius: 6, padding: '0.75rem', fontSize: 14, fontFamily: 'var(--sans, system-ui, sans-serif)',
    background: 'var(--bg)', color: 'var(--text)', outline: 'none', lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  systemToggle: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
    color: 'var(--text-muted)', textAlign: 'left', padding: '4px 0', fontWeight: 600,
  },
  systemArea: {
    width: '100%', minHeight: 60, resize: 'vertical', border: '1px solid var(--border)',
    borderRadius: 6, padding: '0.75rem', fontSize: 13, fontFamily: 'var(--sans, system-ui, sans-serif)',
    background: 'var(--bg)', color: 'var(--text)', outline: 'none', lineHeight: 1.4,
    boxSizing: 'border-box',
  },
  paramRow: {
    display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap',
  },
  paramGroup: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13,
  },
  paramLabel: { color: 'var(--text-muted)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  slider: { width: 120, accentColor: 'var(--accent)' },
  paramValue: { fontSize: 12, color: 'var(--text)', fontFamily: 'var(--mono, monospace)', minWidth: 36 },
  sendBtn: (disabled) => ({
    padding: '0.6rem 1.5rem', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--text-faint)' : 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 6, opacity: disabled ? 0.6 : 1, alignSelf: 'flex-start',
  }),
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
  },
  panel: (isLeft) => ({
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    padding: '1rem', border: '1px solid var(--border)', borderRadius: 8,
    background: isLeft ? 'var(--surface)' : 'var(--bg)',
    minHeight: 200,
  }),
  modelSelect: {
    padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
    fontSize: 13, background: 'var(--bg)', color: 'var(--text)', width: '100%',
  },
  responseArea: {
    flex: 1, minHeight: 120, padding: '0.75rem', borderRadius: 6,
    border: '1px solid var(--border)', background: 'var(--bg)',
    overflow: 'auto', fontSize: 14, lineHeight: 1.6, color: 'var(--text)',
  },
  spinner: {
    display: 'inline-block', width: 18, height: 18, border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)', borderRadius: '50%',
    animation: 'krate-pg-spin 0.8s linear infinite',
  },
  metricsBar: {
    display: 'flex', gap: '1rem', fontSize: 12, color: 'var(--text-muted)',
    padding: '6px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  metricItem: { display: 'flex', gap: '0.25rem', alignItems: 'center' },
  metricLabel: { fontWeight: 600 },
  ratingRow: {
    display: 'flex', gap: '0.5rem', alignItems: 'center',
  },
  ratingBtn: (active) => ({
    background: active ? 'var(--accent)' : 'var(--surface-overlay)',
    color: active ? '#fff' : 'var(--text-muted)',
    border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, transition: 'background 0.15s',
  }),
  emptyResponse: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: 'var(--text-muted)', fontSize: 13,
  },
  codeBlock: {
    background: 'var(--bg-code, #1e1e2e)', color: 'var(--text)',
    padding: '12px 14px', borderRadius: 6, fontFamily: 'var(--mono, monospace)',
    fontSize: 12.5, overflow: 'auto', whiteSpace: 'pre', lineHeight: 1.6,
  },
  codeHeader: {
    padding: '4px 12px', background: 'var(--bg-code, #1e1e2e)', borderRadius: '6px 6px 0 0',
    fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono, monospace)',
    borderBottom: '1px solid var(--border)',
  },
  inlineCode: {
    background: 'var(--surface-overlay)', padding: '1px 5px', borderRadius: 3,
    fontFamily: 'var(--mono, monospace)', fontSize: '0.88em',
  },
  historySection: {
    border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
  },
  historyToggle: {
    width: '100%', padding: '0.75rem 1rem', background: 'var(--surface)',
    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'left',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  historyList: {
    maxHeight: 300, overflow: 'auto',
  },
  historyItem: {
    padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)',
    fontSize: 12, color: 'var(--text-secondary)',
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center',
  },
  historyHeader: {
    padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)',
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.5rem',
    background: 'var(--surface)',
  },
  promptExcerpt: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};

/* ───────────── component ───────────── */
export function InferencePlayground({ org }) {
  const [models, setModels] = useState([]);
  const [leftModel, setLeftModel] = useState('');
  const [rightModel, setRightModel] = useState('');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(1);
  const [leftState, setLeftState] = useState({ loading: false, response: null, elapsed: null, usage: null, error: null });
  const [rightState, setRightState] = useState({ loading: false, response: null, elapsed: null, usage: null, error: null });
  const [leftRating, setLeftRating] = useState(null);
  const [rightRating, setRightRating] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const promptRef = useRef(null);

  useEffect(() => { ensureKeyframes(); }, []);

  // Fetch model catalog
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/orgs/${org}/inference/catalog`);
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.models || []).map((m) => m.name).filter(Boolean);
        if (!cancelled && list.length) {
          setModels(list);
          setLeftModel((prev) => prev || list[0]);
          setRightModel((prev) => prev || (list[1] || list[0]));
        }
      } catch { /* ignore */ }
    }
    load();
    return () => { cancelled = true; };
  }, [org]);

  const sending = leftState.loading || rightState.loading;

  const handleSend = useCallback(async () => {
    if (!prompt.trim() || sending) return;
    const userPrompt = prompt.trim();

    // Reset ratings
    setLeftRating(null);
    setRightRating(null);

    // Start both panels
    setLeftState({ loading: true, response: null, elapsed: null, usage: null, error: null });
    setRightState({ loading: true, response: null, elapsed: null, usage: null, error: null });

    async function callModel(model, setState) {
      const start = performance.now();
      try {
        const body = { message: userPrompt, stackRef: model };
        if (systemPrompt.trim()) body.systemPrompt = systemPrompt.trim();
        const res = await fetch(`/api/orgs/${org}/assistant/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const elapsed = Math.round(performance.now() - start);
        const data = await res.json();
        if (res.ok) {
          const msg = data.response?.message;
          const usage = msg?.usage || data.response?.usage || null;
          setState({ loading: false, response: msg?.content || JSON.stringify(data.response), elapsed, usage, error: null });
          return { elapsed, usage };
        } else {
          setState({ loading: false, response: null, elapsed, usage: null, error: data.message || 'Request failed' });
          return { elapsed, usage: null };
        }
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        setState({ loading: false, response: null, elapsed, usage: null, error: err.message || 'Network error' });
        return { elapsed, usage: null };
      }
    }

    const [leftResult, rightResult] = await Promise.all([
      callModel(leftModel, setLeftState),
      callModel(rightModel, setRightState),
    ]);

    // Add to history (keep last 10)
    setHistory((prev) => {
      const entry = {
        id: Date.now(),
        prompt: userPrompt.length > 80 ? userPrompt.slice(0, 80) + '...' : userPrompt,
        leftModel,
        rightModel,
        leftLatency: leftResult.elapsed,
        rightLatency: rightResult.elapsed,
      };
      return [entry, ...prev].slice(0, 10);
    });
  }, [prompt, systemPrompt, leftModel, rightModel, org, sending]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTokens(usage) {
    if (!usage) return '--';
    const inp = usage.input_tokens ?? usage.inputTokens ?? 0;
    const out = usage.output_tokens ?? usage.outputTokens ?? 0;
    return `${inp} in / ${out} out`;
  }

  function estimateCost(usage) {
    if (!usage) return '--';
    const inp = usage.input_tokens ?? usage.inputTokens ?? 0;
    const out = usage.output_tokens ?? usage.outputTokens ?? 0;
    // Rough estimate: $3/M input, $15/M output (generic mid-tier pricing)
    const cost = (inp * 3 + out * 15) / 1_000_000;
    return cost < 0.001 ? '<$0.001' : `~$${cost.toFixed(4)}`;
  }

  return (
    <div style={s.wrapper}>
      {/* Shared controls */}
      <div style={s.controls}>
        <textarea
          ref={promptRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt... (Ctrl+Enter to send)"
          style={s.promptArea}
          aria-label="Prompt input"
        />
        <div>
          <button
            onClick={() => setShowSystem(!showSystem)}
            style={s.systemToggle}
            aria-expanded={showSystem}
          >
            {showSystem ? 'Hide' : 'Show'} system prompt
          </button>
          {showSystem && (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Optional system prompt..."
              style={s.systemArea}
              aria-label="System prompt input"
            />
          )}
        </div>
        <div style={s.paramRow}>
          <div style={s.paramGroup}>
            <span style={s.paramLabel}>Max tokens</span>
            <input
              type="range" min={256} max={8192} step={256} value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              style={s.slider}
              aria-label="Max tokens"
            />
            <span style={s.paramValue}>{maxTokens}</span>
          </div>
          <div style={s.paramGroup}>
            <span style={s.paramLabel}>Temperature</span>
            <input
              type="range" min={0} max={2} step={0.1} value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              style={s.slider}
              aria-label="Temperature"
            />
            <span style={s.paramValue}>{temperature.toFixed(1)}</span>
          </div>
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || sending}
            style={s.sendBtn(!prompt.trim() || sending)}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Side-by-side panels */}
      <div style={s.grid} className="pg-grid">
        {/* Left panel */}
        <div style={s.panel(true)}>
          <select
            value={leftModel}
            onChange={(e) => setLeftModel(e.target.value)}
            style={s.modelSelect}
            aria-label="Left panel model selector"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div style={s.responseArea}>
            {leftState.loading ? (
              <div style={s.emptyResponse}><div style={s.spinner} /></div>
            ) : leftState.error ? (
              <div style={{ color: 'var(--danger, #ef4444)', fontSize: 13 }}>{leftState.error}</div>
            ) : leftState.response ? (
              renderMarkdown(leftState.response)
            ) : (
              <div style={s.emptyResponse}>Response will appear here</div>
            )}
          </div>
          {(leftState.elapsed != null || leftState.usage) && (
            <div style={s.metricsBar}>
              <div style={s.metricItem}><span style={s.metricLabel}>Latency:</span> {leftState.elapsed}ms</div>
              <div style={s.metricItem}><span style={s.metricLabel}>Tokens:</span> {formatTokens(leftState.usage)}</div>
              <div style={s.metricItem}><span style={s.metricLabel}>Cost:</span> {estimateCost(leftState.usage)}</div>
            </div>
          )}
          <div style={s.ratingRow}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Rate:</span>
            <button
              onClick={() => setLeftRating(leftRating === 'up' ? null : 'up')}
              style={s.ratingBtn(leftRating === 'up')}
              aria-label="Thumbs up for left panel"
              title="Thumbs up"
            >
              +1
            </button>
            <button
              onClick={() => setLeftRating(leftRating === 'down' ? null : 'down')}
              style={s.ratingBtn(leftRating === 'down')}
              aria-label="Thumbs down for left panel"
              title="Thumbs down"
            >
              -1
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div style={s.panel(false)}>
          <select
            value={rightModel}
            onChange={(e) => setRightModel(e.target.value)}
            style={s.modelSelect}
            aria-label="Right panel model selector"
          >
            {models.length === 0 && <option value="">Loading models...</option>}
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div style={s.responseArea}>
            {rightState.loading ? (
              <div style={s.emptyResponse}><div style={s.spinner} /></div>
            ) : rightState.error ? (
              <div style={{ color: 'var(--danger, #ef4444)', fontSize: 13 }}>{rightState.error}</div>
            ) : rightState.response ? (
              renderMarkdown(rightState.response)
            ) : (
              <div style={s.emptyResponse}>Response will appear here</div>
            )}
          </div>
          {(rightState.elapsed != null || rightState.usage) && (
            <div style={s.metricsBar}>
              <div style={s.metricItem}><span style={s.metricLabel}>Latency:</span> {rightState.elapsed}ms</div>
              <div style={s.metricItem}><span style={s.metricLabel}>Tokens:</span> {formatTokens(rightState.usage)}</div>
              <div style={s.metricItem}><span style={s.metricLabel}>Cost:</span> {estimateCost(rightState.usage)}</div>
            </div>
          )}
          <div style={s.ratingRow}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Rate:</span>
            <button
              onClick={() => setRightRating(rightRating === 'up' ? null : 'up')}
              style={s.ratingBtn(rightRating === 'up')}
              aria-label="Thumbs up for right panel"
              title="Thumbs up"
            >
              +1
            </button>
            <button
              onClick={() => setRightRating(rightRating === 'down' ? null : 'down')}
              style={s.ratingBtn(rightRating === 'down')}
              aria-label="Thumbs down for right panel"
              title="Thumbs down"
            >
              -1
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={s.historySection}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            style={s.historyToggle}
            aria-expanded={historyOpen}
          >
            <span>Comparison history ({history.length})</span>
            <span>{historyOpen ? 'Collapse' : 'Expand'}</span>
          </button>
          {historyOpen && (
            <div style={s.historyList}>
              <div style={s.historyHeader}>
                <span>Prompt</span>
                <span>Left model</span>
                <span>Right model</span>
                <span>Latency</span>
              </div>
              {history.map((entry) => (
                <div key={entry.id} style={s.historyItem}>
                  <span style={s.promptExcerpt} title={entry.prompt}>{entry.prompt}</span>
                  <span>{entry.leftModel}</span>
                  <span>{entry.rightModel}</span>
                  <span>{entry.leftLatency}ms / {entry.rightLatency}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
