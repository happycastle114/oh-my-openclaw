import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../../types.js';
import { LOG_PREFIX } from '../../constants.js';
import { detectKeywords, WORKFLOW_PERSONA_MAP } from './detector.js';
import { setActivePersonaId, replaceAgentsMd } from '../../utils/persona-state.js';
import { readPersonaPrompt } from '../../agents/persona-prompts.js';

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

      const workflowHit = detected.find((k) => k.type in WORKFLOW_PERSONA_MAP);
      if (workflowHit) {
        const personaId = WORKFLOW_PERSONA_MAP[workflowHit.type]!;
        switchPersona(api, personaId);
      }

      return { prependContext: merged };
    },
    { priority: 75 },
  );
}

function switchPersona(api: OmocPluginApi, personaId: string): void {
  setActivePersonaId(personaId)
    .then(() => readPersonaPrompt(personaId))
    .then((content) => replaceAgentsMd(content))
    .then(() => api.logger.info(`${LOG_PREFIX} Keyword detector: persona switched to ${personaId}`))
    .catch((err) => api.logger.error(`${LOG_PREFIX} Keyword detector: persona switch failed`, err));
}
