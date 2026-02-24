import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';
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
function resolveEffectivePersona(ctx: TypedHookContext): { personaId: string; source: 'manual' | 'auto' } | null {
  const manual = getActivePersona();
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
  // Use the typed hook system (api.on) for before_prompt_build.
  // This directly injects into the system prompt via prependContext,
  // which is more reliable than bootstrapFiles via agent:bootstrap.
  //
  // api.registerHook('before_prompt_build', ...) registers into the internal
  // hook system which does NOT trigger before_prompt_build — only hookRunner
  // (typed hooks via api.on) does.
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult>(
    'before_prompt_build',
    (_event: BeforePromptBuildEvent, ctx: TypedHookContext): BeforePromptBuildResult | void => {
      const result = resolveEffectivePersona(ctx);

      if (!result) {
        api.logger.info(
          `[omoc] Persona injector: no persona resolved (agentId=${ctx.agentId ?? 'none'}, manual=${getActivePersona() ?? 'none'})`
        );
        return;
      }

      const { personaId, source } = result;

      try {
        const content = readPersonaPromptSync(personaId);
        api.logger.info(`[omoc] Persona injected via before_prompt_build: ${personaId} (${source}, agentId=${ctx.agentId ?? 'none'})`);

        return {
          prependContext: content,
        };
      } catch (err) {
        api.logger.error(`[omoc] Failed to inject persona ${personaId}:`, err);
        return;
      }
    },
    { priority: 100 } // High priority — persona prompt should be prepended first
  );
}
