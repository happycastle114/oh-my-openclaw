import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTodoEnforcer, resetEnforcerState, getEnforcerState, classifyAgentRole } from '../hooks/todo-enforcer.js';
import { registerContextInjector } from '../hooks/context-injector.js';
import { registerCommentChecker } from '../hooks/comment-checker.js';
import { registerMessageMonitor, getMessageCount } from '../hooks/message-monitor.js';
import { registerStartupHook } from '../hooks/startup.js';
import { ContextCollector, contextCollector } from '../features/context-collector.js';
import { createTodo, resetStore } from '../tools/todo/store.js';
import type { OmocPluginApi, BeforePromptBuildEvent, BeforePromptBuildResult, TypedHookContext } from '../types.js';
import { createMockApi as createFactoryMockApi, createMockConfig } from './helpers/mock-factory.js';

type MockApi = Omit<
  OmocPluginApi,
  'logger' | 'registerHook' | 'registerTool' | 'registerCommand' | 'registerService' | 'registerGatewayMethod' | 'registerCli' | 'on'
> & {
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  registerHook: ReturnType<typeof vi.fn>;
  registerTool: ReturnType<typeof vi.fn>;
  registerCommand: ReturnType<typeof vi.fn>;
  registerService: ReturnType<typeof vi.fn>;
  registerGatewayMethod: ReturnType<typeof vi.fn>;
  registerCli: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

const createMockApi = (overrides?: Partial<OmocPluginApi>): MockApi => {
  return createFactoryMockApi(overrides) as unknown as MockApi;
};

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
    agentId?: string;
    sessionKey?: string;
    sessionId?: string;
    bootstrapFiles?: BootstrapFile[];
  };
}

interface ToolResultPayload {
  tool?: string;
  content?: string;
  file?: string;
  filename?: string;
  path?: string;
  [key: string]: unknown;
}

describe('todo-enforcer hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEnforcerState();
    contextCollector.clearAll();
  });

  it('registers directive context when todo_enforcer_enabled=true', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { agentId: 'omoc_atlas', bootstrapFiles: [] } };
    handler(event);

    expect(event.context.bootstrapFiles).toHaveLength(0);
    const entries = contextCollector.getEntries('omoc_atlas');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('todo-enforcer');
    expect(entries[0].source).toBe('todo-enforcer');
    expect(api.logger.info).toHaveBeenCalledWith('[omoc] Todo enforcer context registered (role: orchestrator)');
  });

  it('does not register when todo_enforcer_enabled=false', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: false }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(contextCollector.getEntries('default')).toEqual([]);
    expect(api.logger.info).not.toHaveBeenCalled();
  });

  it('registers expected directive content text', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(contextCollector.getEntries('default')[0].content).toContain('TODO CONTINUATION');
  });

  it('preserves existing bootstrapFiles without direct mutation', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = {
      context: {
        bootstrapFiles: [{ path: 'existing', content: 'keep' }],
      },
    };
    handler(event);

    expect(event.context.bootstrapFiles).toHaveLength(1);
    expect(event.context.bootstrapFiles?.[0]).toEqual({ path: 'existing', content: 'keep' });
    expect(contextCollector.getEntries('default')).toHaveLength(1);
  });

  it('skips registration for lightweight agents (explore, librarian, oracle)', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    for (const agentId of ['omoc_explore', 'omoc_librarian', 'omoc_oracle', 'omoc_metis', 'omoc_momus', 'omoc_looker']) {
      const event = { context: { agentId, bootstrapFiles: [] as BootstrapFile[] } };
      handler(event);
      expect(contextCollector.getEntries(agentId)).toHaveLength(0);
    }
  });

  it('registers orchestrator directive for atlas/prometheus', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const event = { context: { agentId: 'omoc_atlas', bootstrapFiles: [] as BootstrapFile[] } };
    handler(event);
    const entries = contextCollector.getEntries('omoc_atlas');
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toContain('TODO CONTINUATION');
    expect(entries[0].content).toContain('subagent completion');
  });

  it('registers worker directive for sisyphus/hephaestus', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const event = { context: { agentId: 'omoc_sisyphus', bootstrapFiles: [] as BootstrapFile[] } };
    handler(event);
    const entries = contextCollector.getEntries('omoc_sisyphus');
    expect(entries).toHaveLength(1);
    expect(entries[0].content).toContain('TASK COMPLETION');
    expect(entries[0].content).not.toContain('subagent completion');
  });

  it('defaults to orchestrator when agentId is missing', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(contextCollector.getEntries('default')).toHaveLength(1);
    expect(contextCollector.getEntries('default')[0].content).toContain('TODO CONTINUATION');
  });

  it('anti-regurgitation clause is present in all directives', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const orchestratorEvent = { context: { agentId: 'omoc_atlas', bootstrapFiles: [] as BootstrapFile[] } };
    handler(orchestratorEvent);
    expect(contextCollector.getEntries('omoc_atlas')[0].content).toContain('Do NOT restate prior messages');

    const workerEvent = { context: { agentId: 'omoc_sisyphus', bootstrapFiles: [] as BootstrapFile[] } };
    handler(workerEvent);
    expect(contextCollector.getEntries('omoc_sisyphus')[0].content).toContain('Do NOT restate prior messages');
  });

  it('resetEnforcerState and getEnforcerState remain callable (API compat)', () => {
    resetEnforcerState();
    const state = getEnforcerState();
    expect(state).toBeDefined();
  });

  it('injects todo directive only once when collector consumes oneShot entry', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });

    registerTodoEnforcer(api);
    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;

    handler({ context: { agentId: 'omoc_atlas', sessionKey: 'sess-1' } });

    const firstCollect = contextCollector.collect('sess-1');
    expect(firstCollect.some((entry) => entry.id === 'todo-enforcer')).toBe(true);

    const secondCollect = contextCollector.collect('sess-1');
    expect(secondCollect.some((entry) => entry.id === 'todo-enforcer')).toBe(false);
  });
});

describe('todo-enforcer continuation hook (before_prompt_build)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEnforcerState();
    contextCollector.clearAll();
    resetStore();
  });

  function getContinuationHandler(api: MockApi) {
    const onCall = api.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'before_prompt_build',
    );
    if (!onCall) throw new Error('before_prompt_build handler not found on api.on');
    return onCall[1] as (
      event: BeforePromptBuildEvent,
      ctx: TypedHookContext,
    ) => BeforePromptBuildResult | void;
  }

  it('returns continuation context when incomplete todos exist', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Build the feature', 'high', 'in_progress', 'sess-cont');
    createTodo('Write tests', 'medium', 'pending', 'sess-cont');

    const handler = getContinuationHandler(api);
    const result = handler(
      { prompt: 'subagent completed' },
      { sessionKey: 'sess-cont' },
    );

    expect(result).toBeDefined();
    expect(result!.prependContext).toContain('SUBAGENT CONTINUATION');
    expect(result!.prependContext).toContain('Build the feature');
    expect(result!.prependContext).toContain('Write tests');
  });

  it('returns void when no incomplete todos exist', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Done task', 'medium', 'completed', 'sess-empty');

    const handler = getContinuationHandler(api);
    const result = handler(
      { prompt: 'hello' },
      { sessionKey: 'sess-empty' },
    );

    expect(result).toBeUndefined();
  });

  it('returns void when todo_enforcer_enabled=false', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: false }) });
    registerTodoEnforcer(api);

    createTodo('Some task', 'high', 'pending', 'sess-disabled');

    const handler = getContinuationHandler(api);
    const result = handler(
      { prompt: 'hello' },
      { sessionKey: 'sess-disabled' },
    );

    expect(result).toBeUndefined();
  });

  it('includes todo status and content in prepended context', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Task A', 'high', 'in_progress', 'sess-detail');
    createTodo('Task B', 'medium', 'pending', 'sess-detail');
    createTodo('Task C', 'low', 'completed', 'sess-detail');

    const handler = getContinuationHandler(api);
    const result = handler(
      { prompt: 'announce result' },
      { sessionKey: 'sess-detail' },
    );

    expect(result).toBeDefined();
    expect(result!.prependContext).toContain('[in_progress] Task A');
    expect(result!.prependContext).toContain('[pending] Task B');
    expect(result!.prependContext).not.toContain('Task C');
  });

  it('falls back through sessionId and agentId when sessionKey is missing', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Fallback task', 'high', 'pending', 'my-agent');

    const handler = getContinuationHandler(api);

    const result = handler(
      { prompt: 'hello' },
      { agentId: 'my-agent' },
    );

    expect(result).toBeDefined();
    expect(result!.prependContext).toContain('Fallback task');
  });

  it('falls back to default when no context keys are present', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Default task', 'high', 'pending', 'default');

    const handler = getContinuationHandler(api);
    const result = handler({ prompt: 'hello' }, {});

    expect(result).toBeDefined();
    expect(result!.prependContext).toContain('Default task');
  });

  it('logs when continuation is injected', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    createTodo('Log task', 'high', 'pending', 'sess-log');

    const handler = getContinuationHandler(api);
    handler({ prompt: 'hello' }, { sessionKey: 'sess-log' });

    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Todo continuation injected: 1 incomplete todo(s)'),
    );
  });

  it('registers with priority 60', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
    registerTodoEnforcer(api);

    const onCall = api.on.mock.calls.find(
      (call: unknown[]) => call[0] === 'before_prompt_build',
    );
    expect(onCall).toBeDefined();
    expect(onCall![2]).toEqual({ priority: 60 });
  });
});

describe('classifyAgentRole', () => {
  it('classifies orchestrator IDs as orchestrator', () => {
    expect(classifyAgentRole('omoc_atlas')).toBe('orchestrator');
  });

  it('classifies worker IDs as worker', () => {
    expect(classifyAgentRole('omoc_sisyphus')).toBe('worker');
  });

  it('classifies unknown IDs as unknown', () => {
    expect(classifyAgentRole('omoc_not_real')).toBe('unknown');
  });
});

describe('context-collector', () => {
  it('registers and collects entries by priority', () => {
    const collector = new ContextCollector();

    collector.register('s1', { id: 'n', content: 'normal', priority: 'normal', source: 'plugin' });
    collector.register('s1', { id: 'c', content: 'critical', priority: 'critical', source: 'system' });
    collector.register('s1', { id: 'h', content: 'high', priority: 'high', source: 'plugin' });

    const entries = collector.collect('s1');
    expect(entries.map((entry) => entry.id)).toEqual(['c', 'h', 'n']);
  });

  it('removes oneShot entries on collect and keeps persistent entries', () => {
    const collector = new ContextCollector();

    collector.register('s1', { id: 'once', content: 'once', source: 'plugin', oneShot: true });
    collector.register('s1', { id: 'keep', content: 'keep', source: 'plugin' });

    const first = collector.collect('s1');
    expect(first).toHaveLength(2);

    const second = collector.collect('s1');
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe('keep');
  });

  it('supports collectAsString, clear, and clearAll', () => {
    const collector = new ContextCollector();

    collector.register('s1', { id: 'a', content: 'A', source: 'plugin' });
    collector.register('s1', { id: 'b', content: 'B', source: 'plugin' });
    collector.register('s2', { id: 'c', content: 'C', source: 'plugin' });

    expect(collector.collectAsString('s1', '\n')).toContain('A');
    expect(collector.hasEntries('s1')).toBe(true);

    collector.clear('s2');
    expect(collector.hasEntries('s2')).toBe(false);

    collector.register('s3', { id: 'd', content: 'D', source: 'plugin' });
    collector.clearAll();
    expect(collector.hasEntries('s3')).toBe(false);
  });

  it('unregister removes the entry and subsequent collect returns empty', () => {
    const collector = new ContextCollector();

    collector.register('s1', { id: 'entry-1', content: 'keep me', source: 'plugin' });
    collector.unregister('s1', 'entry-1');

    expect(collector.hasEntries('s1')).toBe(false);
    expect(collector.collect('s1')).toEqual([]);
  });

  it('prunes sessions that exceed 30 minute TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const collector = new ContextCollector();
    collector.register('ttl-session', {
      id: 'ttl-entry',
      content: 'expires',
      source: 'plugin',
    });

    vi.setSystemTime(new Date('2026-01-01T00:31:00.000Z'));

    expect(collector.collect('ttl-session')).toEqual([]);
    expect(collector.hasEntries('ttl-session')).toBe(false);

    vi.useRealTimers();
  });
});

describe('context-injector hook (typed hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextCollector.clearAll();
  });

  it('registers before_prompt_build typed hook via api.on()', () => {
    const api = createMockApi();
    registerContextInjector(api);

    expect(api.on).toHaveBeenCalledTimes(1);
    expect(api.on.mock.calls[0][0]).toBe('before_prompt_build');
    expect(api.on.mock.calls[0][2]).toEqual({ priority: 50 });
  });

  it('injects collected context entries via prependContext', () => {
    const api = createMockApi();
    registerContextInjector(api);

    contextCollector.register('omoc_atlas', {
      id: 'todo-enforcer',
      content: 'todo directive',
      priority: 'normal',
      source: 'todo-enforcer',
    });
    contextCollector.register('omoc_atlas', {
      id: 'persona/omoc_atlas',
      content: 'persona prompt',
      priority: 'high',
      source: 'persona',
    });

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'omoc_atlas' };
    const result = handler(event, ctx);

    expect(result).toBeDefined();
    expect(result.prependContext).toContain('persona prompt');
    expect(result.prependContext).toContain('todo directive');
    expect(contextCollector.hasEntries('omoc_atlas')).toBe(true);
  });

  it('uses default session key when agentId is missing', () => {
    const api = createMockApi();
    registerContextInjector(api);

    contextCollector.register('default', {
      id: 'todo-enforcer',
      content: 'todo directive',
      source: 'todo-enforcer',
    });

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = {};
    const result = handler(event, ctx);

    expect(result).toBeDefined();
    expect(result.prependContext).toContain('todo directive');
  });

  it('returns undefined when no entries exist', () => {
    const api = createMockApi();
    registerContextInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = {};
    const result = handler(event, ctx);

    expect(result).toBeUndefined();
  });

  it('returns undefined when no collector entries for session', () => {
    const api = createMockApi();
    registerContextInjector(api);

    contextCollector.register('default', {
      id: 'todo-enforcer',
      content: 'todo directive',
      source: 'todo-enforcer',
    });

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'omoc_other' };
    const result = handler(event, ctx);

    expect(result).toBeUndefined();
    expect(contextCollector.hasEntries('default')).toBe(true);
  });

  it('keeps same agentId isolated across different sessionKey values', () => {
    const api = createMockApi();
    registerContextInjector(api);

    contextCollector.register('session-1', {
      id: 'entry-1',
      content: 'session-1 context',
      source: 'plugin',
    });

    const handler = api.on.mock.calls[0][1];
    const result = handler(
      { prompt: 'hello' },
      { agentId: 'omoc_sisyphus', sessionKey: 'session-2' },
    );

    expect(result).toBeUndefined();
    expect(contextCollector.hasEntries('session-1')).toBe(true);
    expect(contextCollector.hasEntries('session-2')).toBe(false);
  });
});

describe('comment-checker hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects AI slop comment: // Import the necessary modules', () => {
    const api = createMockApi({ config: createMockConfig({ comment_checker_enabled: true }) });
    registerCommentChecker(api);

    const handler = api.registerHook.mock.calls[0][1] as (
      payload: ToolResultPayload
    ) => ToolResultPayload | undefined;
    const payload: ToolResultPayload = {
      file: 'src/file.ts',
      content: '// Import the necessary modules\nimport fs from "node:fs";',
    };

    const result = handler(payload);

    expect(result).toBeDefined();
    expect(result?.content).toContain('[OMOC Comment Checker] Found 1 AI slop comment(s)');
  });

  it('detects AI slop comment: // This function handles...', () => {
    const api = createMockApi({ config: createMockConfig({ comment_checker_enabled: true }) });
    registerCommentChecker(api);

    const handler = api.registerHook.mock.calls[0][1] as (
      payload: ToolResultPayload
    ) => ToolResultPayload | undefined;
    const payload: ToolResultPayload = {
      file: 'src/file.ts',
      content: '// This function handles user login\nexport function login() {}',
    };

    const result = handler(payload);

    expect(result).toBeDefined();
    expect(result?.content).toContain('AI slop: obvious/narrating comment');
  });

  it('ignores clean comments like TODO notes', () => {
    const api = createMockApi({ config: createMockConfig({ comment_checker_enabled: true }) });
    registerCommentChecker(api);

    const handler = api.registerHook.mock.calls[0][1] as (
      payload: ToolResultPayload
    ) => ToolResultPayload | undefined;
    const payload: ToolResultPayload = {
      file: 'src/file.ts',
      content: '// TODO: fix race condition\nconst value = 1;',
    };

    const result = handler(payload);

    expect(result).toBeUndefined();
  });

  it('returns undefined when checker is disabled', () => {
    const api = createMockApi({ config: createMockConfig({ comment_checker_enabled: false }) });
    registerCommentChecker(api);

    const handler = api.registerHook.mock.calls[0][1] as (
      payload: ToolResultPayload
    ) => ToolResultPayload | undefined;
    const payload: ToolResultPayload = {
      file: 'src/file.ts',
      content: '// Import modules\nconst x = 1;',
    };

    const result = handler(payload);

    expect(result).toBeUndefined();
  });

  it('skips markdown files', () => {
    const api = createMockApi({ config: createMockConfig({ comment_checker_enabled: true }) });
    registerCommentChecker(api);

    const handler = api.registerHook.mock.calls[0][1] as (
      payload: ToolResultPayload
    ) => ToolResultPayload | undefined;
    const payload: ToolResultPayload = {
      file: 'readme.md',
      content: '// Import the necessary modules\nnot code',
    };

    const result = handler(payload);

    expect(result).toBeUndefined();
  });
});

describe('message-monitor hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs message events', () => {
    const api = createMockApi();
    registerMessageMonitor(api);

    expect(api.registerHook).toHaveBeenCalledTimes(2);
    expect(api.registerHook.mock.calls[0][0]).toBe('message:sent');
    expect(api.registerHook.mock.calls[1][0]).toBe('message:received');

    const handler = api.registerHook.mock.calls[0][1] as (context: {
      content?: string;
      channelId?: string;
    }) => undefined;
    handler({ content: 'Hello world', channelId: 'channel-1' });

    expect(api.logger.info).toHaveBeenCalledTimes(1);
    expect(api.logger.info).toHaveBeenCalledWith(
      '[omoc] Message sent:',
      expect.objectContaining({
        preview: 'Hello world',
        channelId: 'channel-1',
        messageCount: expect.any(Number),
      })
    );
  });

  it('increments getMessageCount after a message event', () => {
    const api = createMockApi();
    registerMessageMonitor(api);

    const handler = api.registerHook.mock.calls[0][1] as (context: {
      content?: string;
      channelId?: string;
    }) => undefined;

    const before = getMessageCount();
    handler({ content: 'Count me', channelId: 'channel-2' });
    const after = getMessageCount();

    expect(after).toBe(before + 1);
  });

  it('logs inbound message events without incrementing count', () => {
    const api = createMockApi();
    registerMessageMonitor(api);

    const sentHandler = api.registerHook.mock.calls[0][1] as (context: {
      content?: string;
      channelId?: string;
    }) => undefined;
    const receivedHandler = api.registerHook.mock.calls[1][1] as (context: {
      content?: string;
      channelId?: string;
    }) => undefined;

    const before = getMessageCount();
    sentHandler({ content: 'sent msg', channelId: 'channel-3' });
    const afterSent = getMessageCount();
    receivedHandler({ content: 'received msg', channelId: 'channel-3' });
    const afterReceived = getMessageCount();

    expect(afterSent).toBe(before + 1);
    expect(afterReceived).toBe(afterSent);
    expect(api.logger.info).toHaveBeenCalledWith(
      '[omoc] Message received:',
      expect.objectContaining({
        preview: 'received msg',
        channelId: 'channel-3',
      }),
    );
  });

  it('caps messageCounts at 1000 and evicts the oldest channel', async () => {
    vi.resetModules();
    const messageMonitor = await import('../hooks/message-monitor.js');
    const api = createMockApi();
    messageMonitor.registerMessageMonitor(api);

    const sentHandler = api.registerHook.mock.calls[0][1] as (context: {
      content?: string;
      channelId?: string;
    }) => undefined;

    for (let i = 0; i <= 1000; i++) {
      sentHandler({ content: `message-${i}`, channelId: `mm-${i}` });
    }

    expect(messageMonitor.getMessageCount('mm-0')).toBe(0);
    expect(messageMonitor.getMessageCount('mm-1')).toBe(1);
    expect(messageMonitor.getMessageCount('mm-1000')).toBe(1);
  });
});

describe('startup hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers gateway:startup hook and logs plugin activation', () => {
    const api = createMockApi();
    registerStartupHook(api);

    expect(api.registerHook).toHaveBeenCalledTimes(1);
    expect(api.registerHook.mock.calls[0][0]).toBe('gateway:startup');

    const handler = api.registerHook.mock.calls[0][1] as () => undefined;
    const result = handler();

    expect(result).toBeUndefined();
    expect(api.logger.info).toHaveBeenCalledWith(expect.stringContaining('Gateway started'));
  });
});
