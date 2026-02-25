import { OmocPluginApi, TypedHookContext } from '../types.js';
import { LOG_PREFIX } from '../constants.js';

const TURN_THRESHOLD = 10;

const REMINDER_MESSAGE = `

---
⚠️ [OMOC Todo Reminder] You have used ${TURN_THRESHOLD}+ tool calls without updating your todos.

**Action required:** Call \`todowrite\` to review and update your task progress.
Ensure you are not drifting from the plan.`;

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

export interface TodoItem {
  content: string;
  status: string;
  priority?: string;
}

// Session-scoped in-memory state
const sessionCounters = new Map<string, number>();
let lastTodoSnapshot: TodoItem[] = [];

function getSessionKey(payload: ToolResultPayload): string {
  const sessionId = (payload as Record<string, unknown>).sessionId;
  return typeof sessionId === 'string' ? sessionId : '__default__';
}

/**
 * Parse todowrite result content into a TodoItem array.
 * Handles both raw array and { todos: [...] } shapes.
 */
function parseTodoSnapshot(content: string): TodoItem[] {
  try {
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.todos)
        ? parsed.todos
        : null;
    if (!items) return [];
    return items.filter(
      (item: unknown): item is TodoItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as TodoItem).content === 'string' &&
        typeof (item as TodoItem).status === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Registers a tool_result_persist hook that:
 * 1. Intercepts `todowrite` calls to capture an in-memory todo snapshot
 * 2. Counts non-todowrite tool calls, appending a reminder every TURN_THRESHOLD calls
 */
export function registerTodoReminder(api: OmocPluginApi): void {
  api.registerHook(
    'tool_result_persist',
    (payload: ToolResultPayload): ToolResultPayload | undefined => {
      const toolName = payload.tool;
      if (!toolName) return undefined;

      const sessionKey = getSessionKey(payload);

      // Intercept todowrite to capture todo state
      if (toolName === 'todowrite') {
        sessionCounters.set(sessionKey, 0);
        if (typeof payload.content === 'string') {
          const snapshot = parseTodoSnapshot(payload.content);
          if (snapshot.length > 0) {
            lastTodoSnapshot = snapshot;
          }
        }
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
      description: 'Captures todowrite state and reminds agent to check todos after prolonged tool usage',
    },
  );
}

/**
 * Registers an agent_end hook that checks the captured todo snapshot
 * for incomplete items and fires enqueueSystemEvent if any exist.
 */
export function registerAgentEndReminder(api: OmocPluginApi): void {
  api.on<AgentEndEvent, void>(
    'agent_end',
    async (_event: AgentEndEvent, ctx: TypedHookContext): Promise<void> => {
      try {
        const incomplete = lastTodoSnapshot.filter(
          (t) => t.status === 'pending' || t.status === 'in_progress',
        );

        if (incomplete.length === 0) return;

        const summary = incomplete
          .map((t) => `  - [${t.status}] ${t.content}`)
          .join('\n');

        const warning =
          `⚠️ [OMOC] ${incomplete.length} incomplete todo(s):\n${summary}\n\n` +
          `Review your todos with \`todowrite\` when resuming work.`;

        const sessionKey = ctx.sessionKey ?? ctx.sessionId;
        if (sessionKey) {
          api.runtime.system.enqueueSystemEvent(warning, { sessionKey });
        }

        api.logger.warn(
          `${LOG_PREFIX} Agent ended with ${incomplete.length} incomplete todo(s)`,
        );
      } catch {
        // graceful degradation — don't break agent lifecycle
      }
    },
    { priority: 50 },
  );
}

export function resetTodoReminderCounters(): void {
  sessionCounters.clear();
  lastTodoSnapshot = [];
}

export function getLastTodoSnapshot(): ReadonlyArray<TodoItem> {
  return lastTodoSnapshot;
}

// Exposed for testing only
export { sessionCounters as _sessionCounters };
