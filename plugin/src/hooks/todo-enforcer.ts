import { OmocPluginApi } from '../types.js';
import { getConfig } from '../utils/config.js';

const DIRECTIVE_TEXT = `[SYSTEM DIRECTIVE: OH-MY-OPENCLAW - TODO CONTINUATION]
You MUST continue working on incomplete todos.
- Do NOT stop until all tasks are marked complete
- Do NOT ask for permission to continue
- Mark each task complete immediately when finished
- If blocked, document the blocker and move to next task`;

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    bootstrapFiles?: BootstrapFile[];
  };
}

export function registerTodoEnforcer(api: OmocPluginApi): void {
  api.registerHook(
    'agent:bootstrap',
    (event: AgentBootstrapEvent): void => {
      const config = getConfig(api);

      if (!config.todo_enforcer_enabled) {
        return;
      }

      if (!event.context.bootstrapFiles) {
        event.context.bootstrapFiles = [];
      }

      event.context.bootstrapFiles.push({
        path: 'omoc://todo-enforcer',
        content: DIRECTIVE_TEXT,
      });

      api.logger.info('[omoc] Todo enforcer directive injected');
    },
    {
      name: 'oh-my-openclaw.todo-enforcer',
      description: 'Injects TODO continuation directive into agent bootstrap',
    }
  );
}
