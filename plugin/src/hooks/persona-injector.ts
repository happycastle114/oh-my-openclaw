import { OmocPluginApi } from '../types.js';
import { getActivePersona } from '../utils/persona-state.js';
import { readPersonaPromptSync } from '../agents/persona-prompts.js';
import { contextCollector } from '../features/context-collector.js';

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    agentId?: string;
    bootstrapFiles?: BootstrapFile[];
  };
}

let lastInjectedPersonaId: string | null = null;
const personaSessionKeys = new Set<string>();

export function resetPersonaContextEntries(): void {
  for (const sessionKey of personaSessionKeys) {
    const entries = contextCollector.getEntries(sessionKey);
    for (const entry of entries) {
      if (entry.source === 'persona') {
        contextCollector.unregister(sessionKey, entry.id);
      }
    }
  }
  personaSessionKeys.clear();
}

export function resetPersonaInjectorState(): void {
  lastInjectedPersonaId = null;
  resetPersonaContextEntries();
}

export function getPersonaInjectorState() {
  return { lastInjectedPersonaId };
}

export function registerPersonaInjector(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const personaId = getActivePersona();
      const sessionKey = event.context.agentId || 'default';

      if (!personaId) {
        if (lastInjectedPersonaId) {
          contextCollector.unregister(sessionKey, `persona/${lastInjectedPersonaId}`);
          lastInjectedPersonaId = null;
          api.logger.info(`[omoc] Persona context cleared for ${sessionKey}`);
        }
        return;
      }

      if (lastInjectedPersonaId === personaId) {
        return;
      }

      try {
        if (lastInjectedPersonaId) {
          contextCollector.unregister(sessionKey, `persona/${lastInjectedPersonaId}`);
        }

        const content = readPersonaPromptSync(personaId);
        contextCollector.register(sessionKey, {
          id: `persona/${personaId}`,
          content,
          priority: 'high',
          source: 'persona',
        });
        personaSessionKeys.add(sessionKey);
        lastInjectedPersonaId = personaId;
        api.logger.info(`[omoc] Persona context registered: ${personaId}`);
      } catch (err) {
        api.logger.error(`[omoc] Failed to register persona context ${personaId}:`, err);
      }
    },
    {
      name: 'oh-my-openclaw.persona-injector',
      description: 'Injects active persona prompt once per persona change',
    }
  );
}
