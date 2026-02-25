import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { getActivePersona } from '../utils/persona-state.js';
import { readPersonaPromptSync, resolvePersonaId } from '../agents/persona-prompts.js';

/**
 * Resolve the effective persona ID.
 *
 * Priority:
 *   1. Manually set persona via /omoc command (getActivePersona())
 *   2. agentId from the hook context (set by OpenClaw core)
 *   3. null — no persona to inject
 */
async function resolveEffectivePersona(ctx: TypedHookContext): Promise<{ personaId: string; source: 'manual' | 'auto' } | null> {
  const manual = await getActivePersona();
  if (manual) {
    const resolved = resolvePersonaId(manual);
    if (resolved) return { personaId: resolved, source: 'manual' };
  }

  const agentId = ctx.agentId;
  if (!agentId) return null;

  const resolved = resolvePersonaId(agentId);
  if (!resolved) return null;

  return { personaId: resolved, source: 'auto' };
}

export function registerPersonaInjector(api: OmocPluginApi): void {
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult | void>(
    'before_prompt_build',
    async (event: BeforePromptBuildEvent, ctx: TypedHookContext): Promise<BeforePromptBuildResult | void> => {
      const result = await resolveEffectivePersona(ctx);

       if (!result) {
         const manual = await getActivePersona();
         api.logger.info(
           `${LOG_PREFIX} Persona injector: no persona resolved (agentId=${ctx.agentId ?? 'none'}, manual=${manual ?? 'none'})`
         );
         return;
       }

       const { personaId, source } = result;

       try {
         const content = readPersonaPromptSync(personaId);

         if (event.systemPrompt) {
           api.logger.info(
             `${LOG_PREFIX} Persona appended to system prompt: ${personaId} (${source}, agentId=${ctx.agentId ?? 'none'})`,
           );
           return { systemPrompt: `${event.systemPrompt}\n\n${content}` };
         }

         api.logger.info(
           `${LOG_PREFIX} Persona via prependContext fallback: ${personaId} (${source}, agentId=${ctx.agentId ?? 'none'})`,
         );
         return { prependContext: content };
       } catch (err) {
         api.logger.error(`${LOG_PREFIX} Failed to inject persona ${personaId}:`, err);
        return;
      }
    },
    { priority: 100 },
  );
}
