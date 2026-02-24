import { contextCollector } from '../features/context-collector.js';
import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';

export function registerContextInjector(api: OmocPluginApi): void {
  // Use the typed hook system (api.on) instead of api.registerHook.
  // api.registerHook registers into the internal hook system which does NOT
  // trigger before_prompt_build — only hookRunner (typed hooks) does.
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult>(
    'before_prompt_build',
    (_event: BeforePromptBuildEvent, ctx: TypedHookContext): BeforePromptBuildResult | void => {
      const sessionKey = ctx.sessionKey ?? ctx.sessionId ?? ctx.agentId ?? 'default';

      if (!contextCollector.hasEntries(sessionKey)) {
        return;
      }

      const entryCount = contextCollector.getEntries(sessionKey).length;
      const collectedContext = contextCollector.collectAsString(sessionKey);

      if (!collectedContext) {
        return;
      }

      api.logger.info(`[omoc] Context injected via before_prompt_build: ${entryCount} entries for ${sessionKey}`);

      return {
        prependContext: collectedContext,
      };
    },
    { priority: 50 } // Lower priority than persona (100) — persona goes first
  );
}
