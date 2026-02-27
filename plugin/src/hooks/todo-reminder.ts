import { OmocPluginApi, TypedHookContext } from '../types.js';
import { TOOL_PREFIX, LOG_PREFIX } from '../constants.js';
import { getIncompleteTodos, resetStore } from '../tools/todo/store.js';
import { getConfig } from '../utils/config.js';
import { callHooksWake } from '../utils/webhook-client.js';

const TODO_TOOL_NAMES = new Set([
  `${TOOL_PREFIX}todo_create`,
  `${TOOL_PREFIX}todo_list`,
  `${TOOL_PREFIX}todo_update`,
]);

const TURN_THRESHOLD = 10;

const REMINDER_MESSAGE = `

---
⚠️ [OMOC Todo Reminder] You have used ${TURN_THRESHOLD}+ tool calls without checking your todo list.

**Action required:** Call \`${TOOL_PREFIX}todo_list\` to review pending todos before continuing.
Ensure you are not drifting from the plan. Mark completed todos, update in-progress ones.`;

interface ToolResultPayload {
  tool?: string;
  content?: string;
  [key: string]: unknown;
}

interface AgentEndEvent {
  messages: unknown[];
  success: boolean;
  error?: string;
  durationMs?: number;
}

const sessionCounters = new Map<string, number>();

function getSessionKey(payload: ToolResultPayload): string {
  const sessionId = (payload as Record<string, unknown>).sessionId;
  return typeof sessionId === 'string' ? sessionId : '__default__';
}

export function registerTodoReminder(api: OmocPluginApi): void {
  api.registerHook(
    'tool_result_persist',
    (payload: ToolResultPayload): ToolResultPayload | undefined => {
      const toolName = payload.tool;
      if (!toolName) return undefined;

      const sessionKey = getSessionKey(payload);

      if (TODO_TOOL_NAMES.has(toolName)) {
        sessionCounters.set(sessionKey, 0);
        return undefined;
      }

      const current = sessionCounters.get(sessionKey) ?? 0;
      const next = current + 1;
      sessionCounters.set(sessionKey, next);

      if (next >= TURN_THRESHOLD && next % TURN_THRESHOLD === 0) {
        const content = typeof payload.content === 'string' ? payload.content : '';
        return {
          ...payload,
          content: content + REMINDER_MESSAGE,
        };
      }

      return undefined;
    },
    {
      name: 'oh-my-openclaw.todo-reminder',
      description: 'Reminds agent to check todo list after prolonged non-todo tool usage',
    },
  );
}

export function registerAgentEndReminder(api: OmocPluginApi): void {
  api.on<AgentEndEvent, void>(
    'agent_end',
    async (_event: AgentEndEvent, ctx: TypedHookContext): Promise<void> => {
      try {
        const sessionKey = ctx.sessionKey ?? ctx.sessionId;
        const incomplete = getIncompleteTodos(sessionKey);
        if (incomplete.length === 0) return;

        const summary = incomplete
          .map((t) => `  - [${t.status}] ${t.id}: ${t.content}`)
          .join('\n');

        const warning =
          `⚠️ [OMOC] ${incomplete.length} incomplete todo(s):\n${summary}\n\n` +
          `Call \`${TOOL_PREFIX}todo_list\` to review and resume work.`;

        if (sessionKey) {
          api.runtime.system.enqueueSystemEvent(warning, { sessionKey });
        }

        const config = getConfig(api);
        if (config.webhook_bridge_enabled && config.hooks_token) {
          callHooksWake(
            `⚠️ Agent ended with ${incomplete.length} incomplete todo(s). Resume work.`,
            { gateway_url: config.gateway_url, hooks_token: config.hooks_token },
            api.logger,
          ).catch(() => {});
        }

        api.logger.warn(
          `${LOG_PREFIX} Agent ended with ${incomplete.length} incomplete todo(s)`,
        );
      } catch {
        // graceful degradation
      }
    },
    { priority: 50 },
  );
}

interface SessionStartEvent {
  sessionId: string;
  resumedFrom?: string;
}

interface SessionEndEvent {
  sessionId: string;
  messageCount: number;
  durationMs?: number;
}

function clearSession(sessionKey: string, api: OmocPluginApi, reason: string): void {
  resetStore(sessionKey);
  sessionCounters.delete(sessionKey);
  api.logger.info(`${LOG_PREFIX} Todo store cleared (${reason}, session=${sessionKey})`);
}

export function registerSessionCleanup(api: OmocPluginApi): void {
  api.on<SessionStartEvent, void>(
    'session_start',
    async (event: SessionStartEvent, ctx: TypedHookContext): Promise<void> => {
      if (event.resumedFrom) return;

      const sessionKey = ctx.sessionKey ?? ctx.sessionId ?? event.sessionId;
      if (!sessionKey) return;

      clearSession(sessionKey, api, 'new session');
    },
    { priority: 190 },
  );

  api.on<SessionEndEvent, void>(
    'session_end',
    async (event: SessionEndEvent, ctx: TypedHookContext): Promise<void> => {
      const sessionKey = ctx.sessionId ?? event.sessionId;
      if (!sessionKey) return;

      clearSession(sessionKey, api, 'session_end');
    },
    { priority: 50 },
  );
}

export function resetTodoReminderCounters(): void {
  sessionCounters.clear();
}

export { sessionCounters as _sessionCounters };
