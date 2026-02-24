import { OmocPluginApi } from '../types.js';
import { getActivePersona } from '../utils/persona-state.js';
import { readPersonaPromptSync, resolvePersonaId } from '../agents/persona-prompts.js';

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    bootstrapFiles?: BootstrapFile[];
    agentId?: string;
    sessionKey?: string;
  };
}

/**
 * Resolve the effective persona ID for this bootstrap event.
 *
 * Priority:
 *   1. Manually set persona via /omoc command (getActivePersona())
 *   2. agentId from the bootstrap event context (set by OpenClaw core)
 *   3. null — no persona to inject
 */
function resolveEffectivePersona(event: AgentBootstrapEvent): string | null {
  const manual = getActivePersona();
  if (manual) return manual;

  const agentId = event.context.agentId;
  if (!agentId) return null;

  return resolvePersonaId(agentId);
}

export function registerPersonaInjector(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const personaId = resolveEffectivePersona(event);

      if (!personaId) {
        api.logger.info(
          `[omoc] Persona injector: no persona resolved (agentId=${event.context.agentId ?? 'none'}, manual=${getActivePersona() ?? 'none'})`
        );
        return;
      }

      if (!event.context.bootstrapFiles) {
        event.context.bootstrapFiles = [];
      }

      try {
        const content = readPersonaPromptSync(personaId);
        event.context.bootstrapFiles.push({
          path: `omoc://persona/${personaId}`,
          content,
        });

        const source = getActivePersona() ? 'manual' : 'auto';
        api.logger.info(`[omoc] Persona injected: ${personaId} (${source}, agentId=${event.context.agentId ?? 'none'})`);
      } catch (err) {
        api.logger.error(`[omoc] Failed to inject persona ${personaId}:`, err);
      }
    },
    {
      name: 'oh-my-openclaw.persona-injector',
      description: 'Injects active persona prompt into agent bootstrap — auto-detects from agentId when no manual persona is set',
    }
  );
}
