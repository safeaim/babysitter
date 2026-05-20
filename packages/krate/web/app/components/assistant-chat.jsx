'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const styles = {
  container: {
    display: 'flex', height: '100%', minHeight: 0, gap: 0,
    fontFamily: 'var(--sans, system-ui, sans-serif)', color: 'var(--text, #1b1611)',
  },
  sidebar: {
    width: 240, flexShrink: 0, borderRight: '1px solid var(--line, rgba(91,56,23,.28))',
    display: 'flex', flexDirection: 'column', background: 'var(--panel, rgba(255,251,244,.92))',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '12px 14px', borderBottom: '1px solid var(--line, rgba(91,56,23,.28))',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  sidebarTitle: { fontWeight: 700, fontSize: 13, color: 'var(--text, #1b1611)', margin: 0 },
  newBtn: {
    padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    background: 'var(--brass, #c98a3e)', color: '#fff', border: 'none', borderRadius: 4,
  },
  sessionList: { flex: 1, overflow: 'auto', padding: '4px 0' },
  sessionItem: (active) => ({
    display: 'block', padding: '8px 14px', cursor: 'pointer', fontSize: 12,
    background: active ? 'var(--card, rgba(91,56,23,.055))' : 'transparent',
    borderLeft: active ? '3px solid var(--brass, #c98a3e)' : '3px solid transparent',
    borderBottom: 'none', borderTop: 'none', borderRight: 'none',
    textAlign: 'left', width: '100%', color: 'var(--text, #1b1611)',
  }),
  sessionLabel: { fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 2 },
  sessionMeta: { fontSize: 11, color: 'var(--muted, #5a4e3c)', display: 'block' },
  sessionDelete: {
    fontSize: 10, color: 'var(--red, #c03a2b)', cursor: 'pointer', float: 'right',
    background: 'none', border: 'none', padding: '0 4px', fontWeight: 700,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  toolbar: {
    padding: '8px 16px', borderBottom: '1px solid var(--line, rgba(91,56,23,.28))',
    display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel, rgba(255,251,244,.92))',
  },
  stackLabel: { fontSize: 12, fontWeight: 600, color: 'var(--muted, #5a4e3c)' },
  stackSelect: {
    padding: '4px 8px', borderRadius: 4, border: '1px solid var(--line, rgba(91,56,23,.28))',
    fontSize: 12, background: 'var(--panel-strong, rgba(246,242,230,.98))', color: 'var(--text, #1b1611)',
  },
  messages: {
    flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12,
  },
  bubble: (isUser) => ({
    maxWidth: '80%', alignSelf: isUser ? 'flex-end' : 'flex-start',
    background: isUser ? 'var(--brass, #c98a3e)' : 'var(--card, rgba(91,56,23,.055))',
    color: isUser ? '#fff' : 'var(--text, #1b1611)',
    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    padding: '10px 14px', fontSize: 14, lineHeight: 1.5,
    wordBreak: 'break-word',
  }),
  codeBlock: {
    background: 'var(--ground-ink, #181624)', color: 'var(--glyph-bone, #f0e6d1)',
    padding: '10px 14px', borderRadius: 6, fontFamily: 'var(--mono, monospace)',
    fontSize: 12, overflow: 'auto', whiteSpace: 'pre-wrap', marginTop: 6,
    lineHeight: 1.55,
  },
  usage: { fontSize: 10, color: 'var(--muted, #5a4e3c)', marginTop: 4, textAlign: 'right' },
  inputRow: {
    padding: '12px 16px', borderTop: '1px solid var(--line, rgba(91,56,23,.28))',
    display: 'flex', gap: 8, alignItems: 'flex-end',
    background: 'var(--panel, rgba(255,251,244,.92))',
  },
  textarea: {
    flex: 1, resize: 'none', border: '1px solid var(--line, rgba(91,56,23,.28))',
    borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans, system-ui, sans-serif)',
    lineHeight: 1.4, background: 'var(--panel-strong, rgba(246,242,230,.98))', color: 'var(--text, #1b1611)',
    outline: 'none', minHeight: 42, maxHeight: 160,
  },
  sendBtn: (disabled) => ({
    padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--ink-ghost, #8c7e65)' : 'var(--brass, #c98a3e)', color: '#fff',
    border: 'none', borderRadius: 8, opacity: disabled ? 0.6 : 1, flexShrink: 0,
  }),
  empty: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--muted, #5a4e3c)', fontSize: 14, textAlign: 'center', padding: 32,
  },
  loading: {
    alignSelf: 'flex-start', fontSize: 13, color: 'var(--muted, #5a4e3c)', padding: '8px 14px',
    background: 'var(--card, rgba(91,56,23,.055))', borderRadius: 14, fontStyle: 'italic',
  },
  error: {
    background: '#fef2f2', border: '1px solid var(--red, #c03a2b)', borderRadius: 8,
    padding: '8px 14px', color: 'var(--red, #c03a2b)', fontSize: 13, margin: '0 16px',
  },
};

function renderMarkdown(text) {
  if (!text) return null;
  // Split by code fences
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf('\n');
      const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
      return <pre key={i} style={styles.codeBlock}>{code}</pre>;
    }
    // Inline code
    const segments = part.split(/(`[^`]+`)/g);
    return <span key={i}>{segments.map((seg, j) => {
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return <code key={j} style={{ background: 'rgba(91,56,23,.1)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--mono, monospace)', fontSize: '0.9em' }}>{seg.slice(1, -1)}</code>;
      }
      // Bold
      const boldParts = seg.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, k) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={`${j}-${k}`}>{bp.slice(2, -2)}</strong>;
        }
        return bp;
      });
    })}</span>;
  });
}

export function AssistantChat({ org, stacks = [] }) {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [selectedStack, setSelectedStack] = useState(stacks[0] || 'assistant');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [org]);

  async function fetchSessions() {
    try {
      const res = await fetch(`/api/orgs/${org}/assistant/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch { /* ignore */ }
  }

  async function selectSession(sessionId) {
    setActiveSessionId(sessionId);
    setError('');
    try {
      const res = await fetch(`/api/orgs/${org}/assistant/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.session?.messages || []);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function createNewSession() {
    setError('');
    try {
      const res = await fetch(`/api/orgs/${org}/assistant/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stackRef: selectedStack }),
      });
      if (res.ok) {
        const data = await res.json();
        const newSession = data.session;
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSession(sessionId) {
    try {
      await fetch(`/api/orgs/${org}/assistant/sessions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);
    setError('');

    // Optimistic user message
    const tempUserMsg = { id: `temp_${Date.now()}`, role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/orgs/${org}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, message: userMessage, stackRef: selectedStack }),
      });
      const data = await res.json();
      if (res.ok) {
        // If this was a new session, update the active session id
        if (!activeSessionId && data.sessionId) {
          setActiveSessionId(data.sessionId);
          fetchSessions();
        }
        if (data.response?.message) {
          setMessages((prev) => [...prev, data.response.message]);
        }
      } else {
        setError(data.message || 'Send failed');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const stackOptions = stacks.length ? stacks : ['assistant'];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Sessions</h3>
          <button onClick={createNewSession} style={styles.newBtn}>+ New</button>
        </div>
        <div style={styles.sessionList}>
          {sessions.length === 0 && (
            <div style={{ padding: '16px 14px', fontSize: 12, color: 'var(--muted, #5a4e3c)' }}>
              No sessions yet. Click &quot;+ New&quot; or start typing to begin.
            </div>
          )}
          {sessions.map((s) => (
            <button key={s.id} onClick={() => selectSession(s.id)} style={styles.sessionItem(s.id === activeSessionId)}>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} style={styles.sessionDelete} aria-label="Delete session" title="Delete session">x</button>
              <span style={styles.sessionLabel}>{s.stackRef || 'assistant'}</span>
              <span style={styles.sessionMeta}>{s.messageCount || 0} messages</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={styles.main}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <span style={styles.stackLabel}>Stack:</span>
          <select value={selectedStack} onChange={(e) => setSelectedStack(e.target.value)} style={styles.stackSelect} aria-label="Select agent stack">
            {stackOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeSessionId && (
            <span style={{ fontSize: 11, color: 'var(--muted, #5a4e3c)', marginLeft: 'auto' }}>Session: {activeSessionId.slice(0, 16)}...</span>
          )}
        </div>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.empty}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Krate Assistant</p>
                <p style={{ fontSize: 13 }}>Ask questions about your repositories, stacks, and infrastructure. Start typing below.</p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} style={styles.bubble(msg.role === 'user')}>
              {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
              {msg.usage && (
                <div style={styles.usage}>
                  {msg.usage.inputTokens && `In: ${msg.usage.inputTokens}`}
                  {msg.usage.outputTokens && ` Out: ${msg.usage.outputTokens}`}
                </div>
              )}
            </div>
          ))}
          {sending && <div style={styles.loading}>Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Input */}
        <div style={styles.inputRow}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            style={styles.textarea}
            rows={1}
            disabled={sending}
            aria-label="Chat message input"
          />
          <button onClick={handleSend} disabled={!input.trim() || sending} style={styles.sendBtn(!input.trim() || sending)}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
