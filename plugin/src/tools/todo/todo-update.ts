import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, ToolResult } from '../../types.js';
import { toolResponse, toolError } from '../../utils/helpers.js';
import { TOOL_PREFIX } from '../../constants.js';
import { updateTodo, TodoStatus, TodoPriority } from './store.js';
import { extractSessionKey } from './session-key.js';

const TodoUpdateParamsSchema = Type.Object({
  id: Type.String({ description: 'Todo ID (e.g. todo-1)' }),
  status: Type.Optional(
    Type.Unsafe<TodoStatus>({
      type: 'string',
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      description: 'New status',
    }),
  ),
  priority: Type.Optional(
    Type.Unsafe<TodoPriority>({
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'New priority',
    }),
  ),
  content: Type.Optional(Type.String({ description: 'Updated content text' })),
});

type TodoUpdateParams = Static<typeof TodoUpdateParamsSchema>;

export function registerTodoUpdateTool(api: OmocPluginApi): void {
  api.registerTool<TodoUpdateParams>({
    name: `${TOOL_PREFIX}todo_update`,
    description:
      'Update a todo item status, priority, or content. ' +
      'Mark in_progress before starting a step, completed immediately after finishing.',
    parameters: TodoUpdateParamsSchema,
    optional: true,
    execute: async (
      _callId: string,
      params: TodoUpdateParams,
      options?: unknown,
    ): Promise<ToolResult> => {
      const id = params.id?.trim();
      if (!id) return toolError('id is required');

      if (!params.status && !params.priority && !params.content) {
        return toolError('At least one of status, priority, or content must be provided');
      }

      const sessionKey = extractSessionKey(options);
      const updated = updateTodo(
        id,
        {
          status: params.status,
          priority: params.priority,
          content: params.content,
        },
        sessionKey,
      );

      if (!updated) return toolResponse(JSON.stringify({ error: 'todo_not_found', id }));

      return toolResponse(JSON.stringify({ todo: updated }, null, 2));
    },
  });
}
