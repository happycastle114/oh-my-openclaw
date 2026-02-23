import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { OMOC_AGENT_CONFIGS } from './agent-configs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From dist/agents/ → plugin root is ../../ (same pattern as workflow-commands.ts)
const PLUGIN_ROOT = join(__dirname, '..', '..');

const AGENT_MD_MAP: Record<string, string> = {
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

const SHORT_ID_MAP: Record<string, string> = {};
for (const id of Object.keys(AGENT_MD_MAP)) {
  SHORT_ID_MAP[id.replace('omoc_', '')] = id;
}

/**
 * Resolve user input ("omoc_atlas", "atlas", or "Atlas") to a canonical agent config ID.
 */
export function resolvePersonaId(input: string): string | null {
  const lower = input.toLowerCase().trim();

  if (AGENT_MD_MAP[lower]) return lower;
  if (SHORT_ID_MAP[lower]) return SHORT_ID_MAP[lower];

  const byName = OMOC_AGENT_CONFIGS.find(
    (a) => a.name?.toLowerCase() === lower || a.identity?.name?.toLowerCase() === lower
  );
  return byName?.id ?? null;
}

export function readPersonaPromptSync(agentId: string): string {
  const mdName = AGENT_MD_MAP[agentId];
  if (!mdName) {
    return `[OmOC] Unknown persona: ${agentId}`;
  }

  const agentPath = join(PLUGIN_ROOT, '..', 'agents', `${mdName}.md`);
  try {
    return readFileSync(agentPath, 'utf-8');
  } catch {
    return `[OmOC] Could not read persona file: agents/${mdName}.md (looked in ${agentPath})`;
  }
}

export async function readPersonaPrompt(agentId: string): Promise<string> {
  const mdName = AGENT_MD_MAP[agentId];
  if (!mdName) {
    return `[OmOC] Unknown persona: ${agentId}`;
  }

  const agentPath = join(PLUGIN_ROOT, '..', 'agents', `${mdName}.md`);
  try {
    return await fs.readFile(agentPath, 'utf-8');
  } catch {
    return `[OmOC] Could not read persona file: agents/${mdName}.md (looked in ${agentPath})`;
  }
}

export function listPersonas(): Array<{
  id: string;
  shortName: string;
  displayName: string;
  emoji: string;
  theme: string;
}> {
  return OMOC_AGENT_CONFIGS.map((agent) => ({
    id: agent.id,
    shortName: agent.id.replace('omoc_', ''),
    displayName: agent.identity?.name ?? agent.name ?? agent.id,
    emoji: agent.identity?.emoji ?? '',
    theme: agent.identity?.theme ?? '',
  }));
}

export const DEFAULT_PERSONA_ID = 'omoc_atlas';
