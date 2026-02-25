import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../../types.js';
import { LOG_PREFIX } from '../../constants.js';
import { detectKeywords } from './detector.js';

export function registerKeywordDetector(api: OmocPluginApi): void {
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult>(
    'before_prompt_build',
    (event: BeforePromptBuildEvent, _ctx: TypedHookContext): BeforePromptBuildResult | void => {
      const prompt = event.prompt;
      if (!prompt || typeof prompt !== 'string') return;

      const detected = detectKeywords(prompt);
      if (detected.length === 0) return;

      const merged = detected.map((k) => k.message).join('\n\n');

      api.logger.info(
        `${LOG_PREFIX} Keyword detector: ${detected.map((k) => k.type).join(', ')} detected`,
      );

      return { prependContext: merged };
    },
    { priority: 75 },
  );
}
