/**
 * In-memory assistant runtime for krate chat sessions.
 *
 * Each session holds a message history and an optional stack reference.
 * The runtime delegates actual generation to the krate API controller's
 * agent dispatch pipeline when a controller is supplied, or falls back
 * to a simple echo / stub response for development.
 *
 * Sessions persist across Next.js hot reloads via globalThis.
 */

let idCounter = 1;

function generateId() {
  return `asst_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}

export function createAssistantRuntime() {
  // Each call returns a fresh facade but they all share the same sessions Map
  const sessions = getSessionStore();
  return {
    getSession(id) {
      return sessions.get(id) || null;
    },

    createSession(id, stackRef = 'assistant') {
      const sessionId = id || generateId();
      const session = {
        id: sessionId,
        stackRef,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessions.set(sessionId, session);
      return session;
    },

    listSessions() {
      return Array.from(sessions.values()).map((s) => ({
        id: s.id,
        stackRef: s.stackRef,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        lastMessage: s.messages.length ? s.messages[s.messages.length - 1] : null,
      }));
    },

    deleteSession(id) {
      return sessions.delete(id);
    },

    async chat(sessionId, userMessage, { controller } = {}) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session ${sessionId} not found`);

      const userEntry = {
        id: generateId(),
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      session.messages.push(userEntry);

      let assistantContent;
      let tokenUsage = null;
      try {
        if (controller && typeof controller.chatAssistant === 'function') {
          const result = await controller.chatAssistant({
            stackRef: session.stackRef,
            messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
          });
          assistantContent = result.content || result.message || result.text || String(result);
          tokenUsage = result.usage || null;
        } else if (controller && typeof controller.dispatchAgent === 'function') {
          // Fallback: use dispatch with a chat-oriented task
          const result = await controller.dispatchAgent({
            agentStack: session.stackRef,
            taskKind: 'chat',
            actor: 'assistant',
            prompt: userMessage,
          });
          assistantContent = result.response || result.output || result.content || JSON.stringify(result, null, 2);
          tokenUsage = result.usage || null;
        } else {
          // Dev-mode echo
          assistantContent = `I received your message: "${userMessage}"\n\nThe assistant runtime is running without a connected agent backend. Configure an agent stack to enable AI-powered responses.`;
        }
      } catch (err) {
        assistantContent = `Error processing request: ${err.message}`;
      }

      const assistantEntry = {
        id: generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        usage: tokenUsage,
      };
      session.messages.push(assistantEntry);
      session.updatedAt = new Date().toISOString();

      return { message: assistantEntry, usage: tokenUsage };
    },

    async generate(task, { controller, context, responseFormat, stackRef, outputType } = {}) {
      let content;
      let tokenUsage = null;
      try {
        if (controller && typeof controller.chatAssistant === 'function') {
          const systemPrompt = buildGeneratePrompt(task, context, outputType);
          const result = await controller.chatAssistant({
            stackRef: stackRef || 'assistant',
            messages: [{ role: 'user', content: systemPrompt }],
          });
          content = result.content || result.message || result.text || String(result);
          tokenUsage = result.usage || null;
        } else {
          content = generateStubContent(task, context, outputType);
        }
      } catch (err) {
        content = `Generation error: ${err.message}`;
      }

      const contentType = outputType === 'html' ? 'text/html' : outputType === 'json' ? 'application/json' : 'text/markdown';

      // For JSON output, attempt to parse
      if (outputType === 'json') {
        try {
          const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch) content = jsonMatch[1].trim();
          content = JSON.parse(content);
        } catch {
          // Keep as string if parsing fails
        }
      }

      return { content, contentType, usage: tokenUsage };
    },
  };
}

// ---------- Singleton session store (persists across Next.js hot reloads) ----------

function getSessionStore() {
  if (!globalThis.__krateAssistantSessions) {
    globalThis.__krateAssistantSessions = new Map();
  }
  return globalThis.__krateAssistantSessions;
}

// Use globalThis to persist across Next.js hot reloads
if (!globalThis.__krateAssistantRuntime) {
  globalThis.__krateAssistantRuntime = createAssistantRuntime();
}

/**
 * Returns the singleton assistant runtime instance.
 * Prefer this over createAssistantRuntime() in route handlers.
 */
export function getAssistantRuntime() {
  return globalThis.__krateAssistantRuntime;
}

function buildGeneratePrompt(task, context, outputType) {
  let prompt = `Task: ${task}\n`;
  if (context) prompt += `Context: ${JSON.stringify(context)}\n`;
  if (outputType === 'html') prompt += '\nRespond with a complete HTML document. Include inline styles for a polished appearance.';
  else if (outputType === 'json') prompt += '\nRespond with valid JSON only, wrapped in ```json``` code fences.';
  else if (outputType === 'jsx') prompt += '\nRespond with a React JSX component. Export a default function component.';
  else prompt += '\nRespond in Markdown format.';
  return prompt;
}

function generateStubContent(task, context, outputType) {
  if (outputType === 'html') {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Generated</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;color:#1b1611;background:#f6f2e6;}h1{border-bottom:2px solid #c98a3e;padding-bottom:.5rem;}pre{background:#181624;color:#f0e6d1;padding:1rem;border-radius:8px;overflow:auto;}</style>
</head><body><h1>Generated Content</h1><p>Task: ${escapeHtml(task)}</p>${context ? `<pre>${escapeHtml(JSON.stringify(context, null, 2))}</pre>` : ''}<p><em>Connect an agent backend to generate AI-powered content.</em></p></body></html>`;
  }
  if (outputType === 'json') {
    return JSON.stringify({ task, context: context || null, status: 'stub', note: 'Connect an agent backend for real generation.' }, null, 2);
  }
  return `# Generated Content\n\n**Task:** ${task}\n\n${context ? '```json\n' + JSON.stringify(context, null, 2) + '\n```\n\n' : ''}*Connect an agent backend to generate AI-powered content.*`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Artifact store for generated content served via /artifacts/:id
// Persists across Next.js hot reloads via globalThis
if (!globalThis.__krateArtifacts) {
  globalThis.__krateArtifacts = new Map();
}
const artifacts = globalThis.__krateArtifacts;

export function storeArtifact(content, contentType) {
  const id = generateId();
  artifacts.set(id, { content, contentType, createdAt: new Date().toISOString() });
  return id;
}

export function getArtifact(id) {
  return artifacts.get(id) || null;
}
