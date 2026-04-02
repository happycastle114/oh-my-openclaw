import type { OpenClawPluginApi, PluginHookSessionStartEvent } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { getActivePersona, resolveAgentsMdPath, replaceAgentsMd } from '../utils/persona-state.js';
import { readPersonaPromptSync } from '../agents/persona-prompts.js';
import { readFileSync } from 'fs';

export function registerSessionSync(api: OpenClawPluginApi): void {
  api.on<PluginHookSessionStartEvent, void>(
    'session_start',
    async (event: PluginHookSessionStartEvent): Promise<void> => {
      try {
        // SDK typed hooks don't provide TypedHookContext
        const wsDir = api.workspaceDir;
        const agentId = api.config.agentId as string | undefined;
        const activePersona = await getActivePersona(wsDir, agentId);
        if (!activePersona) return;

        const personaContent = readPersonaPromptSync(activePersona);
        if (personaContent.startsWith('[OmOC]')) {
          api.logger.warn(`${LOG_PREFIX} Session sync: persona file issue for ${activePersona}`);
          return;
        }

        const agentsPath = resolveAgentsMdPath(wsDir);
        try {
          const current = readFileSync(agentsPath, 'utf-8');
          if (current.includes(personaContent.slice(0, 100))) return;
        } catch {
          // AGENTS.md missing or unreadable — needs sync
        }

        await replaceAgentsMd(personaContent, wsDir);
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
