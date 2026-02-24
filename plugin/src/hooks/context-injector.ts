import { contextCollector } from '../features/context-collector.js';
import { OmocPluginApi } from '../types.js';

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

export function registerContextInjector(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const sessionKey = event.context.agentId || 'default';

      if (!contextCollector.hasEntries(sessionKey)) {
        return;
      }

      if (!event.context.bootstrapFiles) {
        event.context.bootstrapFiles = [];
      }

      const alreadyInjected = event.context.bootstrapFiles.some((file) =>
        file.path.startsWith('omoc://context/')
      );
      if (alreadyInjected) {
        return;
      }

      const entries = contextCollector.collect(sessionKey);
      for (const entry of entries) {
        event.context.bootstrapFiles.push({
          path: `omoc://context/${entry.source}/${entry.id}`,
          content: entry.content,
        });
      }

      if (entries.length > 0) {
        api.logger.info(`[omoc] Context injected: ${entries.length} entries for ${sessionKey}`);
      }
    },
    {
      name: 'oh-my-openclaw.context-injector',
      description: 'Unified context injection from ContextCollector into bootstrapFiles',
    }
  );
}
