import { OmocPluginApi } from '../types.js';
import { getConfig } from '../utils/config.js';
import { contextCollector } from '../features/context-collector.js';

export type AgentRole = 'orchestrator' | 'worker' | 'lightweight';

const ORCHESTRATOR_IDS = new Set([
  'omoc_prometheus',
  'omoc_atlas',
]);

const WORKER_IDS = new Set([
  'omoc_sisyphus',
  'omoc_hephaestus',
  'omoc_frontend',
]);

export function classifyAgentRole(agentId?: string): AgentRole {
  if (!agentId) return 'orchestrator';
  if (ORCHESTRATOR_IDS.has(agentId)) return 'orchestrator';
  if (WORKER_IDS.has(agentId)) return 'worker';
  return 'lightweight';
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

const DIRECTIVES: Record<AgentRole, string | null> = {
  orchestrator: ORCHESTRATOR_DIRECTIVE,
  worker: WORKER_DIRECTIVE,
  lightweight: null,
};

interface AgentBootstrapEvent {
  context: {
    agentId?: string;
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
      const sessionKey = event.context.agentId || 'default';

      if (!directive) {
        return;
      }

      try {
        contextCollector.register(sessionKey, {
          id: 'todo-enforcer',
          content: directive,
          priority: 'normal',
          source: 'todo-enforcer',
        });
        api.logger.info(`[omoc] Todo enforcer context registered (role: ${role})`);
      } catch (err) {
        api.logger.error('[omoc] Todo enforcer context registration failed:', err);
      }
    },
    {
      name: 'oh-my-openclaw.todo-enforcer',
      description: 'Injects role-aware TODO directive into agent bootstrap',
    }
  );
}
