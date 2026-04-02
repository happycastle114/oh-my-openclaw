import type { OpenClawPluginApi } from '../types.js';
import { TodoItem, TodoStatus, _sessions } from '../tools/todo/store.js';

const STATUS_EMOJI: Record<TodoStatus, string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  cancelled: '❌',
};

function formatTodoList(todos: ReadonlyArray<TodoItem>): string {
  if (todos.length === 0) {
    return '📋 No todos found.';
  }

  const lines: string[] = ['# 📋 Todo List\n'];

  // Status summary
  const statusOrder: TodoStatus[] = ['in_progress', 'pending', 'completed', 'cancelled'];
  const counts: Partial<Record<TodoStatus, number>> = {};

  for (const todo of todos) {
    counts[todo.status] = (counts[todo.status] ?? 0) + 1;
  }

  const summaryParts: string[] = [];
  for (const status of statusOrder) {
    const count = counts[status];
    if (count && count > 0) {
      summaryParts.push(`${STATUS_EMOJI[status]} ${status}: ${count}`);
    }
  }
  lines.push(summaryParts.join(' | '));
  lines.push('');

  // List each todo
  for (const todo of todos) {
    const emoji = STATUS_EMOJI[todo.status] ?? '❓';
    const priority = todo.priority !== 'medium' ? ` [${todo.priority}]` : '';
    lines.push(`${emoji}${priority} **${todo.id}**: ${todo.content}`);
  }

  return lines.join('\n');
}

/**
 * Collect todos from ALL session stores.
 * Command handlers don't receive session context, so we aggregate
 * across every store to give the user a complete view.
 */
function collectAllTodos(): TodoItem[] {
  const all: TodoItem[] = [];
  for (const store of _sessions.values()) {
    all.push(...store.todos);
  }
  return all;
}

export function registerTodoCommands(api: OpenClawPluginApi): void {
  api.registerCommand({
    name: 'todos',
    description: 'Show current todo list (auto-reply, no AI invocation)',
    handler: () => {
      const todos = collectAllTodos();
      return { text: formatTodoList(todos) };
    },
  });
}
