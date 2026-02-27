import { OmocPluginApi } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { trackSubagentSpawn, clearSubagentTracking } from '../services/webhook-bridge.js';
import { callHooksWake } from '../utils/webhook-client.js';
import { getConfig } from '../utils/config.js';

const SPAWN_TOOL_NAME = 'sessions_spawn';

interface ToolResultPayload {
  tool?: string;
  content?: string;
  [key: string]: unknown;
}

function extractSpawnResult(content: string): { runId: string; childSessionKey: string; task: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.status === 'accepted' && parsed.runId && parsed.childSessionKey) {
      return {
        runId: parsed.runId,
        childSessionKey: parsed.childSessionKey,
        task: parsed.task ?? '',
      };
    }
  } catch {
    const runIdMatch = content.match(/runId["\s:]+["']?([a-zA-Z0-9_-]+)/);
    const sessionKeyMatch = content.match(/childSessionKey["\s:]+["']?([a-zA-Z0-9:_-]+)/);
    if (runIdMatch && sessionKeyMatch) {
      return {
        runId: runIdMatch[1],
        childSessionKey: sessionKeyMatch[1],
        task: '',
      };
    }
  }

  return null;
}

export function registerSubagentTracker(api: OmocPluginApi): void {
  api.registerHook(
    'tool_result_persist',
    (payload: ToolResultPayload): ToolResultPayload | undefined => {
      if (payload.tool !== SPAWN_TOOL_NAME) return undefined;

      const content = typeof payload.content === 'string' ? payload.content : '';
      const spawnResult = extractSpawnResult(content);

      if (spawnResult) {
        trackSubagentSpawn({
          ...spawnResult,
          spawnedAt: Date.now(),
        });
        api.logger.info(`${LOG_PREFIX} Tracking sub-agent spawn: runId=${spawnResult.runId}`);
      }

      return undefined;
    },
    {
      name: 'oh-my-openclaw.subagent-tracker',
      description: 'Tracks sessions_spawn results for stale sub-agent detection',
    },
  );

  api.registerHook(
    'message:received',
    (context: { content?: string; [key: string]: unknown }): typeof context | undefined => {
      const content = context?.content ?? '';
      if (!content.includes('Sub-agent') && !content.includes('subagent') && !content.includes('announce')) {
        return undefined;
      }

      const runIdMatch = content.match(/runId["\s:=]+["']?([a-zA-Z0-9_-]+)/);
      if (runIdMatch) {
        clearSubagentTracking(runIdMatch[1]);
        api.logger.info(`${LOG_PREFIX} Cleared sub-agent tracking: runId=${runIdMatch[1]} (announce received)`);

        // Send wake to ensure the main agent processes the announce and continues work
        const config = getConfig(api);
        if (config.webhook_bridge_enabled && config.gateway_url && config.hooks_token) {
          void callHooksWake(
            `[System] Sub-agent completed (runId=${runIdMatch[1]}). Process the announce result and continue any pending work.`,
            { gateway_url: config.gateway_url, hooks_token: config.hooks_token },
            api.logger,
          ).then((result) => {
            if (result.ok) {
              api.logger.info(`${LOG_PREFIX} Wake sent after sub-agent announce: runId=${runIdMatch[1]}`);
            } else {
              api.logger.warn(`${LOG_PREFIX} Wake after announce failed: ${result.error ?? `status ${result.status}`}`);
            }
          });
        }
      }

      return undefined;
    },
    {
      name: 'oh-my-openclaw.subagent-announce-detector',
      description: 'Detects sub-agent announce messages, clears stale tracking, and wakes main agent',
    },
  );
}

export { extractSpawnResult };
