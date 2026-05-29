'use client';

// ---------------------------------------------------------------------------
// Layer / facet definitions (kept client-side so we don't import Node modules)
// ---------------------------------------------------------------------------

export const STACK_LAYERS = [
  { key: 'layer:1-model', label: 'Model', position: 1, atlasKinds: ['ModelFamily', 'ModelVersion', 'SessionModel'], description: 'LLM model family and version' },
  { key: 'layer:2-provider', label: 'Provider', position: 2, atlasKinds: ['Provider', 'ModelProviderProduct', 'ModelProviderVersion'], description: 'Model API provider (Anthropic, OpenAI, Azure, etc.)' },
  { key: 'layer:3-transport', label: 'Transport', position: 3, atlasKinds: ['TransportProtocol', 'ModelTransportProtocol'], description: 'Communication protocol (stdio, HTTP, WebSocket)' },
  { key: 'layer:4-platform', label: 'Platform', position: 4, atlasKinds: ['AgentProduct', 'AgentRuntimeImpl', 'AgentPlatformImpl', 'AgentCoreImpl', 'Platform'], description: 'Agent platform target (agent-mux supported)' },
  { key: 'layer:5-tools', label: 'Tools', position: 5, atlasKinds: ['Tool', 'ToolDescriptor', 'ToolServer', 'MCPPrompt', 'MCPResource'], description: 'Tools, MCP servers, and tool descriptors', subcategories: { internal: { kinds: ['Tool', 'ToolDescriptor'], label: 'Internal Platform Tools' }, external: { kinds: ['ToolServer', 'MCPPrompt', 'MCPResource'], label: 'External Tools' } } },
  { key: 'layer:6-plugins', label: 'Plugins', position: 6, atlasKinds: ['PluginArtifact', 'Plugin', 'PluginCommand', 'PluginSkill', 'PluginHook'], description: 'Plugins, commands, skills, and hooks' },
];

export const COMPOSITION_FACETS = [
  { key: 'facet:agent-role', label: 'Agent Role', atlasKinds: ['Role', 'Responsibility', 'AgentTeam', 'OrgUnit'], description: 'Role-based identity for policies and permissions' },
  { key: 'facet:skills-and-capabilities', label: 'Skills and Capabilities', atlasKinds: ['Skill', 'LibrarySkill', 'SkillArea', 'Capability'], description: 'Reusable skills and capability bundles' },
];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

export const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.25rem' };
export const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)', fontSize: '0.875rem', boxSizing: 'border-box' };
export const textareaStyle = { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' };

export const sectionHeaderStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: 'pointer', padding: '0.625rem 0.75rem',
  borderRadius: '0.375rem', background: '#f8fafc',
  border: '1px solid #e2e8f0', userSelect: 'none',
};

export const sectionBodyStyle = { padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' };

export const cardStyle = {
  display: 'flex', flexDirection: 'column', gap: '0.25rem',
  padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', cursor: 'pointer',
  fontSize: '0.8125rem', transition: 'border-color 0.15s, background 0.15s',
};
export const cardSelectedStyle = { ...cardStyle, borderColor: '#2563eb', background: '#eff6ff' };

export const badgeStyle = {
  display: 'inline-block', fontSize: '0.6875rem', padding: '1px 6px',
  borderRadius: '9999px', background: '#e0e7ff', color: '#3730a3',
  fontWeight: 600, marginLeft: '0.375rem', verticalAlign: 'middle',
};

export const resultGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem',
};

export const subSectionHeaderStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  cursor: 'pointer', padding: '0.5rem 0.625rem',
  borderRadius: '0.25rem', background: '#f1f5f9',
  border: '1px solid #e2e8f0', userSelect: 'none',
  fontSize: '0.8125rem', marginBottom: '0.375rem',
};

export const memoryToggleStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
  border: '1px solid #e2e8f0', fontSize: '0.8125rem',
  transition: 'border-color 0.15s, background 0.15s',
};

export const memoryToggleSelectedStyle = {
  ...memoryToggleStyle, borderColor: '#7c3aed', background: '#f5f3ff',
};
