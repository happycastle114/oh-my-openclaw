// Oh-My-OpenClaw Plugin - Entry Point
// 完全使用 OpenClaw Plugin SDK

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { VERSION } from './version.js';
import { PLUGIN_ID } from './types.js';
import { getPluginConfig } from './types.js';
import { registerTodoEnforcer } from './hooks/todo-enforcer.js';
import { registerCommentChecker } from './hooks/comment-checker.js';
import { registerMessageMonitor } from './hooks/message-monitor.js';
import { registerStartupHook } from './hooks/startup.js';
import { registerRalphLoop } from './services/ralph-loop.js';
import { registerWebhookBridge } from './services/webhook-bridge.js';
import { registerSubagentTracker } from './hooks/subagent-tracker.js';
import { registerDelegateTool } from './tools/task-delegation.js';
import { registerOmoDelegateTool } from './tools/omo-delegation.js';
import { registerLookAtTool } from './tools/look-at.js';
import { registerCheckpointTool } from './tools/checkpoint.js';
import { registerWebSearchTool } from './tools/web-search.js';
import { registerRalphCommands } from './commands/ralph-commands.js';
import { registerStatusCommands } from './commands/status-commands.js';
import { registerPersonaCommands } from './commands/persona-commands.js';
import { registerTodoCommands } from './commands/todo-commands.js';
import { registerContextInjector } from './hooks/context-injector.js';
import { registerGuardrailInjector } from './hooks/guardrail-injector.js';
import { registerSessionSync } from './hooks/session-sync.js';
import { registerSpawnGuard } from './hooks/spawn-guard.js';
import { registerKeywordDetector } from './hooks/keyword-detector/hook.js';
import { registerTodoReminder, registerAgentEndReminder, registerSessionCleanup } from './hooks/todo-reminder.js';
import { registerTodoTools } from './tools/todo/index.js';
import { registerSetupCli } from './cli/setup.js';
import { initPersonaState } from './utils/persona-state.js';

/**
 * Plugin registry counters
 */
let hookCount = 0;
let toolCount = 0;
let commandCount = 0;
let serviceCount = 0;

/**
 * Oh-My-OpenClaw Plugin Registration
 */
export default function register(api: OpenClawPluginApi) {
  hookCount = 0;
  toolCount = 0;
  commandCount = 0;
  serviceCount = 0;

  const config = getPluginConfig(api);

  api.logger.info(`[${PLUGIN_ID}] Initializing plugin v${VERSION}`);
  api.logger.info(`[${PLUGIN_ID}] Configuration: max_ralph_iterations=${config.max_ralph_iterations}, todo_enforcer=${config.todo_enforcer_enabled}`);

  // Initialize persona state
  initPersonaState(api);

  // Register hooks
  registerStartupHook(api); hookCount++;
  registerTodoEnforcer(api); hookCount++;
  registerCommentChecker(api); hookCount++;
  registerMessageMonitor(api); hookCount++;
  registerSubagentTracker(api); hookCount++;
  registerContextInjector(api); hookCount++;
  registerGuardrailInjector(api); hookCount++;
  registerSessionSync(api); hookCount++;
  registerSpawnGuard(api); hookCount++;
  registerKeywordDetector(api); hookCount++;
  registerTodoReminder(api); hookCount += 3; // 3 hooks
  registerAgentEndReminder(api); hookCount++;

  // Register tools
  registerDelegateTool(api); toolCount++;
  registerOmoDelegateTool(api); toolCount++;
  registerLookAtTool(api); toolCount++;
  registerCheckpointTool(api); toolCount++;
  registerWebSearchTool(api); toolCount++;
  registerTodoTools(api); toolCount += 4; // 4 todo tools

  // Register commands
  registerRalphCommands(api); commandCount += 2; // /ralph_loop, /ralph_stop
  registerStatusCommands(api); commandCount += 3; // /omoc_status, /omoc_health, /omoc_config
  registerPersonaCommands(api); commandCount += 2; // /omoc, /omoc_personas
  registerTodoCommands(api); commandCount += 4; // /todos + 3 todo commands

  // Register services
  registerRalphLoop(api); serviceCount++;
  registerWebhookBridge(api); serviceCount++;

  // Register CLI
  api.registerCli((ctx: { program: any; workspaceDir?: string; logger: any }) => {
    registerSetupCli({ program: ctx.program, workspaceDir: ctx.workspaceDir, logger: ctx.logger });
  }, { commands: ['omoc-setup'] });

  api.logger.info(`[${PLUGIN_ID}] Plugin initialized with ${toolCount} tools, ${commandCount} commands, ${hookCount} hooks, ${serviceCount} services`);
}

export { register };
export { hookCount, toolCount, commandCount, serviceCount };
