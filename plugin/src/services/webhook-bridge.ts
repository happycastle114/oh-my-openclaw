import { OmocPluginApi, PLUGIN_ID } from '../types.js';
import { LOG_PREFIX, TOOL_PREFIX } from '../constants.js';
import { getConfig } from '../utils/config.js';
import { getIncompleteTodos } from '../tools/todo/store.js';
import { callHooksAgent, callHooksWake, WebhookConfig } from '../utils/webhook-client.js';

interface TrackedSubagent {
  runId: string;
  childSessionKey: string;
  task: string;
  spawnedAt: number;
}

const trackedSubagents = new Map<string, TrackedSubagent>();
let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function trackSubagentSpawn(entry: TrackedSubagent): void {
  trackedSubagents.set(entry.runId, entry);
}

export function clearSubagentTracking(runId: string): void {
  trackedSubagents.delete(runId);
}

export function getTrackedSubagents(): ReadonlyMap<string, TrackedSubagent> {
  return trackedSubagents;
}

export function resetWebhookBridgeState(): void {
  trackedSubagents.clear();
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

function buildWebhookConfig(api: OmocPluginApi): WebhookConfig {
  const config = getConfig(api);
  return {
    gateway_url: config.gateway_url,
    hooks_token: config.hooks_token,
  };
}

async function checkIncompleteTodos(api: OmocPluginApi): Promise<void> {
  const webhookConfig = buildWebhookConfig(api);
  const config = getConfig(api);

  const allSessionKeys = ['__default__', 'agent:main:main'];
  let totalIncomplete = 0;
  const summaryParts: string[] = [];

  for (const sessionKey of allSessionKeys) {
    const incomplete = getIncompleteTodos(sessionKey);
    if (incomplete.length > 0) {
      totalIncomplete += incomplete.length;
      const items = incomplete.map((t) => `  - [${t.status}] ${t.content}`).join('\n');
      summaryParts.push(items);
    }
  }

  if (totalIncomplete === 0) return;

  const summary = summaryParts.join('\n');
  const message =
    `[OmOC Periodic Reminder] You have ${totalIncomplete} incomplete todo(s):\n${summary}\n\n` +
    `Review with \`${TOOL_PREFIX}todo_list\` and resume work. ` +
    `If blocked, update todo status. If all done, mark them complete.`;

  const result = await callHooksAgent(message, webhookConfig, {
    name: 'OmOC-TodoReminder',
    deliver: false,
  }, api.logger);

  if (result.ok) {
    api.logger.info(`${LOG_PREFIX} Periodic todo reminder sent via hooks/agent (${totalIncomplete} incomplete)`);
  }
}

async function checkStaleSubagents(api: OmocPluginApi): Promise<void> {
  const webhookConfig = buildWebhookConfig(api);
  const config = getConfig(api);
  const threshold = config.webhook_subagent_stale_threshold_ms;
  const now = Date.now();

  const stale: TrackedSubagent[] = [];
  for (const entry of trackedSubagents.values()) {
    if (now - entry.spawnedAt > threshold) {
      stale.push(entry);
    }
  }

  if (stale.length === 0) return;

  const details = stale
    .map((s) => `  - runId=${s.runId} task="${s.task.substring(0, 80)}" (${Math.round((now - s.spawnedAt) / 60000)}m ago)`)
    .join('\n');

  const message =
    `[OmOC Sub-agent Alert] ${stale.length} sub-agent(s) may have completed without announce:\n${details}\n\n` +
    `Check sub-agent status with \`/subagents list\` or \`/subagents info <id>\`. ` +
    `If completed, collect results and proceed. If still running, wait.`;

  const result = await callHooksWake(message, webhookConfig, api.logger);

  if (result.ok) {
    api.logger.info(`${LOG_PREFIX} Stale sub-agent alert sent via hooks/wake (${stale.length} stale)`);
    for (const s of stale) {
      trackedSubagents.delete(s.runId);
    }
  }
}

export function registerWebhookBridge(api: OmocPluginApi): void {
  const config = getConfig(api);

  api.registerService({
    id: 'omoc-webhook-bridge',
    start: async () => {
      if (!config.webhook_bridge_enabled) {
        api.logger.info(`${LOG_PREFIX} Webhook bridge disabled (set webhook_bridge_enabled: true to enable)`);
        return;
      }

      if (!config.hooks_token) {
        api.logger.warn(`${LOG_PREFIX} Webhook bridge enabled but hooks_token is empty — skipping`);
        return;
      }

      const intervalMs = Math.max(config.webhook_reminder_interval_ms, 30_000);

      reminderTimer = setInterval(async () => {
        try {
          await checkIncompleteTodos(api);
          await checkStaleSubagents(api);
        } catch (err) {
          api.logger.warn(`${LOG_PREFIX} Webhook bridge tick error:`, err);
        }
      }, intervalMs);

      api.logger.info(
        `${LOG_PREFIX} Webhook bridge started (interval=${intervalMs}ms, stale_threshold=${config.webhook_subagent_stale_threshold_ms}ms)`,
      );
    },
    stop: async () => {
      if (reminderTimer) {
        clearInterval(reminderTimer);
        reminderTimer = null;
      }
      trackedSubagents.clear();
      api.logger.info(`${LOG_PREFIX} Webhook bridge stopped`);
    },
  });
}
