import { OmocPluginApi } from '../types.js';
import { getConfig } from '../utils/config.js';

const DIRECTIVE_TEXT = `[SYSTEM DIRECTIVE: OH-MY-OPENCLAW - TODO CONTINUATION]
You MUST continue working on incomplete todos.
- Do NOT stop until all tasks are marked complete
- Do NOT ask for permission to continue
- Mark each task complete immediately when finished
- If blocked, document the blocker and move to next task

[SUBAGENT COMPLETION RULE]
When you receive a subagent completion notification ("✅ Subagent finished"):
- This is an ACTION TRIGGER, not an FYI
- IMMEDIATELY check the subagent's result
- Verify against success criteria
- Then proceed to the next task/phase
- NEVER stop after receiving a completion notification`;

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    bootstrapFiles?: BootstrapFile[];
  };
}

let lastInjectionTime = 0;
let consecutiveFailures = 0;
let disabledByFailures = false;

export function resetEnforcerState(): void {
  lastInjectionTime = 0;
  consecutiveFailures = 0;
  disabledByFailures = false;
}

export function getEnforcerState() {
  return { lastInjectionTime, consecutiveFailures, disabledByFailures };
}

export function registerTodoEnforcer(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const config = getConfig(api);

      if (!config.todo_enforcer_enabled) {
        return;
      }

      if (disabledByFailures) {
        api.logger.warn('[omoc] Todo enforcer disabled due to consecutive failures');
        return;
      }

      const now = Date.now();
      if (config.todo_enforcer_cooldown_ms > 0 && (now - lastInjectionTime) < config.todo_enforcer_cooldown_ms) {
        api.logger.info('[omoc] Todo enforcer skipped (cooldown)');
        return;
      }

      if (!event.context.bootstrapFiles) {
        event.context.bootstrapFiles = [];
      }

      const alreadyInjected = event.context.bootstrapFiles.some(
        (f) => f.path === 'omoc://todo-enforcer'
      );
      if (alreadyInjected) {
        api.logger.info('[omoc] Todo enforcer skipped (already present in bootstrapFiles)');
        return;
      }

      try {
        event.context.bootstrapFiles.push({
          path: 'omoc://todo-enforcer',
          content: DIRECTIVE_TEXT,
        });

        lastInjectionTime = now;
        consecutiveFailures = 0;
        api.logger.info('[omoc] Todo enforcer directive injected');
      } catch {
        consecutiveFailures++;
        if (config.todo_enforcer_max_failures > 0 && consecutiveFailures >= config.todo_enforcer_max_failures) {
          disabledByFailures = true;
          api.logger.error(`[omoc] Todo enforcer disabled after ${consecutiveFailures} consecutive failures`);
        }
      }
    },
    {
      name: 'oh-my-openclaw.todo-enforcer',
      description: 'Injects TODO continuation directive into agent bootstrap',
    }
  );
}
