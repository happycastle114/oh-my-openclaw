import { contextCollector } from '../features/context-collector.js';
import { OmocPluginApi } from '../types.js';

interface BeforePromptBuildEvent {
  messages?: unknown[];
  agentId?: string;
  sessionId?: string;
  prependContext?: string;
  systemPrompt?: string;
}

export function registerContextInjector(api: OmocPluginApi): void {
  api.registerHook(
    'before_prompt_build',
    (event: BeforePromptBuildEvent): BeforePromptBuildEvent => {
      const sessionKey = event.agentId || 'default';

      if (!contextCollector.hasEntries(sessionKey)) {
        return event;
      }

      const entryCount = contextCollector.getEntries(sessionKey).length;
      const collectedContext = contextCollector.collectAsString(sessionKey);

      if (!collectedContext) {
        return event;
      }

      event.prependContext = collectedContext;
      api.logger.info(`[omoc] Context injected: ${entryCount} entries for ${sessionKey}`);

      return event;
    },
    {
      name: 'oh-my-openclaw.context-injector',
      description: 'Unified context injection from ContextCollector into prependContext',
    }
  );
}
