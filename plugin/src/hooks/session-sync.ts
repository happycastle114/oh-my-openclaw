import { OmocPluginApi, TypedHookContext } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { getActivePersona, resolveAgentsMdPath, replaceAgentsMd } from '../utils/persona-state.js';
import { readPersonaPromptSync } from '../agents/persona-prompts.js';
import { readFileSync } from 'fs';

/** session_start hook: re-sync AGENTS.md from `.omoc-state` (source of truth). */
export function registerSessionSync(api: OmocPluginApi): void {
  api.on<{ sessionId: string; resumedFrom?: string }, void>(
    'session_start',
    async (_event: { sessionId: string; resumedFrom?: string }, _ctx: TypedHookContext): Promise<void> => {
      try {
        const activePersona = await getActivePersona();
        if (!activePersona) return;

        const personaContent = readPersonaPromptSync(activePersona);
        if (personaContent.startsWith('[OmOC]')) {
          api.logger.warn(`${LOG_PREFIX} Session sync: persona file issue for ${activePersona}`);
          return;
        }

        const agentsPath = resolveAgentsMdPath();
        try {
          const current = readFileSync(agentsPath, 'utf-8');
          if (current.includes(personaContent.slice(0, 100))) return;
        } catch {
          // AGENTS.md missing or unreadable — needs sync
        }

        await replaceAgentsMd(personaContent);
        api.logger.info(
          `${LOG_PREFIX} Session sync: AGENTS.md re-synced with .omoc-state (persona=${activePersona})`,
        );
      } catch (err) {
        api.logger.error(`${LOG_PREFIX} Session sync failed:`, err);
      }
    },
    { priority: 200 }, // High priority — sync before other session hooks
  );
}
