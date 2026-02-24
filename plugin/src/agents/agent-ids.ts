/**
 * Canonical source for all agent IDs and their metadata.
 * Single source of truth for agent identification across the plugin.
 */

/** Orchestrator-tier agents (strategic planning and task distribution) */
export const ORCHESTRATOR_IDS = new Set([
  'omoc_prometheus',
  'omoc_atlas',
]);

/** Worker-tier agents (implementation and execution) */
export const WORKER_IDS = new Set([
  'omoc_sisyphus',
  'omoc_hephaestus',
  'omoc_frontend',
]);

/** Maps agent ID to markdown persona filename (without extension) */
export const AGENT_MD_MAP: Record<string, string> = {
  omoc_atlas: 'atlas',
  omoc_prometheus: 'prometheus',
  omoc_sisyphus: 'sisyphus-junior',
  omoc_hephaestus: 'hephaestus',
  omoc_oracle: 'oracle',
  omoc_explore: 'explore',
  omoc_librarian: 'librarian',
  omoc_metis: 'metis',
  omoc_momus: 'momus',
  omoc_looker: 'multimodal-looker',
  omoc_frontend: 'frontend',
};

/** Maps agent ID to model tier for provider preset selection */
export const AGENT_TIER_MAP: Record<string, 'planning' | 'worker' | 'orchestrator' | 'lightweight' | 'visual'> = {
  omoc_prometheus: 'planning',
  omoc_oracle: 'planning',
  omoc_metis: 'planning',
  omoc_momus: 'planning',
  omoc_sisyphus: 'worker',
  omoc_hephaestus: 'worker',
  omoc_atlas: 'orchestrator',
  omoc_explore: 'lightweight',
  omoc_librarian: 'lightweight',
  omoc_looker: 'visual',
  omoc_frontend: 'visual',
};

/** All agent IDs (orchestrators + workers + read-only specialists) */
export const ALL_AGENT_IDS = [
  ...ORCHESTRATOR_IDS,
  ...WORKER_IDS,
  'omoc_oracle',
  'omoc_explore',
  'omoc_librarian',
  'omoc_metis',
  'omoc_momus',
  'omoc_looker',
];
