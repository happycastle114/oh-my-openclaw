import { OmocPluginApi, PLUGIN_ID } from '../types.js';
import { VERSION } from '../version.js';
import { getConfig } from '../utils/config.js';
import { getStatus as getRalphStatus } from '../services/ralph-loop.js';
import { getMessageCount } from '../hooks/message-monitor.js';

export function registerStatusCommands(api: OmocPluginApi) {
  api.registerCommand({
    name: 'omoc_health',
    description: 'Plugin health check (auto-reply, no AI invocation)',
    handler: async () => {
      const config = getConfig(api);
      const ralphState = await getRalphStatus();
      const messageCount = getMessageCount();

      return {
        text: [
          `# ${PLUGIN_ID} Health`,
          `- Version: ${VERSION}`,
          `- Ralph Loop: ${ralphState.active ? 'ACTIVE' : 'INACTIVE'}`,
          `- Todo Enforcer: ${config.todo_enforcer_enabled ? 'ON' : 'OFF'}`,
          `- Comment Checker: ${config.comment_checker_enabled ? 'ON' : 'OFF'}`,
          `- Messages Tracked: ${messageCount}`,
        ].join('\n'),
      };
    },
  });

  api.registerCommand({
    name: 'omoc_config',
    description: 'Show current plugin configuration (auto-reply)',
    handler: () => {
      const config = getConfig(api);

      const safeConfig: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string' && (key.includes('token') || key.includes('secret') || key.includes('key'))) {
          safeConfig[key] = '***';
        } else {
          safeConfig[key] = value;
        }
      }

      return {
        text: `# ${PLUGIN_ID} Configuration\n\`\`\`json\n${JSON.stringify(safeConfig, null, 2)}\n\`\`\``,
      };
    },
  });
}
