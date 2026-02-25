import { OmocPluginApi } from '../../types.js';
import { registerTodoCreateTool } from './todo-create.js';
import { registerTodoListTool } from './todo-list.js';
import { registerTodoUpdateTool } from './todo-update.js';

export function registerTodoTools(api: OmocPluginApi): void {
  registerTodoCreateTool(api);
  registerTodoListTool(api);
  registerTodoUpdateTool(api);
}
