import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  registerTodoReminder,
  registerAgentEndReminder,
  resetTodoReminderCounters,
  getLastTodoSnapshot,
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

const SAMPLE_TODOS_JSON = JSON.stringify([
  { content: 'Implement auth', status: 'pending', priority: 'high' },
  { content: 'Write tests', status: 'in_progress', priority: 'medium' },
  { content: 'Deploy', status: 'completed', priority: 'low' },
]);

const ALL_COMPLETE_JSON = JSON.stringify([
  { content: 'Task A', status: 'completed', priority: 'high' },
  { content: 'Task B', status: 'completed', priority: 'medium' },
]);

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
      description: 'Captures todowrite state and reminds agent to check todos after prolonged tool usage',
    });
  });

  it('returns undefined for todowrite calls (no reminder)', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    const result = handler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

    expect(result).toBeUndefined();
  });

  it('resets counter on todowrite usage', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    for (let i = 0; i < 8; i++) {
      handler({ tool: 'some_tool', content: 'result' });
    }
    expect(_sessionCounters.get('__default__')).toBe(8);

    handler({ tool: 'todowrite', content: '[]' });
    expect(_sessionCounters.get('__default__')).toBe(0);
  });

  it('captures todo snapshot from todowrite result', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    handler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

    const snapshot = getLastTodoSnapshot();
    expect(snapshot).toHaveLength(3);
    expect(snapshot[0].content).toBe('Implement auth');
    expect(snapshot[0].status).toBe('pending');
    expect(snapshot[2].status).toBe('completed');
  });

  it('handles { todos: [...] } wrapper shape', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    const wrapped = JSON.stringify({
      todos: [{ content: 'Wrapped task', status: 'pending', priority: 'high' }],
    });
    handler({ tool: 'todowrite', content: wrapped });

    const snapshot = getLastTodoSnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].content).toBe('Wrapped task');
  });

  it('does not overwrite snapshot with empty todowrite result', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    handler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });
    expect(getLastTodoSnapshot()).toHaveLength(3);

    handler({ tool: 'todowrite', content: 'not-json' });
    expect(getLastTodoSnapshot()).toHaveLength(3);
  });

  it('appends reminder after 10 non-todowrite tool calls', () => {
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
    expect(result.content).toContain('todowrite');
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

  it('ignores malformed todowrite content gracefully', () => {
    registerTodoReminder(mockApi);
    const handler = getHookHandler(mockApi);

    handler({ tool: 'todowrite', content: '{bad json' });
    expect(getLastTodoSnapshot()).toHaveLength(0);

    handler({ tool: 'todowrite', content: JSON.stringify({ unrelated: true }) });
    expect(getLastTodoSnapshot()).toHaveLength(0);
  });
});

describe('Agent End Reminder', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTodoReminderCounters();
    mockApi = createMockApiAny();
  });

  it('registers on agent_end hook', () => {
    registerAgentEndReminder(mockApi);

    expect(mockApi.on).toHaveBeenCalledOnce();
    expect(mockApi.on.mock.calls[0][0]).toBe('agent_end');
    expect(mockApi.on.mock.calls[0][2]).toEqual({ priority: 50 });
  });

  it('fires enqueueSystemEvent when incomplete todos exist', async () => {
    registerTodoReminder(mockApi);
    const hookHandler = getHookHandler(mockApi);
    hookHandler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

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
    expect(warning).toContain('todowrite');
    expect(opts.sessionKey).toBe('test-session');
  });

  it('does not fire when all todos are complete', async () => {
    registerTodoReminder(mockApi);
    const hookHandler = getHookHandler(mockApi);
    hookHandler({ tool: 'todowrite', content: ALL_COMPLETE_JSON });

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.runtime.system.enqueueSystemEvent).not.toHaveBeenCalled();
  });

  it('does not fire when no todos captured', async () => {
    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.runtime.system.enqueueSystemEvent).not.toHaveBeenCalled();
  });

  it('falls back to sessionId when sessionKey is absent', async () => {
    registerTodoReminder(mockApi);
    const hookHandler = getHookHandler(mockApi);
    hookHandler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: undefined, sessionId: 'fallback-id' });

    await handler({ messages: [], success: true }, ctx);

    const [, opts] = mockApi.runtime.system.enqueueSystemEvent.mock.calls[0];
    expect(opts.sessionKey).toBe('fallback-id');
  });

  it('does not throw on errors (graceful degradation)', async () => {
    registerTodoReminder(mockApi);
    const hookHandler = getHookHandler(mockApi);
    hookHandler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

    mockApi.runtime.system.enqueueSystemEvent.mockImplementation(() => {
      throw new Error('system event failure');
    });

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await expect(handler({ messages: [], success: false }, ctx)).resolves.not.toThrow();
  });

  it('logs warning when incomplete todos found', async () => {
    registerTodoReminder(mockApi);
    const hookHandler = getHookHandler(mockApi);
    hookHandler({ tool: 'todowrite', content: SAMPLE_TODOS_JSON });

    registerAgentEndReminder(mockApi);
    const handler = getOnHandler(mockApi, 'agent_end');
    const ctx = createMockContext({ sessionKey: 'test-session' });

    await handler({ messages: [], success: true }, ctx);

    expect(mockApi.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('2 incomplete todo(s)'),
    );
  });
});
