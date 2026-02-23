import { OmocPluginApi, RalphLoopState } from '../types.js';
import { startLoop, stopLoop, getStatus } from '../services/ralph-loop.js';
import { getMessageCount } from '../hooks/message-monitor.js';
import { getConfig } from '../utils/config.js';

export function registerRalphCommands(api: OmocPluginApi) {
  // /ralph_loop command
  api.registerCommand({
    name: 'ralph_loop',
    description: 'Start the Ralph Loop self-completion mechanism',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const args = (ctx.args || '').trim().split(/\s+/).filter(Boolean);
      const config = getConfig(api);
      const maxIterations = args[0] ? parseInt(args[0], 10) : config.max_ralph_iterations;
      const taskFile = args[1] || '';

      if (isNaN(maxIterations) || maxIterations < 1) {
        return { text: 'Error: First argument must be a positive number (max iterations)' };
      }

      const result = await startLoop(taskFile, maxIterations);
      return {
        text: result.success
          ? `✅ Ralph Loop started\n- Max iterations: ${result.state.maxIterations}\n- Task file: ${result.state.taskFile || 'none'}\n- Started: ${result.state.startedAt}`
          : `❌ ${result.message}`,
      };
    },
  });

  // /ralph_stop command
  api.registerCommand({
    name: 'ralph_stop',
    description: 'Stop the active Ralph Loop',
    handler: async () => {
      const result = await stopLoop();
      return {
        text: `Ralph Loop stopped\n- Final iteration: ${result.state.iteration}/${result.state.maxIterations}\n- Was active: ${result.state.active}`,
      };
    },
  });

  // /omoc_status command
  api.registerCommand({
    name: 'omoc_status',
    description: 'Show Oh-My-OpenClaw plugin status',
    handler: async () => {
      const config = getConfig(api);
      const ralphState = await getStatus();
      const messageCount = getMessageCount();

      const lines = [
        '# Oh-My-OpenClaw Status',
        '',
        `## Ralph Loop: ${ralphState.active ? 'ACTIVE' : 'INACTIVE'}`,
        ralphState.active ? `  Iteration: ${ralphState.iteration}/${ralphState.maxIterations}` : '',
        ralphState.active ? `  Task: ${ralphState.taskFile || 'none'}` : '',
        ralphState.active ? `  Started: ${ralphState.startedAt}` : '',
        '',
        `## Todo Enforcer: ${config.todo_enforcer_enabled ? 'ENABLED' : 'DISABLED'}`,
        `  Cooldown: ${config.todo_enforcer_cooldown_ms}ms`,
        '',
        `## Comment Checker: ${config.comment_checker_enabled ? 'ENABLED' : 'DISABLED'}`,
        '',
        `## Messages Monitored: ${messageCount}`,
      ].filter((l) => l !== '');

      return { text: lines.join('\n') };
    },
  });
}
