import { OmocPluginApi, PLUGIN_ID } from './types.js';
import { getConfig } from './utils/config.js';
import { registerTodoEnforcer } from './hooks/todo-enforcer.js';
import { registerCommentChecker } from './hooks/comment-checker.js';
import { registerMessageMonitor } from './hooks/message-monitor.js';
import { registerRalphLoop } from './services/ralph-loop.js';
import { registerDelegateTool } from './tools/task-delegation.js';
import { registerLookAtTool } from './tools/look-at.js';
import { registerCheckpointTool } from './tools/checkpoint.js';
import { registerWorkflowCommands } from './commands/workflow-commands.js';
import { registerRalphCommands } from './commands/ralph-commands.js';

export default function register(api: OmocPluginApi) {
  const config = getConfig(api);

  api.logger.info(`[${PLUGIN_ID}] Initializing plugin v0.1.0`);

  try {
    registerTodoEnforcer(api);
    api.logger.info(`[${PLUGIN_ID}] Todo Enforcer hook registered (enabled: ${config.todo_enforcer_enabled})`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Todo Enforcer:`, err);
  }

  try {
    registerCommentChecker(api);
    api.logger.info(`[${PLUGIN_ID}] Comment Checker hook registered (enabled: ${config.comment_checker_enabled})`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Comment Checker:`, err);
  }

  try {
    registerMessageMonitor(api);
    api.logger.info(`[${PLUGIN_ID}] Message Monitor hook registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Message Monitor:`, err);
  }

  try {
    registerRalphLoop(api);
    api.logger.info(`[${PLUGIN_ID}] Ralph Loop service registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Ralph Loop:`, err);
  }


  try {
    registerDelegateTool(api);
    api.logger.info(`[${PLUGIN_ID}] Delegate tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Delegate tool:`, err);
  }

  try {
    registerLookAtTool(api);
    api.logger.info(`[${PLUGIN_ID}] Look-At tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Look-At tool:`, err);
  }

  try {
    registerCheckpointTool(api);
    api.logger.info(`[${PLUGIN_ID}] Checkpoint tool registered`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Checkpoint tool:`, err);
  }

  try {
    registerWorkflowCommands(api);
    api.logger.info(`[${PLUGIN_ID}] Workflow commands registered (ultrawork, plan, start-work)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Workflow commands:`, err);
  }

  try {
    registerRalphCommands(api);
    api.logger.info(`[${PLUGIN_ID}] Ralph commands registered (ralph-loop, ralph-stop, omoc-status)`);
  } catch (err) {
    api.logger.error(`[${PLUGIN_ID}] Failed to register Ralph commands:`, err);
  }

  api.registerGatewayMethod('oh-my-openclaw.status', () => {
    return {
      ok: true,
      plugin: PLUGIN_ID,
      version: '0.1.0',
      hooks: ['todo-enforcer', 'comment-checker', 'message-monitor'],
      services: ['ralph-loop'],
      tools: ['omoc_delegate', 'omoc_look_at', 'omoc_checkpoint'],
      commands: ['ultrawork', 'plan', 'start-work', 'ralph-loop', 'ralph-stop', 'omoc-status'],
      config: {
        todo_enforcer_enabled: config.todo_enforcer_enabled,
        comment_checker_enabled: config.comment_checker_enabled,
        max_ralph_iterations: config.max_ralph_iterations,
      },
    };
  });

  api.logger.info(`[${PLUGIN_ID}] Plugin initialization complete`);
}
