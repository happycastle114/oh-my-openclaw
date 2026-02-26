import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  createTodo,
  listTodos,
  updateTodo,
  findTodo,
  getIncompleteTodos,
  resetStore,
  _sessions,
  DEFAULT_SESSION,
} from '../tools/todo/store.js';
import { extractSessionKey } from '../tools/todo/session-key.js';
import {
  registerTodoReminder,
  registerAgentEndReminder,
  registerSessionCleanup,
  resetTodoReminderCounters,
  _sessionCounters,
} from '../hooks/todo-reminder.js';
import { createMockApi, createMockContext } from './helpers/mock-factory.js';

const createMockApiAny = createMockApi as (...args: any[]) => any;

function getHookHandler(mockApi: any, callIndex = 0) {
  return mockApi.registerHook.mock.calls[callIndex][1];
}

function getOnHandler(mockApi: any, hookName: string) {
  const call = mockApi.on.mock.calls.find((c: any) => c[0] === hookName);
  return call ? call[1] : undefined;
}

// ---------------------------------------------------------------------------
// Store: session-scoped CRUD
// ---------------------------------------------------------------------------
describe('Todo Store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('createTodo', () => {
    it('creates a todo with defaults', () => {
      const item = createTodo('Write tests');
      expect(item.id).toBe('todo-1');
      expect(item.content).toBe('Write tests');
      expect(item.status).toBe('pending');
      expect(item.priority).toBe('medium');
      expect(item.createdAt).toBeTruthy();
    });

    it('creates a todo with explicit priority and status', () => {
      const item = createTodo('Deploy', 'high', 'in_progress');
      expect(item.priority).toBe('high');
      expect(item.status).toBe('in_progress');
    });

    it('auto-increments id per session', () => {
      const a = createTodo('A');
      const b = createTodo('B');
      expect(a.id).toBe('todo-1');
      expect(b.id).toBe('todo-2');
    });
  });

  describe('listTodos', () => {
    it('returns all todos when no filter', () => {
      createTodo('A');
      createTodo('B', 'low', 'completed');
      expect(listTodos()).toHaveLength(2);
    });

    it('filters by status', () => {
      createTodo('A');
      createTodo('B', 'low', 'completed');
      expect(listTodos('pending')).toHaveLength(1);
      expect(listTodos('completed')).toHaveLength(1);
      expect(listTodos('in_progress')).toHaveLength(0);
    });
  });

  describe('findTodo', () => {
    it('finds existing todo by id', () => {
      createTodo('Find me');
      const found = findTodo('todo-1');
      expect(found?.content).toBe('Find me');
    });

    it('returns undefined for missing id', () => {
      expect(findTodo('todo-999')).toBeUndefined();
    });
  });

  describe('updateTodo', () => {
    it('updates status', () => {
      createTodo('Task');
      const updated = updateTodo('todo-1', { status: 'completed' });
      expect(updated?.status).toBe('completed');
    });

    it('updates priority and content', () => {
      createTodo('Old');
      const updated = updateTodo('todo-1', { priority: 'high', content: 'New' });
      expect(updated?.priority).toBe('high');
      expect(updated?.content).toBe('New');
    });

    it('returns null for missing id', () => {
      expect(updateTodo('nope', { status: 'completed' })).toBeNull();
    });
  });

  describe('getIncompleteTodos', () => {
    it('returns pending and in_progress items only', () => {
      createTodo('A', 'high', 'pending');
      createTodo('B', 'medium', 'in_progress');
      createTodo('C', 'low', 'completed');
      createTodo('D', 'low', 'cancelled');
      expect(getIncompleteTodos()).toHaveLength(2);
    });
  });

  describe('session isolation', () => {
    it('isolates todos by sessionKey', () => {
      createTodo('Session A todo', 'medium', 'pending', 'session-a');
      createTodo('Session B todo', 'medium', 'pending', 'session-b');

      expect(listTodos(undefined, 'session-a')).toHaveLength(1);
      expect(listTodos(undefined, 'session-b')).toHaveLength(1);
      expect(listTodos(undefined, 'session-a')[0].content).toBe('Session A todo');
      expect(listTodos(undefined, 'session-b')[0].content).toBe('Session B todo');
    });

    it('uses default session when sessionKey is undefined', () => {
      createTodo('Default');
      expect(listTodos()).toHaveLength(1);
      expect(_sessions.has(DEFAULT_SESSION)).toBe(true);
    });

    it('increments ids independently per session', () => {
      const a1 = createTodo('A1', 'medium', 'pending', 'sess-a');
      const b1 = createTodo('B1', 'medium', 'pending', 'sess-b');
      expect(a1.id).toBe('todo-1');
      expect(b1.id).toBe('todo-1');
    });

    it('resetStore with sessionKey clears only that session', () => {
      createTodo('A', 'medium', 'pending', 'sess-a');
      createTodo('B', 'medium', 'pending', 'sess-b');
      resetStore('sess-a');
      expect(listTodos(undefined, 'sess-a')).toHaveLength(0);
      expect(listTodos(undefined, 'sess-b')).toHaveLength(1);
    });

    it('resetStore without sessionKey clears all sessions', () => {
      createTodo('A', 'medium', 'pending', 'sess-a');
      createTodo('B', 'medium', 'pending', 'sess-b');
      resetStore();
      expect(_sessions.size).toBe(0);
    });

    it('getIncompleteTodos respects sessionKey', () => {
      createTodo('Pending', 'high', 'pending', 'sess-x');
      createTodo('Done', 'low', 'completed', 'sess-y');
      expect(getIncompleteTodos('sess-x')).toHaveLength(1);
      expect(getIncompleteTodos('sess-y')).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// extractSessionKey utility
// ---------------------------------------------------------------------------
describe('extractSessionKey', () => {
  it('extracts sessionKey from options object', () => {
    expect(extractSessionKey({ sessionKey: 'sk-123' })).toBe('sk-123');
  });

  it('falls back to sessionId', () => {
    expect(extractSessionKey({ sessionId: 'sid-456' })).toBe('sid-456');
  });

  it('prefers sessionKey over sessionId', () => {
    expect(extractSessionKey({ sessionKey: 'sk', sessionId: 'sid' })).toBe('sk');
  });

  it('returns undefined for null/undefined/non-object', () => {
    expect(extractSessionKey(undefined)).toBeUndefined();
    expect(extractSessionKey(null)).toBeUndefined();
    expect(extractSessionKey('string')).toBeUndefined();
    expect(extractSessionKey(42)).toBeUndefined();
  });

  it('returns undefined when neither key is present', () => {
    expect(extractSessionKey({ other: 'value' })).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Todo Reminder Hook (tool_result_persist)
// ---------------------------------------------------------------------------
describe('Todo Reminder Hook', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTodoReminderCounters();
    mockApi = createMockApiAny();
  });

  it('registers hook on tool_result_persist', () => {
    registerTodoReminder(mockApi);

    expect(mockApi.registerHook).toHaveBeenCalledOnce();
    expect(mockApi.registerHook.mock.calls[0][0]).toBe('tool_result_persist');
    expect(mockApi.registerHook.mock.calls[0][2]).toEqual({
      name: 'oh-my-openclaw.todo-reminder',
      description: 'Reminds agent to check todo list after prolonged non-todo tool usage',
    });
  });

  it('returns undefined for omoc_todo_* calls (resets counter)', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    expect(handler({ tool: 'omoc_todo_create', content: '{}' })).toBeUndefined();
    expect(handler({ tool: 'omoc_todo_list', content: '{}' })).toBeUndefined();
    expect(handler({ tool: 'omoc_todo_update', content: '{}' })).toBeUndefined();
  });

  it('resets counter on omoc_todo_* usage', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 8; i++) {
      handler({ tool: 'some_tool', content: 'result' });
    }
    expect(_sessionCounters.get('__default__')).toBe(8);

    handler({ tool: 'omoc_todo_list', content: '[]' });
    expect(_sessionCounters.get('__default__')).toBe(0);
  });

  it('appends reminder after 10 non-todo tool calls', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 9; i++) {
      const result = handler({ tool: 'other_tool', content: 'result' });
      expect(result).toBeUndefined();
    }

    const result = handler({ tool: 'other_tool', content: 'original content' });
    expect(result).toBeDefined();
    expect(result.content).toContain('original content');
    expect(result.content).toContain('[OMOC Todo Reminder]');
    expect(result.content).toContain('omoc_todo_list');
  });

  it('appends reminder again at 20 calls', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 19; i++) {
      handler({ tool: 'other_tool', content: 'result' });
    }

    const result = handler({ tool: 'other_tool', content: 'content at 20' });
    expect(result).toBeDefined();
    expect(result.content).toContain('[OMOC Todo Reminder]');
  });

  it('does not append reminder at non-threshold counts', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 10; i++) {
      handler({ tool: 'other_tool', content: 'result' });
    }

    const result = handler({ tool: 'other_tool', content: 'result at 11' });
    expect(result).toBeUndefined();
  });

  it('returns undefined when tool name is missing', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    const result = handler({ content: 'no tool' });
    expect(result).toBeUndefined();
  });

  it('tracks counters per session', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 10; i++) {
      handler({ tool: 'other_tool', content: 'result', sessionId: 'sess-a' });
    }

    const resultA = handler({ tool: 'other_tool', content: 'result', sessionId: 'sess-a' });
    expect(resultA).toBeUndefined();

    for (let i = 0; i < 9; i++) {
      handler({ tool: 'other_tool', content: 'result', sessionId: 'sess-b' });
    }
    const resultB = handler({ tool: 'other_tool', content: 'result', sessionId: 'sess-b' });
    expect(resultB).toBeDefined();
    expect(resultB.content).toContain('[OMOC Todo Reminder]');
  });
});

// ---------------------------------------------------------------------------
// Agent End Reminder (agent_end + enqueueSystemEvent)
// ---------------------------------------------------------------------------
describe('Agent End Reminder', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTodoReminderCounters();
    resetStore();
    mockApi = createMockApiAny();
  });

  it('registers on agent_end hook', () => {
    registerAgentEndReminder(mockApi);

    expect(mockApi.on).toHaveBeenCalledOnce();
    expect(mockApi.on.mock.calls[0][0]).toBe('agent_end');
    expect(mockApi.on.mock.calls[0][2]).toEqual({ priority: 50 });
  });

  it('fires enqueueSystemEvent when incomplete todos exist', async () => {
    createTodo('Implement auth', 'high', 'pending', 'test-session');
    createTodo('Write tests', 'medium', 'in_progress', 'test-session');
    createTodo('Deploy', 'low', 'completed', 'test-session');

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.runtime.system.enqueueSystemEvent).toHaveBeenCalledOnce();
    const [warning, opts] = mockApi.runtime.system.enqueueSystemEvent.mock.calls[0];
    expect(warning).toContain('2 incomplete todo(s)');
    expect(warning).toContain('Implement auth');
    expect(warning).toContain('Write tests');
    expect(warning).not.toContain('Deploy');
    expect(warning).toContain('omoc_todo_list');
    expect(opts.sessionKey).toBe('test-session');
  });

  it('does not fire when all todos are complete', async () => {
    createTodo('Task A', 'high', 'completed', 'test-session');
    createTodo('Task B', 'medium', 'completed', 'test-session');

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.runtime.system.enqueueSystemEvent).not.toHaveBeenCalled();
  });

  it('does not fire when no todos exist', async () => {
    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.runtime.system.enqueueSystemEvent).not.toHaveBeenCalled();
  });

  it('falls back to sessionId when sessionKey is absent', async () => {
    createTodo('Pending task', 'high', 'pending', 'fallback-id');

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: undefined, sessionId: 'fallback-id' });

    await handler({ messages: [], success: true }, ctx);

    const [, opts] = mockApi.runtime.system.enqueueSystemEvent.mock.calls[0];
    expect(opts.sessionKey).toBe('fallback-id');
  });

  it('does not throw on errors (graceful degradation)', async () => {
    createTodo('Pending', 'high', 'pending', 'test-session');

    mockApi.runtime.system.enqueueSystemEvent.mockImplementation(() => {
      throw new Error('system event failure');
    });

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await expect(handler({ messages: [], success: false }, ctx)).resolves.not.toThrow();
  });

  it('logs warning when incomplete todos found', async () => {
    createTodo('Pending', 'high', 'pending', 'test-session');

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('1 incomplete todo(s)'),
    );
  });
});

// ---------------------------------------------------------------------------
// Session Cleanup (session_start + session_end clear store)
// ---------------------------------------------------------------------------
describe('Session Cleanup', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTodoReminderCounters();
    resetStore();
    mockApi = createMockApiAny();
  });

  it('registers on both session_start and session_end hooks', () => {
    registerSessionCleanup(mockApi);

    expect(mockApi.on).toHaveBeenCalledTimes(2);
    expect(mockApi.on.mock.calls[0][0]).toBe('session_start');
    expect(mockApi.on.mock.calls[0][2]).toEqual({ priority: 190 });
    expect(mockApi.on.mock.calls[1][0]).toBe('session_end');
    expect(mockApi.on.mock.calls[1][2]).toEqual({ priority: 50 });
  });

  describe('session_start', () => {
    it('clears store and counter for new sessions (no resumedFrom)', async () => {
      createTodo('Leftover task', 'high', 'pending', 'sess-abc');
      _sessionCounters.set('sess-abc', 7);

      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_start');
      const ctx = createMockContext({ sessionKey: 'sess-abc' });

      await handler({ sessionId: 'sess-abc' }, ctx);

      expect(listTodos(undefined, 'sess-abc')).toHaveLength(0);
      expect(_sessionCounters.has('sess-abc')).toBe(false);
    });

    it('preserves store for resumed sessions', async () => {
      createTodo('Keep me', 'high', 'pending', 'sess-resume');

      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_start');
      const ctx = createMockContext({ sessionKey: 'sess-resume' });

      await handler({ sessionId: 'sess-resume', resumedFrom: 'old-sess' }, ctx);

      expect(listTodos(undefined, 'sess-resume')).toHaveLength(1);
    });

    it('falls back to event.sessionId when ctx keys are absent', async () => {
      createTodo('Orphan', 'medium', 'pending', 'evt-sid');

      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_start');
      const ctx = createMockContext({ sessionKey: undefined, sessionId: undefined });

      await handler({ sessionId: 'evt-sid' }, ctx);

      expect(listTodos(undefined, 'evt-sid')).toHaveLength(0);
    });
  });

  describe('session_end', () => {
    it('clears store and counter on session end', async () => {
      createTodo('Stale task', 'high', 'pending', 'sess-end');
      _sessionCounters.set('sess-end', 5);

      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_end');
      const ctx = createMockContext({ sessionId: 'sess-end' });

      await handler({ sessionId: 'sess-end', messageCount: 42 }, ctx);

      expect(listTodos(undefined, 'sess-end')).toHaveLength(0);
      expect(_sessionCounters.has('sess-end')).toBe(false);
    });

    it('uses event.sessionId as fallback', async () => {
      createTodo('Orphan end', 'medium', 'pending', 'evt-end');

      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_end');
      const ctx = createMockContext({ sessionKey: undefined, sessionId: undefined });

      await handler({ sessionId: 'evt-end', messageCount: 10 }, ctx);

      expect(listTodos(undefined, 'evt-end')).toHaveLength(0);
    });

    it('does not throw when sessionId is missing', async () => {
      registerSessionCleanup(mockApi);
      const handler = getOnHandler(mockApi, 'session_end');
      const ctx = createMockContext({ sessionKey: undefined, sessionId: undefined });

      await expect(
        handler({ sessionId: '', messageCount: 0 }, ctx),
      ).resolves.not.toThrow();
    });
  });
});
