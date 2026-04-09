import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, ToolResult } from '../../types.js';
import { toolResponse } from '../../utils/helpers.js';
import { TOOL_PREFIX } from '../../constants.js';
import { listTodos, TodoStatus } from './store.js';
import { resolveSessionKey } from './session-key.js';

const TodoListParamsSchema = Type.Object({
  status: Type.Optional(
    Type.Unsafe<TodoStatus>({
      type: 'string',
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      description: 'Filter by status (omit for all)',
    }),
  ),
});

type TodoListParams = Static<typeof TodoListParamsSchema>;

export function registerTodoListTool(api: OmocPluginApi): void {
  api.registerTool<TodoListParams>({
    name: `${TOOL_PREFIX}todo_list`,
    description:
      'List todo items. Call this FIRST to check existing todos before starting work. ' +
      'Shows all active todos by default, or filter by status.',
    parameters: TodoListParamsSchema,
    optional: true,
    execute: async (
      _callId: string,
      params: TodoListParams,
      options?: unknown,
    ): Promise<ToolResult> => {
      const sessionKey = resolveSessionKey(options);
      const items = listTodos(params.status, sessionKey);
      return toolResponse(JSON.stringify({ todos: items, count: items.length }, null, 2));
    },
  });
}
