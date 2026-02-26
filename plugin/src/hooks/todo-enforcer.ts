import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { getConfig } from '../utils/config.js';
import { contextCollector } from '../features/context-collector.js';
import { ORCHESTRATOR_IDS, WORKER_IDS } from '../agents/agent-ids.js';
import { getIncompleteTodos } from '../tools/todo/store.js';

export type AgentRole = 'orchestrator' | 'worker' | 'unknown';

export function classifyAgentRole(agentId?: string): AgentRole {
  if (!agentId) return 'orchestrator';
  if (ORCHESTRATOR_IDS.has(agentId)) return 'orchestrator';
  if (WORKER_IDS.has(agentId)) return 'worker';
  return 'unknown';
}

const ORCHESTRATOR_DIRECTIVE = `[SYSTEM REMINDER - TODO CONTINUATION]
If you have incomplete todos, continue working on them.
- Mark each task complete immediately when finished
- If blocked, document the blocker and move to next task
- Do NOT restate prior messages — output only deltas and next concrete action
- If no actionable next step remains, declare tasks complete and stop

When you receive a subagent completion notification:
- Check the subagent's result against success criteria
- Then proceed to the next task/phase`;

const WORKER_DIRECTIVE = `[SYSTEM REMINDER - TASK COMPLETION]
Complete your assigned task, return the result, then stop.
- Do NOT restate prior messages — output only new findings or changes
- If blocked, report the blocker and stop`;

const CONTINUATION_DIRECTIVE = `[SYSTEM REMINDER - SUBAGENT CONTINUATION]
A subagent just completed. You have incomplete todos from a prior workflow.
DO NOT STOP. Check the subagent result, then continue with your next task.
- Review the announce result above for success/failure
- Proceed to the next pending todo immediately
- Do NOT restate prior messages — output only deltas and next action`;

const DIRECTIVES: Record<AgentRole, string | null> = {
  orchestrator: ORCHESTRATOR_DIRECTIVE,
  worker: WORKER_DIRECTIVE,
  unknown: null,
};

interface AgentBootstrapEvent {
  context: {
    agentId?: string;
    sessionKey?: string;
    sessionId?: string;
  };
}

export function resetEnforcerState(): void {
  // no-op — kept for API compatibility (no global state to reset)
}

export function getEnforcerState() {
  return {};
}

export function registerTodoEnforcer(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const config = getConfig(api);

      if (!config.todo_enforcer_enabled) {
        return;
      }

      const role = classifyAgentRole(event.context.agentId);
      const directive = DIRECTIVES[role];
      const sessionKey = event.context.sessionKey ?? event.context.sessionId ?? event.context.agentId ?? 'default';

      if (!directive) {
        return;
      }

      try {
        contextCollector.register(sessionKey, {
          id: 'todo-enforcer',
          content: directive,
          priority: 'normal',
          source: 'todo-enforcer',
          oneShot: true,
        });
         api.logger.info(`${LOG_PREFIX} Todo enforcer context registered (role: ${role})`);
       } catch (err) {
         api.logger.error(`${LOG_PREFIX} Todo enforcer context registration failed:`, err);
      }
    },
    {
      name: 'oh-my-openclaw.todo-enforcer',
      description: 'Injects role-aware TODO directive into agent bootstrap',
    }
  );

  api.on<BeforePromptBuildEvent, BeforePromptBuildResult>(
    'before_prompt_build',
    (_event: BeforePromptBuildEvent, ctx: TypedHookContext): BeforePromptBuildResult | void => {
      const config = getConfig(api);
      if (!config.todo_enforcer_enabled) return;

      const sessionKey = ctx.sessionKey ?? ctx.sessionId ?? ctx.agentId ?? 'default';
      const incomplete = getIncompleteTodos(sessionKey);
      if (incomplete.length === 0) return;

      const todoSummary = incomplete
        .map((t) => `  - [${t.status}] ${t.content}`)
        .join('\n');

      api.logger.info(`${LOG_PREFIX} Todo continuation injected: ${incomplete.length} incomplete todo(s)`);

      return {
        prependContext: `${CONTINUATION_DIRECTIVE}\n\nIncomplete todos:\n${todoSummary}`,
      };
    },
    { priority: 60 },
  );
}
