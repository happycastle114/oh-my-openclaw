/**
 * Defines the Oh-My-OpenClaw plugin's local agent configuration contracts
 * and the canonical list of built-in OMOC agent definitions.
 */
export type OmocAgentConfig = {
  id: string;
  name?: string;
  model?: string | { primary: string; fallbacks?: string[] };
  skills?: string[];
  identity?: { name?: string; theme?: string; emoji?: string };
  subagents?: {
    allowAgents?: string[];
    model?: string | { primary: string; fallbacks?: string[] };
  };
  tools?: {
    profile?: 'minimal' | 'coding' | 'messaging' | 'full';
    allow?: string[];
    deny?: string[];
  };
};

export const OMOC_AGENT_CONFIGS: OmocAgentConfig[] = [
  // Strategic planning agent.
  {
    id: 'omoc_prometheus',
    name: 'Prometheus',
    model: {
      primary: 'openai/gpt-5.3-codex',
      fallbacks: ['anthropic/claude-opus-4-6'],
    },
    identity: {
      name: 'Prometheus',
      emoji: '🔥',
      theme: 'Strategic Planner',
    },
    tools: { profile: 'full' },
    subagents: { allowAgents: ['*'] },
  },
  // Task orchestration coordinator (cheap/fast tier — lightweight orchestrator).
  {
    id: 'omoc_atlas',
    name: 'Atlas',
    model: {
      primary: 'anthropic/claude-sonnet-4-6',
      fallbacks: ['openai/gpt-4.1'],
    },
    identity: {
      name: 'Atlas',
      emoji: '🗺️',
      theme: 'Task Orchestrator',
    },
    tools: { profile: 'full' },
    subagents: { allowAgents: ['*'] },
  },
  // Primary implementation worker (opus-tier — high-quality output).
  {
    id: 'omoc_sisyphus',
    name: 'Sisyphus-Junior',
    model: {
      primary: 'anthropic/claude-opus-4-6',
      fallbacks: ['openai/gpt-5.3-codex'],
    },
    identity: {
      name: 'Sisyphus-Junior',
      emoji: '🪨',
      theme: 'Implementation Worker',
    },
    tools: { profile: 'full' },
    subagents: {
      allowAgents: ['omoc_explore', 'omoc_librarian', 'omoc_oracle'],
    },
  },
  // Deep implementation specialist.
  {
    id: 'omoc_hephaestus',
    name: 'Hephaestus',
    model: {
      primary: 'anthropic/claude-opus-4-6',
      fallbacks: ['openai/gpt-5.3-codex'],
    },
    identity: {
      name: 'Hephaestus',
      emoji: '🔨',
      theme: 'Deep Implementation',
    },
    tools: { profile: 'full' },
    subagents: {
      allowAgents: ['omoc_explore', 'omoc_librarian', 'omoc_oracle'],
    },
  },
  // Read-only architecture consultant.
  {
    id: 'omoc_oracle',
    name: 'Oracle',
    model: {
      primary: 'openai/gpt-5.3-codex',
      fallbacks: ['anthropic/claude-opus-4-6'],
    },
    identity: {
      name: 'Oracle',
      emoji: '🏛️',
      theme: 'Architecture Consultant',
    },
    tools: {
      profile: 'coding',
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Read-only codebase search specialist.
  {
    id: 'omoc_explore',
    name: 'Explore',
    model: 'anthropic/claude-sonnet-4-6',
    identity: {
      name: 'Explore',
      emoji: '🔍',
      theme: 'Codebase Search',
    },
    tools: {
      profile: 'coding',
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Read-only documentation research specialist.
  {
    id: 'omoc_librarian',
    name: 'Librarian',
    model: 'anthropic/claude-sonnet-4-6',
    identity: {
      name: 'Librarian',
      emoji: '📚',
      theme: 'Documentation Research',
    },
    tools: {
      profile: 'coding',
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Read-only pre-planning analyst.
  {
    id: 'omoc_metis',
    name: 'Metis',
    model: {
      primary: 'anthropic/claude-opus-4-6',
      fallbacks: ['openai/gpt-5.3-codex'],
    },
    identity: {
      name: 'Metis',
      emoji: '🧠',
      theme: 'Pre-Planning Analyst',
    },
    tools: {
      profile: 'coding',
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Read-only plan review specialist.
  {
    id: 'omoc_momus',
    name: 'Momus',
    model: {
      primary: 'anthropic/claude-opus-4-6',
      fallbacks: ['openai/gpt-5.3-codex'],
    },
    identity: {
      name: 'Momus',
      emoji: '🎭',
      theme: 'Plan Reviewer',
    },
    tools: {
      profile: 'coding',
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Multimodal visual analysis specialist (read-only — allowlist approach).
  {
    id: 'omoc_looker',
    name: 'Multimodal Looker',
    model: {
      primary: 'google/gemini-2.5-flash',
      fallbacks: ['anthropic/claude-sonnet-4-6'],
    },
    identity: {
      name: 'Multimodal Looker',
      emoji: '👁️',
      theme: 'Visual Analysis',
    },
    tools: {
      allow: ['read'],
      deny: ['write', 'edit', 'apply_patch', 'sessions_spawn'],
    },
  },
  // Frontend-focused visual engineering specialist.
  {
    id: 'omoc_frontend',
    name: 'Frontend',
    model: {
      primary: 'google/gemini-2.5-pro',
      fallbacks: ['anthropic/claude-sonnet-4-6'],
    },
    identity: {
      name: 'Frontend',
      emoji: '🎨',
      theme: 'Visual Engineering',
    },
    tools: { profile: 'coding' },
    subagents: { allowAgents: ['omoc_explore', 'omoc_librarian'] },
  },
];
