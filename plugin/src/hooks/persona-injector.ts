import { OmocPluginApi } from '../types.js';
import { getActivePersona } from '../utils/persona-state.js';
import { readPersonaPromptSync } from '../agents/persona-prompts.js';

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    bootstrapFiles?: BootstrapFile[];
  };
}

export function registerPersonaInjector(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const personaId = getActivePersona();

      if (!personaId) {
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
        api.logger.info(`[omoc] Persona injected: ${personaId}`);
      } catch (err) {
        api.logger.error(`[omoc] Failed to inject persona ${personaId}:`, err);
      }
    },
    {
      name: 'oh-my-openclaw.persona-injector',
      description: 'Injects active persona prompt into agent bootstrap',
    }
  );
}
