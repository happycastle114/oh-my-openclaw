import { readFileSync, statSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OMOC_AGENT_CONFIGS } from './agent-configs.js';
import { PLUGIN_ROOT } from '../utils/paths.js';
import { AGENT_MD_MAP } from './agent-ids.js';

/** mtime-based file content cache (matches OpenClaw's readFileWithCache pattern) */
interface PersonaCacheEntry {
  content: string;
  mtimeMs: number;
}
const personaCache = new Map<string, PersonaCacheEntry>();

/** Clear all cached persona file contents. Useful for testing. */
export function clearPersonaCache(): void {
  personaCache.clear();
}

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

  const agentPath = join(PLUGIN_ROOT, 'agents', `${mdName}.md`);
  try {
    const stat = statSync(agentPath);
    const cached = personaCache.get(agentPath);

    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.content;
    }

    const content = readFileSync(agentPath, 'utf-8');
    personaCache.set(agentPath, { content, mtimeMs: stat.mtimeMs });
    return content;
  } catch {
    personaCache.delete(agentPath);
    return `[OmOC] Could not read persona file: agents/${mdName}.md (looked in ${agentPath})`;
  }
}

export async function readPersonaPrompt(agentId: string): Promise<string> {
  const mdName = AGENT_MD_MAP[agentId];
  if (!mdName) {
    return `[OmOC] Unknown persona: ${agentId}`;
  }

  const agentPath = join(PLUGIN_ROOT, 'agents', `${mdName}.md`);
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
