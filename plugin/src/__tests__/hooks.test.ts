import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTodoEnforcer, resetEnforcerState, getEnforcerState } from '../hooks/todo-enforcer.js';
import { registerCommentChecker } from '../hooks/comment-checker.js';
import { registerMessageMonitor, getMessageCount } from '../hooks/message-monitor.js';
import { registerStartupHook } from '../hooks/startup.js';
import type { OmocPluginApi, PluginConfig } from '../types.js';

interface BootstrapFile {
  path: string;
  content: string;
}

interface AgentBootstrapEvent {
  context: {
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

type MockApi = OmocPluginApi & {
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
};

function createMockApi(configOverrides: Partial<PluginConfig> = {}): MockApi {
  return {
    config: {
      max_ralph_iterations: 10,
      todo_enforcer_enabled: true,
      todo_enforcer_cooldown_ms: 2000,
      todo_enforcer_max_failures: 5,
      comment_checker_enabled: true,
      notepad_dir: 'workspace/notepads',
      plans_dir: 'workspace/plans',
      checkpoint_dir: 'workspace/checkpoints',
      tmux_socket: '/tmp/openclaw-tmux-sockets/openclaw.sock',
      ...configOverrides,
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    registerHook: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
    registerService: vi.fn(),
    registerGatewayMethod: vi.fn(),
    registerCli: vi.fn(),
  };
}

describe('todo-enforcer hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEnforcerState();
  });

  it('injects directive when todo_enforcer_enabled=true', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(event.context.bootstrapFiles).toHaveLength(1);
    expect(event.context.bootstrapFiles?.[0].path).toBe('omoc://todo-enforcer');
    expect(api.logger.info).toHaveBeenCalledWith('[omoc] Todo enforcer injected (role: orchestrator)');
  });

  it('does not inject when todo_enforcer_enabled=false', () => {
    const api = createMockApi({ todo_enforcer_enabled: false });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(event.context.bootstrapFiles).toEqual([]);
    expect(api.logger.info).not.toHaveBeenCalled();
  });

  it('injects expected directive content text', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(event.context.bootstrapFiles?.[0].content).toContain('TODO CONTINUATION');
  });

  it('preserves existing bootstrapFiles and appends directive', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = {
      context: {
        bootstrapFiles: [{ path: 'existing', content: 'keep' }],
      },
    };
    handler(event);

    expect(event.context.bootstrapFiles).toHaveLength(2);
    expect(event.context.bootstrapFiles?.[0]).toEqual({ path: 'existing', content: 'keep' });
    expect(event.context.bootstrapFiles?.[1].path).toBe('omoc://todo-enforcer');
  });

  it('skips injection for lightweight agents (explore, librarian, oracle)', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    for (const agentId of ['omoc_explore', 'omoc_librarian', 'omoc_oracle', 'omoc_metis', 'omoc_momus', 'omoc_looker']) {
      const event = { context: { agentId, bootstrapFiles: [] as BootstrapFile[] } };
      handler(event);
      expect(event.context.bootstrapFiles).toHaveLength(0);
    }
  });

  it('injects orchestrator directive for atlas/prometheus', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const event = { context: { agentId: 'omoc_atlas', bootstrapFiles: [] as BootstrapFile[] } };
    handler(event);
    expect(event.context.bootstrapFiles).toHaveLength(1);
    expect(event.context.bootstrapFiles[0].content).toContain('TODO CONTINUATION');
    expect(event.context.bootstrapFiles[0].content).toContain('subagent completion');
  });

  it('injects worker directive for sisyphus/hephaestus', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const event = { context: { agentId: 'omoc_sisyphus', bootstrapFiles: [] as BootstrapFile[] } };
    handler(event);
    expect(event.context.bootstrapFiles).toHaveLength(1);
    expect(event.context.bootstrapFiles[0].content).toContain('TASK COMPLETION');
    expect(event.context.bootstrapFiles[0].content).not.toContain('subagent completion');
  });

  it('defaults to orchestrator when agentId is missing', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: AgentBootstrapEvent) => void;
    const event: AgentBootstrapEvent = { context: { bootstrapFiles: [] } };
    handler(event);

    expect(event.context.bootstrapFiles).toHaveLength(1);
    expect(event.context.bootstrapFiles?.[0].content).toContain('TODO CONTINUATION');
  });

  it('anti-regurgitation clause is present in all directives', () => {
    const api = createMockApi({ todo_enforcer_enabled: true });
    registerTodoEnforcer(api);

    const handler = api.registerHook.mock.calls[0][1] as (event: { context: { agentId?: string; bootstrapFiles?: BootstrapFile[] } }) => void;

    const orchestratorEvent = { context: { agentId: 'omoc_atlas', bootstrapFiles: [] as BootstrapFile[] } };
    handler(orchestratorEvent);
    expect(orchestratorEvent.context.bootstrapFiles[0].content).toContain('Do NOT restate prior messages');

    const workerEvent = { context: { agentId: 'omoc_sisyphus', bootstrapFiles: [] as BootstrapFile[] } };
    handler(workerEvent);
    expect(workerEvent.context.bootstrapFiles[0].content).toContain('Do NOT restate prior messages');
  });

  it('resetEnforcerState and getEnforcerState remain callable (API compat)', () => {
    resetEnforcerState();
    const state = getEnforcerState();
    expect(state).toBeDefined();
  });
});

describe('comment-checker hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects AI slop comment: // Import the necessary modules', () => {
    const api = createMockApi({ comment_checker_enabled: true });
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
    const api = createMockApi({ comment_checker_enabled: true });
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
    const api = createMockApi({ comment_checker_enabled: true });
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
    const api = createMockApi({ comment_checker_enabled: false });
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
    const api = createMockApi({ comment_checker_enabled: true });
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
