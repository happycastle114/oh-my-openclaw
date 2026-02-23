import { OmocPluginApi, PLUGIN_ID } from './types.js';
import { VERSION } from './version.js';
import { getConfig } from './utils/config.js';
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
import { registerSetupCli } from './cli/setup.js';

const registry = {
  hooks: [] as string[],
  services: [] as string[],
  tools: [] as string[],
  commands: [] as string[],
  cli: [] as string[],
};

export default function register(api: OmocPluginApi) {
  const config = getConfig(api);

  api.logger.info(`[${PLUGIN_ID}] Initializing plugin v${VERSION}`);

  try {
    registerTodoEnforcer(api);
    registry.hooks.push('todo-enforcer');
    api.logger.info(`[${PLUGIN_ID}] Todo Enforcer hook registered (enabled: ${config.todo_enforcer_enabled})`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Todo Enforcer:`, err);
  }

  try {
    registerCommentChecker(api);
    registry.hooks.push('comment-checker');
    api.logger.info(`[${PLUGIN_ID}] Comment Checker hook registered (enabled: ${config.comment_checker_enabled})`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Comment Checker:`, err);
  }

  try {
    registerMessageMonitor(api);
    registry.hooks.push('message-monitor', 'message-received-monitor');
    api.logger.info(`[${PLUGIN_ID}] Message Monitor hook registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Message Monitor:`, err);
  }

  try {
    registerStartupHook(api);
    registry.hooks.push('gateway-startup');
    api.logger.info(`[${PLUGIN_ID}] Gateway startup hook registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register startup hook:`, err);
  }

  try {
    registerRalphLoop(api);
    registry.services.push('ralph-loop');
    api.logger.info(`[${PLUGIN_ID}] Ralph Loop service registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Ralph Loop:`, err);
  }

  try {
    registerDelegateTool(api);
    registry.tools.push('omoc_delegate');
    api.logger.info(`[${PLUGIN_ID}] Delegate tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Delegate tool:`, err);
  }

  try {
    registerLookAtTool(api);
    registry.tools.push('omoc_look_at');
    api.logger.info(`[${PLUGIN_ID}] Look-At tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Look-At tool:`, err);
  }

  try {
    registerCheckpointTool(api);
    registry.tools.push('omoc_checkpoint');
    api.logger.info(`[${PLUGIN_ID}] Checkpoint tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Checkpoint tool:`, err);
  }

  try {
    registerWorkflowCommands(api);
    registry.commands.push('ultrawork', 'plan', 'start_work');
    api.logger.info(`[${PLUGIN_ID}] Workflow commands registered (ultrawork, plan, start_work)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Workflow commands:`, err);
  }

  try {
    registerRalphCommands(api);
    registry.commands.push('ralph_loop', 'ralph_stop', 'omoc_status');
    api.logger.info(`[${PLUGIN_ID}] Ralph commands registered (ralph_loop, ralph_stop, omoc_status)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Ralph commands:`, err);
  }

  try {
    registerStatusCommands(api);
    registry.commands.push('omoc_health', 'omoc_config');
    api.logger.info(`[${PLUGIN_ID}] Status commands registered (omoc_health, omoc_config)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Status commands:`, err);
  }

  try {
    api.registerCli((ctx) => {
      registerSetupCli({
        program: ctx.program as Parameters<typeof registerSetupCli>[0]['program'],
        workspaceDir: ctx.workspaceDir,
        logger: ctx.logger,
      });
    }, { commands: ['omoc-setup'] });
    registry.cli.push('omoc-setup');
    api.logger.info(`[${PLUGIN_ID}] CLI command registered (omoc-setup)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register CLI:`, err);
  }

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
