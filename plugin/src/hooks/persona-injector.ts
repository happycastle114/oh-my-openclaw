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

const FINGERPRINT_LENGTH = 200;

/**
 * Check whether persona content is already present in session history.
 *
 * OpenClaw's `prependContext` is merged into the user prompt and persisted
 * in session history. Without this check the persona text accumulates —
 * appearing once per historical user message sent to the model.
 */
export function isPersonaAlreadyInHistory(
  messages: unknown[] | undefined,
  personaContent: string,
): boolean {
  if (!messages || messages.length === 0) return false;

  const fingerprint = personaContent.slice(0, FINGERPRINT_LENGTH).trim();
  if (!fingerprint) return false;

  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;

    const record = msg as Record<string, unknown>;
    if (record['role'] !== 'user') continue;

    const content = record['content'];
    if (typeof content === 'string' && content.includes(fingerprint)) {
      return true;
    }
  }

  return false;
}

export function registerPersonaInjector(api: OmocPluginApi): void {
  // Use the typed hook system (api.on) for before_prompt_build.
  // This directly injects into the system prompt via prependContext,
  // which is more reliable than bootstrapFiles via agent:bootstrap.
  //
  // api.registerHook('before_prompt_build', ...) registers into the internal
  // hook system which does NOT trigger before_prompt_build — only hookRunner
  // (typed hooks via api.on) does.
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

         if (isPersonaAlreadyInHistory(event.messages, content)) {
           api.logger.info(
             `${LOG_PREFIX} Persona already in history, skipping injection: ${personaId} (${source})`,
           );
           return;
         }

         api.logger.info(`${LOG_PREFIX} Persona injected via before_prompt_build: ${personaId} (${source}, agentId=${ctx.agentId ?? 'none'})`);

         return {
           prependContext: content,
         };
       } catch (err) {
         api.logger.error(`${LOG_PREFIX} Failed to inject persona ${personaId}:`, err);
        return;
      }
    },
    { priority: 100 } // High priority — persona prompt should be prepended first
  );
}
