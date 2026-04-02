import { contextCollector } from '../features/context-collector.js';
import type { OpenClawPluginApi, PluginHookBeforePromptBuildEvent, PluginHookBeforePromptBuildResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';

export function registerContextInjector(api: OpenClawPluginApi): void {
  api.on<PluginHookBeforePromptBuildEvent, PluginHookBeforePromptBuildResult>(
    'before_prompt_build',
    (event: PluginHookBeforePromptBuildEvent): PluginHookBeforePromptBuildResult | void => {
      // SDK typed hooks don't provide TypedHookContext
      // Context info available from api.config/api.runtime if needed
      // SDK typed hooks don't provide TypedHookContext - read from api.config
      const sessionKey = (api.config.sessionKey as string) ?? (api.config.sessionId as string) ?? (api.config.agentId as string) ?? 'default';

      if (!contextCollector.hasEntries(sessionKey)) {
        return;
      }

      const entryCount = contextCollector.getEntries(sessionKey).length;
      const collectedContext = contextCollector.collectAsString(sessionKey);

      if (!collectedContext) {
        return;
      }

       api.logger.info(`${LOG_PREFIX} Context injected via before_prompt_build: ${entryCount} entries for ${sessionKey}`);

      return {
        prependContext: collectedContext,
      };
    },
    { priority: 50 } // Lower priority than persona (100) — persona goes first
  );
}
