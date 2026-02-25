import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { readPersonaPromptSync, resolvePersonaId } from '../agents/persona-prompts.js';

/**
 * Persona injector for **sub-agent sessions only**.
 *
 * Main session persona is handled by AGENTS.md file replacement (see persona-commands.ts).
 * Sub-agents are ephemeral (single task → die), so prependContext accumulation is not an issue.
 *
 * Resolution: ctx.agentId (set by OpenClaw from openclaw.json5 agent config)
 *   → resolvePersonaId maps e.g. "explore" → "omoc_explore" → agents/explore.md
 */
export function registerPersonaInjector(api: OmocPluginApi): void {
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult | void>(
    'before_prompt_build',
    async (event: BeforePromptBuildEvent, ctx: TypedHookContext): Promise<BeforePromptBuildResult | void> => {
      // Only inject for sub-agent sessions.
      // Main session uses AGENTS.md file replacement (no accumulation bug).
      const sessionKey = ctx.sessionKey ?? '';
      if (!sessionKey.includes(':subagent:')) {
        return;
      }

      // Resolve persona from agentId (e.g., "explore" → "omoc_explore")
      const agentId = ctx.agentId;
      if (!agentId) return;

      const personaId = resolvePersonaId(agentId);
      if (!personaId) {
        api.logger.info(
          `${LOG_PREFIX} Persona injector: no persona for agentId=${agentId} (sub-agent session)`,
        );
        return;
      }

      try {
        const content = readPersonaPromptSync(personaId);

        if (event.systemPrompt) {
          // Append persona to the existing system prompt (preserves tools, runtime, subagent context)
          api.logger.info(
            `${LOG_PREFIX} Sub-agent persona injected: ${personaId} (agentId=${agentId}, session=${sessionKey})`,
          );
          return { systemPrompt: `${event.systemPrompt}\n\n${content}` };
        }

        // Fallback: no system prompt available, use prependContext
        api.logger.info(
          `${LOG_PREFIX} Sub-agent persona via prependContext: ${personaId} (agentId=${agentId})`,
        );
        return { prependContext: content };
      } catch (err) {
        api.logger.error(`${LOG_PREFIX} Failed to inject persona for sub-agent ${personaId}:`, err);
        return;
      }
    },
    { priority: 100 },
  );
}
