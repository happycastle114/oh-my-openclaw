import { OmocPluginApi, TypedHookContext } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { getActivePersona } from '../utils/persona-state.js';
import { ALL_AGENT_IDS } from '../agents/agent-ids.js';

const SPAWN_TOOL_NAME = 'sessions_spawn';

const AVAILABLE_AGENTS = ALL_AGENT_IDS.map((id) => id.replace('omoc_', '')).join(', ');

/** before_tool_call hook: block sessions_spawn without agentId when OmOC persona is active. */
export function registerSpawnGuard(api: OmocPluginApi): void {
  api.on<{ toolName: string; params: Record<string, unknown> }, { block?: boolean; blockReason?: string } | void>(
    'before_tool_call',
    async (
      event: { toolName: string; params: Record<string, unknown> },
      ctx: TypedHookContext,
    ): Promise<{ block?: boolean; blockReason?: string } | void> => {
      if (event.toolName !== SPAWN_TOOL_NAME) {
        return;
      }

      let activePersona: string | null;
      try {
        activePersona = await getActivePersona(ctx.workspaceDir, ctx.agentId);
      } catch {
        return;
      }

      if (!activePersona) return;

      const agentId = event.params.agentId;
      if (typeof agentId === 'string' && agentId.trim().length > 0) return;

      api.logger.info(
        `${LOG_PREFIX} Spawn guard: blocked sessions_spawn without agentId (active persona=${activePersona})`,
      );

      return {
        block: true,
        blockReason:
          `[OmOC] Sub-agent spawn BLOCKED: agentId is required when OmOC persona is active (current: ${activePersona}). ` +
          `You MUST provide the agentId parameter in your sessions_spawn call. ` +
          `Available agents: ${AVAILABLE_AGENTS}. ` +
          `Retry with agentId set to the appropriate agent for this task.`,
      };
    },
    { priority: 150 }, // Before other tool hooks
  );
}
