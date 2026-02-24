import { AGENT_TIER_MAP } from '../agents/agent-ids.js';

export type ModelTier = 'planning' | 'worker' | 'orchestrator' | 'lightweight' | 'visual';

export type ModelConfig = {
  primary: string;
  fallbacks: string[];
};

export type ProviderPreset = Record<ModelTier, ModelConfig>;

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  anthropic: {
    planning: { primary: 'anthropic/claude-opus-4-6', fallbacks: ['openai/gpt-5.3-codex'] },
    worker: { primary: 'anthropic/claude-opus-4-6', fallbacks: ['openai/gpt-5.3-codex'] },
    orchestrator: { primary: 'anthropic/claude-sonnet-4-6', fallbacks: ['openai/gpt-4.1'] },
    lightweight: { primary: 'anthropic/claude-sonnet-4-6', fallbacks: [] },
    visual: { primary: 'google/gemini-2.5-pro', fallbacks: ['anthropic/claude-sonnet-4-6'] },
  },
  openai: {
    planning: { primary: 'openai/gpt-5.3-codex', fallbacks: ['anthropic/claude-opus-4-6'] },
    worker: { primary: 'openai/gpt-5.3-codex', fallbacks: ['anthropic/claude-opus-4-6'] },
    orchestrator: { primary: 'openai/gpt-4.1', fallbacks: ['anthropic/claude-sonnet-4-6'] },
    lightweight: { primary: 'openai/gpt-4.1-mini', fallbacks: [] },
    visual: { primary: 'google/gemini-2.5-pro', fallbacks: ['openai/gpt-4.1'] },
  },
  google: {
    planning: { primary: 'google/gemini-3.1-pro', fallbacks: ['anthropic/claude-opus-4-6'] },
    worker: { primary: 'google/gemini-3.1-pro', fallbacks: ['anthropic/claude-opus-4-6'] },
    orchestrator: { primary: 'google/gemini-3-flash', fallbacks: ['anthropic/claude-sonnet-4-6'] },
    lightweight: { primary: 'google/gemini-3-flash', fallbacks: [] },
    visual: { primary: 'google/gemini-2.5-pro', fallbacks: ['google/gemini-3-flash'] },
  },
};

export { AGENT_TIER_MAP };

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  google: 'Google (Gemini)',
  custom: 'Custom (enter model IDs manually)',
};

export const MODEL_TIERS: ModelTier[] = ['planning', 'worker', 'orchestrator', 'lightweight', 'visual'];

export function buildCustomPreset(tierModels: Record<ModelTier, string>): ProviderPreset {
  const preset: Partial<ProviderPreset> = {};
  for (const tier of MODEL_TIERS) {
    preset[tier] = { primary: tierModels[tier], fallbacks: [] };
  }
  return preset as ProviderPreset;
}

export function registerCustomPreset(name: string, preset: ProviderPreset): void {
  PROVIDER_PRESETS[name] = preset;
  if (!PROVIDER_LABELS[name]) {
    PROVIDER_LABELS[name] = name;
  }
}

export function getProviderNames(): string[] {
  return Object.keys(PROVIDER_PRESETS);
}

export function applyProviderPreset(
  agentId: string,
  provider: string,
): { primary: string; fallbacks?: string[] } | undefined {
  const preset = PROVIDER_PRESETS[provider];
  if (!preset) return undefined;

  const tier = AGENT_TIER_MAP[agentId];
  if (!tier) return undefined;

  const config = preset[tier];
  return {
    primary: config.primary,
    fallbacks: config.fallbacks.length > 0 ? config.fallbacks : undefined,
  };
}
