export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TodoPriority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  createdAt: string;
}

interface SessionStore {
  todos: TodoItem[];
  nextId: number;
}

const DEFAULT_SESSION = '__default__';
const sessions = new Map<string, SessionStore>();

function getSession(sessionKey?: string): SessionStore {
  const key = sessionKey ?? DEFAULT_SESSION;
  let store = sessions.get(key);
  if (!store) {
    store = { todos: [], nextId: 1 };
    sessions.set(key, store);
  }
  return store;
}

export function createTodo(
  content: string,
  priority: TodoPriority = 'medium',
  status: TodoStatus = 'pending',
  sessionKey?: string,
): TodoItem {
  const store = getSession(sessionKey);
  const item: TodoItem = {
    id: `todo-${store.nextId++}`,
    content,
    status,
    priority,
    createdAt: new Date().toISOString(),
  };
  store.todos.push(item);
  return item;
}

export function listTodos(
  statusFilter?: TodoStatus,
  sessionKey?: string,
): ReadonlyArray<TodoItem> {
  const store = getSession(sessionKey);
  if (statusFilter) return store.todos.filter((t) => t.status === statusFilter);
  return store.todos;
}

export function findTodo(id: string, sessionKey?: string): TodoItem | undefined {
  const store = getSession(sessionKey);
  return store.todos.find((t) => t.id === id);
}

export function updateTodo(
  id: string,
  updates: Partial<Pick<TodoItem, 'status' | 'priority' | 'content'>>,
  sessionKey?: string,
): TodoItem | null {
  const store = getSession(sessionKey);
  const item = store.todos.find((t) => t.id === id);
  if (!item) return null;
  if (updates.status !== undefined) item.status = updates.status;
  if (updates.priority !== undefined) item.priority = updates.priority;
  if (updates.content !== undefined) item.content = updates.content;
  return item;
}

export function getIncompleteTodos(sessionKey?: string): ReadonlyArray<TodoItem> {
  const store = getSession(sessionKey);
  return store.todos.filter((t) => t.status === 'pending' || t.status === 'in_progress');
}

export function resetStore(sessionKey?: string): void {
  if (sessionKey) {
    sessions.delete(sessionKey);
  } else {
    sessions.clear();
  }
}

/** Exposed for testing only */
export { sessions as _sessions, DEFAULT_SESSION };
