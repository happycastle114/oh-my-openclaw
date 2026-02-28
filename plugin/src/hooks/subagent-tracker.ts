import { OmocPluginApi, TypedHookContext } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { trackSubagentSpawn, clearSubagentTracking, getCallerSessionKey, getTrackedSubagents } from '../services/webhook-bridge.js';
import { callHooksWake } from '../utils/webhook-client.js';
import { getConfig } from '../utils/config.js';

const SPAWN_TOOL_NAME = 'sessions_spawn';

interface ToolResultPayload {
  tool?: string;
  content?: string;
  sessionId?: string;
  [key: string]: unknown;
}


interface SubagentEndedEvent {
  runId?: string;
  reason?: string;
  outcome?: string;
  error?: unknown;
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

/**
 * Tries to find a tracked sub-agent from the message content.
 * Uses multiple strategies: runId match, childSessionKey match.
 * Falls back to keyword detection for single-tracked-agent case
 * only when multiple strong announce indicators are present.
 */
function findTrackedSubagentInContent(content: string): string | null {
  const tracked = getTrackedSubagents();
  if (tracked.size === 0) return null;

  // Strategy 1: Direct runId match in content
  const runIdMatch = content.match(/runId["\s:=]+["']?([a-zA-Z0-9_-]+)/);
  if (runIdMatch && tracked.has(runIdMatch[1])) {
    return runIdMatch[1];
  }

  // Strategy 2: childSessionKey match in content
  for (const [runId, entry] of tracked) {
    if (content.includes(entry.childSessionKey)) {
      return runId;
    }
  }

  // Strategy 3: Strong announce indicators (require at least 2)
  // Only used for unambiguous single-tracked-agent case
  if (tracked.size === 1) {
    const strongIndicators = [
      'Sub-agent', 'subagent', 'sub_agent',
      'Result:', 'Summary:',
    ];
    const matchCount = strongIndicators.filter((kw) => content.includes(kw)).length;
    // Require at least 2 strong indicators to avoid false positives
    if (matchCount >= 2) {
      const [onlyRunId] = tracked.keys();
      return onlyRunId;
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
        const callerSessionKey = typeof payload.sessionId === 'string'
          ? payload.sessionId
          : undefined;

        trackSubagentSpawn({
          ...spawnResult,
          spawnedAt: Date.now(),
          callerSessionKey,
        });
        api.logger.info(`${LOG_PREFIX} Tracking sub-agent spawn: runId=${spawnResult.runId}, callerSession=${callerSessionKey ?? 'unknown'}`);
      }

      return undefined;
    },
    {
      name: 'oh-my-openclaw.subagent-tracker',
      description: 'Tracks sessions_spawn results for stale sub-agent detection',
    },
  );


  api.on<SubagentEndedEvent, void>(
    'subagent_ended',
    async (event: SubagentEndedEvent, ctx: TypedHookContext): Promise<void> => {
      const runId = typeof event?.runId === 'string' ? event.runId : undefined;
      if (!runId) return;

      const tracked = getTrackedSubagents();
      const wasTracked = tracked.has(runId);
      const callerSession = getCallerSessionKey(runId);
      clearSubagentTracking(runId);

      if (!wasTracked) return;

      api.logger.info(`${LOG_PREFIX} subagent_ended received: runId=${runId} (callerSession=${callerSession ?? 'unknown'})`);

      const config = getConfig(api);
      if (config.webhook_bridge_enabled && config.gateway_url && config.hooks_token) {
        const requesterSessionKey = typeof (ctx as unknown as { requesterSessionKey?: unknown })?.requesterSessionKey === 'string'
          ? ((ctx as unknown as { requesterSessionKey?: string }).requesterSessionKey)
          : undefined;
        const wakeMessage = requesterSessionKey
          ? `[System] Sub-agent completed (runId=${runId}, requester=${requesterSessionKey}). Process the result and continue pending work.`
          : `[System] Sub-agent completed (runId=${runId}). Process the result and continue pending work.`;

        const targetSession = requesterSessionKey ?? callerSession;
        const result = await callHooksWake(
          wakeMessage,
          { gateway_url: config.gateway_url, hooks_token: config.hooks_token },
          api.logger,
          targetSession ? { sessionKey: targetSession } : undefined,
        );

        if (result.ok) {
          api.logger.info(`${LOG_PREFIX} Wake sent from subagent_ended: runId=${runId}`);
        } else {
          api.logger.warn(`${LOG_PREFIX} Wake from subagent_ended failed: ${result.error ?? `status ${result.status}`}`);
        }
      }
    },
    { priority: 120 },
  );

  api.registerHook(
    'message:received',
    (context: { content?: string; [key: string]: unknown }): typeof context | undefined => {
      const content = context?.content ?? '';

      // Skip empty/short messages
      if (content.length < 10) return undefined;

      // Try to find a tracked sub-agent in this message
      const matchedRunId = findTrackedSubagentInContent(content);
      if (!matchedRunId) return undefined;

      // Found a match — this is likely a sub-agent announce
      const callerSession = getCallerSessionKey(matchedRunId);
      clearSubagentTracking(matchedRunId);
      api.logger.info(`${LOG_PREFIX} Sub-agent announce detected: runId=${matchedRunId} (callerSession=${callerSession ?? 'unknown'})`);

      // Send wake to ensure the main agent processes the announce and continues work
      const config = getConfig(api);
      if (config.webhook_bridge_enabled && config.gateway_url && config.hooks_token) {
        void callHooksWake(
          `[System] Sub-agent completed (runId=${matchedRunId}). Process the announce result and continue any pending work.`,
          { gateway_url: config.gateway_url, hooks_token: config.hooks_token },
          api.logger,
          callerSession ? { sessionKey: callerSession } : undefined,
        ).then((result) => {
          if (result.ok) {
            api.logger.info(`${LOG_PREFIX} Wake sent after sub-agent announce: runId=${matchedRunId}`);
          } else {
            api.logger.warn(`${LOG_PREFIX} Wake after announce failed: ${result.error ?? `status ${result.status}`}`);
          }
        });
      }

      return undefined;
    },
    {
      name: 'oh-my-openclaw.subagent-announce-detector',
      description: 'Detects sub-agent announce messages via multi-strategy matching, clears stale tracking, and wakes main agent',
    },
  );
}

export { extractSpawnResult };
