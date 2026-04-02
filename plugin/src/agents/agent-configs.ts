/**
 * Defines the Oh-My-OpenClaw plugin's local agent configuration contracts
 * and the canonical list of built-in OMOC agent definitions.
 * 
 * Model configuration is loaded from config/agent-models.json at runtime.
 * Edit that file to change models - no rebuild required!
 */
import { READ_ONLY_DENY } from '../constants.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is .../plugin/dist/agents/, so go up twice to reach plugin/
const PLUGIN_ROOT = join(__dirname, '..', '..');

interface AgentModelConfig {
  primary: string;
  fallbacks?: string[];
}

interface AgentModelsFile {
  description: string;
  agents: Record<string, AgentModelConfig>;
}

/**
 * Load agent model configuration from config/agent-models.json
 * Cached at module load time for performance.
 */
function loadAgentModels(): AgentModelsFile {
  try {
    const configPath = join(PLUGIN_ROOT, 'config', 'agent-models.json');
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as AgentModelsFile;
  } catch (error) {
    console.warn('[omoc] Failed to load agent-models.json, using defaults:', error);
    return {
      description: 'Default agent models',
      agents: {},
    };
  }
}

const agentModels = loadAgentModels();

/**
 * Get model configuration for an agent from runtime config.
 * Falls back to bailian/qwen3.5-plus if not configured.
 */
function getModelForAgent(agentId: string): string | { primary: string; fallbacks?: string[] } {
  const config = agentModels.agents[agentId];
  if (!config) {
    return 'bailian/qwen3.5-plus';
  }
  return config.fallbacks ? config : config.primary;
}

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
  // Strategic planning agent - needs best reasoning for complex planning.
  {
    id: 'omoc_prometheus',
    name: 'Prometheus',
    model: getModelForAgent('omoc_prometheus'),
    identity: {
      name: 'Prometheus',
      emoji: '🔥',
      theme: 'Strategic Planner',
    },
    tools: { profile: 'full' },
    subagents: { allowAgents: ['*'] },
  },
  // Task orchestration coordinator - balanced speed/quality for coordination.
  {
    id: 'omoc_atlas',
    name: 'Atlas',
    model: getModelForAgent('omoc_atlas'),
    identity: {
      name: 'Atlas',
      emoji: '🗺️',
      theme: 'Task Orchestrator',
    },
    tools: { profile: 'full' },
    subagents: { allowAgents: ['*'] },
  },
  // Primary implementation worker - needs best coding model.
  {
    id: 'omoc_sisyphus',
    name: 'Sisyphus-Junior',
    model: getModelForAgent('omoc_sisyphus'),
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
  // Deep implementation specialist - complex coding tasks.
  {
    id: 'omoc_hephaestus',
    name: 'Hephaestus',
    model: getModelForAgent('omoc_hephaestus'),
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
  // Read-only architecture consultant - reasoning for architecture decisions.
  {
    id: 'omoc_oracle',
    name: 'Oracle',
    model: getModelForAgent('omoc_oracle'),
    identity: {
      name: 'Oracle',
      emoji: '🏛️',
      theme: 'Architecture Consultant',
    },
    tools: {
      profile: 'coding',
      deny: READ_ONLY_DENY,
    },
  },
  // Read-only codebase search specialist - fast search with good context.
  {
    id: 'omoc_explore',
    name: 'Explore',
    model: getModelForAgent('omoc_explore'),
    identity: {
      name: 'Explore',
      emoji: '🔍',
      theme: 'Codebase Search',
    },
    tools: {
      profile: 'coding',
      deny: READ_ONLY_DENY,
    },
  },
  // Read-only documentation research specialist - large context for docs.
  {
    id: 'omoc_librarian',
    name: 'Librarian',
    model: getModelForAgent('omoc_librarian'),
    identity: {
      name: 'Librarian',
      emoji: '📚',
      theme: 'Documentation Research',
    },
    tools: {
      profile: 'coding',
      deny: READ_ONLY_DENY,
    },
  },
  // Read-only pre-planning analyst - analysis before planning.
  {
    id: 'omoc_metis',
    name: 'Metis',
    model: getModelForAgent('omoc_metis'),
    identity: {
      name: 'Metis',
      emoji: '🧠',
      theme: 'Pre-Planning Analyst',
    },
    tools: {
      profile: 'coding',
      deny: READ_ONLY_DENY,
    },
  },
  // Read-only plan review specialist - critical review needs reasoning.
  {
    id: 'omoc_momus',
    name: 'Momus',
    model: getModelForAgent('omoc_momus'),
    identity: {
      name: 'Momus',
      emoji: '🎭',
      theme: 'Plan Reviewer',
    },
    tools: {
      profile: 'coding',
      deny: READ_ONLY_DENY,
    },
  },
  // Multimodal visual analysis specialist - needs image support.
  {
    id: 'omoc_looker',
    name: 'Multimodal Looker',
    model: getModelForAgent('omoc_looker'),
    identity: {
      name: 'Multimodal Looker',
      emoji: '👁️',
      theme: 'Visual Analysis',
    },
    tools: {
      allow: ['read'],
      deny: READ_ONLY_DENY,
    },
  },
  // Frontend-focused visual engineering specialist - visual + coding.
  {
    id: 'omoc_frontend',
    name: 'Frontend',
    model: getModelForAgent('omoc_frontend'),
    identity: {
      name: 'Frontend',
      emoji: '🎨',
      theme: 'Visual Engineering',
    },
    tools: { profile: 'coding' },
    subagents: { allowAgents: ['omoc_explore', 'omoc_librarian'] },
  },
];
