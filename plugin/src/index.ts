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

/** Registry of successfully registered components */
const registry = {
  hooks: [] as string[],
  services: [] as string[],
  tools: [] as string[],
  commands: [] as string[],
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
    registry.commands.push('ultrawork', 'plan', 'start-work');
    api.logger.info(`[${PLUGIN_ID}] Workflow commands registered (ultrawork, plan, start-work)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Workflow commands:`, err);
  }

  try {
    registerRalphCommands(api);
    registry.commands.push('ralph-loop', 'ralph-stop', 'omoc-status');
    api.logger.info(`[${PLUGIN_ID}] Ralph commands registered (ralph-loop, ralph-stop, omoc-status)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Ralph commands:`, err);
  }

  try {
    registerStatusCommands(api);
    registry.commands.push('omoc-health', 'omoc-config');
    api.logger.info(`[${PLUGIN_ID}] Status commands registered (omoc-health, omoc-config)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Status commands:`, err);
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
      config: {
        todo_enforcer_enabled: config.todo_enforcer_enabled,
        comment_checker_enabled: config.comment_checker_enabled,
        max_ralph_iterations: config.max_ralph_iterations,
      },
    };
  });

  api.logger.info(`[${PLUGIN_ID}] Plugin initialization complete`);
}
