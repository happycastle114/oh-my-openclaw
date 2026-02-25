import { OmocPluginApi, PLUGIN_ID } from './types.js';
import { VERSION } from './version.js';
import { getConfig } from './utils/config.js';
import { safeRegister } from './utils/helpers.js';
import { registerTodoEnforcer } from './hooks/todo-enforcer.js';
import { registerCommentChecker } from './hooks/comment-checker.js';
import { registerMessageMonitor } from './hooks/message-monitor.js';
import { registerStartupHook } from './hooks/startup.js';
import { registerRalphLoop } from './services/ralph-loop.js';
import { registerDelegateTool } from './tools/task-delegation.js';
import { registerLookAtTool } from './tools/look-at.js';
import { registerCheckpointTool } from './tools/checkpoint.js';
import { registerWorkflowCommands } from './commands/workflow-commands.js';
import { registerRalphCommands } from './commands/ralph-commands.js';
import { registerStatusCommands } from './commands/status-commands.js';
import { registerPersonaCommands } from './commands/persona-commands.js';
import { registerContextInjector } from './hooks/context-injector.js';
import { registerPersonaInjector } from './hooks/persona-injector.js';
import { registerSetupCli } from './cli/setup.js';

/**
 * Generation counter for multi-registration handling.
 *
 * OpenClaw may call register() multiple times with different api instances.
 * Only the LAST call's api connects to the live hook dispatcher.
 * We track a generation number so that hooks from stale registrations
 * become no-ops, solving both:
 *   - hooks not firing (stale api from early call)
 *   - triple firing (all 3 registrations' hooks executing)
 */
let generation = 0;

const registry = {
  hooks: [] as string[],
  services: [] as string[],
  tools: [] as string[],
  commands: [] as string[],
  cli: [] as string[],
};

function guardedApi(api: OmocPluginApi, gen: number): OmocPluginApi {
  return {
    ...api,
    registerHook: <TEvent>(
      event: string,
      handler: (event: TEvent) => TEvent | void | undefined,
      meta?: { name: string; description?: string },
    ) => {
      api.registerHook(event, (evt: TEvent) => {
        if (gen !== generation) return evt;
        return handler(evt);
      }, meta);
    },
  };
}

export default function register(api: OmocPluginApi) {
  const gen = ++generation;
  registry.hooks = [];
  registry.services = [];
  registry.tools = [];
  registry.commands = [];
  registry.cli = [];

  const config = getConfig(api);

  api.logger.info(`[${PLUGIN_ID}] Initializing plugin v${VERSION} (register call #${gen})`);

  const guarded = guardedApi(api, gen);

  safeRegister(api, 'todo-enforcer', 'hook', () => {
    registerTodoEnforcer(guarded);
    registry.hooks.push('todo-enforcer');
    api.logger.info(`[${PLUGIN_ID}] Todo Enforcer hook registered (enabled: ${config.todo_enforcer_enabled})`);
  });

  safeRegister(api, 'comment-checker', 'hook', () => {
    registerCommentChecker(guarded);
    registry.hooks.push('comment-checker');
    api.logger.info(`[${PLUGIN_ID}] Comment Checker hook registered (enabled: ${config.comment_checker_enabled})`);
  });

  safeRegister(api, 'message-monitor', 'hook', () => {
    registerMessageMonitor(guarded);
    registry.hooks.push('message-monitor', 'message-received-monitor');
    api.logger.info(`[${PLUGIN_ID}] Message Monitor hook registered`);
  });

  safeRegister(api, 'gateway-startup', 'hook', () => {
    registerStartupHook(guarded);
    registry.hooks.push('gateway-startup');
    api.logger.info(`[${PLUGIN_ID}] Gateway startup hook registered`);
  });

  safeRegister(api, 'context-injector', 'hook', () => {
    registerContextInjector(guarded);
    registry.hooks.push('context-injector');
    api.logger.info(`[${PLUGIN_ID}] Context injector hook registered (before_prompt_build)`);
  });

  safeRegister(api, 'persona-injector', 'hook', () => {
    registerPersonaInjector(api);
    registry.hooks.push('persona-injector');
    api.logger.info(`[${PLUGIN_ID}] Persona injector hook registered (sub-agent before_prompt_build)`);
  });

  safeRegister(api, 'ralph-loop', 'service', () => {
    registerRalphLoop(api);
    registry.services.push('ralph-loop');
    api.logger.info(`[${PLUGIN_ID}] Ralph Loop service registered`);
  });

  safeRegister(api, 'omoc_delegate', 'tool', () => {
    registerDelegateTool(api);
    registry.tools.push('omoc_delegate');
    api.logger.info(`[${PLUGIN_ID}] Delegate tool registered`);
  });

  safeRegister(api, 'omoc_look_at', 'tool', () => {
    registerLookAtTool(api);
    registry.tools.push('omoc_look_at');
    api.logger.info(`[${PLUGIN_ID}] Look-At tool registered`);
  });

  safeRegister(api, 'omoc_checkpoint', 'tool', () => {
    registerCheckpointTool(api);
    registry.tools.push('omoc_checkpoint');
    api.logger.info(`[${PLUGIN_ID}] Checkpoint tool registered`);
  });

  safeRegister(api, 'workflow-commands', 'command', () => {
    registerWorkflowCommands(api);
    registry.commands.push('ultrawork', 'plan', 'start_work');
    api.logger.info(`[${PLUGIN_ID}] Workflow commands registered (ultrawork, plan, start_work)`);
  });

  safeRegister(api, 'ralph-commands', 'command', () => {
    registerRalphCommands(api);
    registry.commands.push('ralph_loop', 'ralph_stop', 'omoc_status');
    api.logger.info(`[${PLUGIN_ID}] Ralph commands registered (ralph_loop, ralph_stop, omoc_status)`);
  });

  safeRegister(api, 'status-commands', 'command', () => {
    registerStatusCommands(api);
    registry.commands.push('omoc_health', 'omoc_config');
    api.logger.info(`[${PLUGIN_ID}] Status commands registered (omoc_health, omoc_config)`);
  });

  safeRegister(api, 'persona-commands', 'command', () => {
    registerPersonaCommands(api);
    registry.commands.push('omoc');
    api.logger.info(`[${PLUGIN_ID}] Persona command registered (/omoc)`);
  });

  safeRegister(api, 'omoc-setup', 'cli', () => {
    api.registerCli((ctx) => {
      registerSetupCli({
        program: ctx.program as Parameters<typeof registerSetupCli>[0]['program'],
        workspaceDir: ctx.workspaceDir,
        logger: ctx.logger,
      });
    }, { commands: ['omoc-setup'] });
    registry.cli.push('omoc-setup');
    api.logger.info(`[${PLUGIN_ID}] CLI command registered (omoc-setup)`);
  });

  api.registerGatewayMethod('oh-my-openclaw.status', () => {
    return {
      ok: true,
      plugin: PLUGIN_ID,
      version: VERSION,
      hooks: [...registry.hooks],
      services: [...registry.services],
      tools: [...registry.tools],
      commands: [...registry.commands],
      cli: [...registry.cli],
      config: {
        todo_enforcer_enabled: config.todo_enforcer_enabled,
        comment_checker_enabled: config.comment_checker_enabled,
        max_ralph_iterations: config.max_ralph_iterations,
      },
    };
  });

  api.logger.info(`[${PLUGIN_ID}] Plugin initialization complete`);
}
