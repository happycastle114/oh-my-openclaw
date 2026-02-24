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

/** Minimum interval (ms) between persona injections to prevent regurgitation. */
const PERSONA_INJECTION_COOLDOWN_MS = 5_000;
let lastPersonaInjectionTime = 0;

export function resetPersonaInjectorState(): void {
  lastPersonaInjectionTime = 0;
}

export function getPersonaInjectorState() {
  return { lastPersonaInjectionTime };
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

      const alreadyInjected = event.context.bootstrapFiles.some(
        (f) => f.path.startsWith('omoc://persona/')
      );
      if (alreadyInjected) {
        api.logger.info(`[omoc] Persona injection skipped (already present in bootstrapFiles)`);
        return;
      }

      const now = Date.now();
      if (now - lastPersonaInjectionTime < PERSONA_INJECTION_COOLDOWN_MS) {
        api.logger.info(`[omoc] Persona injection skipped (cooldown)`);
        return;
      }

      try {
        const content = readPersonaPromptSync(personaId);
        event.context.bootstrapFiles.push({
          path: `omoc://persona/${personaId}`,
          content,
        });
        lastPersonaInjectionTime = now;
        api.logger.info(`[omoc] Persona injected: ${personaId}`);
      } catch (err) {
        api.logger.error(`[omoc] Failed to inject persona ${personaId}:`, err);
      }
    },
    {
      name: 'oh-my-openclaw.persona-injector',
      description: 'Injects active persona prompt into agent bootstrap (with dedup + cooldown)',
    }
  );
}
