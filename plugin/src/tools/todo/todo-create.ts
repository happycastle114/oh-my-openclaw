import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, ToolResult } from '../../types.js';
import { toolResponse, toolError } from '../../utils/helpers.js';
import { TOOL_PREFIX } from '../../constants.js';
import { createTodo, TodoPriority, TodoStatus } from './store.js';
import { extractSessionKey } from './session-key.js';

const TodoCreateParamsSchema = Type.Object({
  content: Type.String({ description: 'What needs to be done' }),
  priority: Type.Optional(
    Type.Unsafe<TodoPriority>({
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'Priority level (default: medium)',
    }),
  ),
  status: Type.Optional(
    Type.Unsafe<TodoStatus>({
      type: 'string',
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      description: 'Initial status (default: pending)',
    }),
  ),
});

type TodoCreateParams = Static<typeof TodoCreateParamsSchema>;

export function registerTodoCreateTool(api: OmocPluginApi): void {
  api.registerTool<TodoCreateParams>({
    name: `${TOOL_PREFIX}todo_create`,
    description:
      'Create a new todo item. Use this to plan work steps before starting. ' +
      'For multi-step tasks, create ALL todos first, then work through them one at a time.',
    parameters: TodoCreateParamsSchema,
    optional: true,
    execute: async (
      _callId: string,
      params: TodoCreateParams,
      options?: unknown,
    ): Promise<ToolResult> => {
      const content = params.content?.trim();
      if (!content) return toolError('content is required');

      const sessionKey = extractSessionKey(options);
      const item = createTodo(content, params.priority, params.status, sessionKey);
      return toolResponse(JSON.stringify({ todo: item }, null, 2));
    },
  });
}
