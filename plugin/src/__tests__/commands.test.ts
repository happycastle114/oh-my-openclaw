import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs (readFileSync used by workflow-commands)
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('# Mock Workflow Content\nStep 1\nStep 2'),
  promises: {
    readFile: vi.fn().mockResolvedValue('# Mock Workflow Content\nStep 1\nStep 2'),
  },
}));

// Mock ralph-loop service (used by ralph-commands)
vi.mock('../services/ralph-loop.js', () => ({
  startLoop: vi.fn().mockResolvedValue({
    success: true,
    message: 'Ralph Loop started',
    state: {
      active: true,
      iteration: 0,
      maxIterations: 10,
      taskFile: 'test.md',
      startedAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  stopLoop: vi.fn().mockResolvedValue({
    success: true,
    message: 'Ralph Loop stopped',
    state: {
      active: false,
      iteration: 5,
      maxIterations: 10,
      taskFile: 'test.md',
      startedAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  getStatus: vi.fn().mockResolvedValue({
    active: false,
    iteration: 0,
    maxIterations: 10,
    taskFile: '',
    startedAt: '',
  }),
}));

vi.mock('../version.js', () => ({
  VERSION: '9.9.9-test',
}));

// Mock message-monitor
vi.mock('../hooks/message-monitor.js', () => ({
  getMessageCount: vi.fn().mockReturnValue(42),
}));

// Mock config util
vi.mock('../utils/config.js', () => ({
  getConfig: vi.fn((api: any) => ({
    ...api.config,
  })),
}));

import { promises as fsPromises } from 'fs';
import { registerWorkflowCommands } from '../commands/workflow-commands.js';
import { registerRalphCommands } from '../commands/ralph-commands.js';
import { registerStatusCommands } from '../commands/status-commands.js';
import { startLoop, stopLoop, getStatus } from '../services/ralph-loop.js';
import { getMessageCount } from '../hooks/message-monitor.js';

function createMockApi(configOverrides = {}): any {
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
      model_routing: undefined,
      ...configOverrides,
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    registerHook: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
    registerService: vi.fn(),
    registerGatewayMethod: vi.fn(),
  };
}

// ─── Workflow Commands ──────────────────────────────────────
describe('registerWorkflowCommands', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
  });

  it('registers 3 commands (ultrawork, plan, start-work)', () => {
    registerWorkflowCommands(mockApi);

    expect(mockApi.registerCommand).toHaveBeenCalledTimes(3);

    const names = mockApi.registerCommand.mock.calls.map((c: any) => c[0].name);
    expect(names).toContain('ultrawork');
    expect(names).toContain('plan');
    expect(names).toContain('start-work');
  });

  it('ultrawork handler returns workflow text with task description', async () => {
    registerWorkflowCommands(mockApi);

    const ultraworkCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ultrawork'
    );
    const handler = ultraworkCall[0].handler;
    const result = await handler({ args: 'Add authentication' });

    expect(result.text).toContain('Add authentication');
    expect(result.text).toContain('Ultrawork Mode');
    expect(result.text).toContain('Mock Workflow Content');
  });

  it('plan handler returns planning workflow with topic', async () => {
    registerWorkflowCommands(mockApi);

    const planCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'plan'
    );
    const handler = planCall[0].handler;
    const result = await handler({ args: 'Database migration strategy' });

    expect(result.text).toContain('Database migration strategy');
    expect(result.text).toContain('Planning Mode');
    expect(result.text).toContain('Mock Workflow Content');
  });

  it('start-work handler returns execution workflow', async () => {
    registerWorkflowCommands(mockApi);

    const startWorkCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'start-work'
    );
    const handler = startWorkCall[0].handler;
    const result = await handler({ args: 'plan-v2.md' });

    expect(result.text).toContain('plan-v2.md');
    expect(result.text).toContain('Start Work Mode');
    expect(result.text).toContain('Mock Workflow Content');
  });

  it('handles missing workflow file gracefully', async () => {
    vi.mocked(fsPromises.readFile).mockImplementation(async () => {
      const err: any = new Error('ENOENT: no such file');
      err.code = 'ENOENT';
      throw err;
    });

    registerWorkflowCommands(mockApi);

    const ultraworkCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ultrawork'
    );
    const handler = ultraworkCall[0].handler;
    const result = await handler({ args: 'test task' });

    expect(result.text).toContain('Error');
    expect(result.text).toContain('Could not read workflow file');
  });
});

// ─── Ralph Commands ─────────────────────────────────────────
describe('registerRalphCommands', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
  });

  it('registers 3 commands (ralph-loop, ralph-stop, omoc-status)', () => {
    registerRalphCommands(mockApi);

    expect(mockApi.registerCommand).toHaveBeenCalledTimes(3);

    const names = mockApi.registerCommand.mock.calls.map((c: any) => c[0].name);
    expect(names).toContain('ralph-loop');
    expect(names).toContain('ralph-stop');
    expect(names).toContain('omoc-status');
  });

  it('ralph-loop parses args and calls startLoop', async () => {
    registerRalphCommands(mockApi);

    const ralphLoopCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ralph-loop'
    );
    const handler = ralphLoopCall[0].handler;
    const result = await handler({ args: '5 task.md' });

    expect(startLoop).toHaveBeenCalledWith('task.md', 5);
    expect(result.text).toContain('Ralph Loop started');
    expect(result.text).toContain('Max iterations: 10');
  });

  it('ralph-stop calls stopLoop', async () => {
    registerRalphCommands(mockApi);

    const ralphStopCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ralph-stop'
    );
    const handler = ralphStopCall[0].handler;
    const result = await handler({});

    expect(stopLoop).toHaveBeenCalled();
    expect(result.text).toContain('Ralph Loop stopped');
    expect(result.text).toContain('Final iteration: 5/10');
  });

  it('omoc-status returns formatted summary with ralph state', async () => {
    registerRalphCommands(mockApi);

    const statusCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'omoc-status'
    );
    const handler = statusCall[0].handler;
    const result = await handler({});

    expect(getStatus).toHaveBeenCalled();
    expect(getMessageCount).toHaveBeenCalled();
    expect(result.text).toContain('Oh-My-OpenClaw Status');
    expect(result.text).toContain('INACTIVE');
    expect(result.text).toContain('Messages Monitored: 42');
    expect(result.text).toContain('Todo Enforcer: ENABLED');
    expect(result.text).toContain('Comment Checker: ENABLED');
  });
});

describe('registerStatusCommands', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
  });

  it('registers omoc-health and omoc-config commands', () => {
    registerStatusCommands(mockApi);

    expect(mockApi.registerCommand).toHaveBeenCalledTimes(2);
    const names = mockApi.registerCommand.mock.calls.map((c: any) => c[0].name);
    expect(names).toContain('omoc-health');
    expect(names).toContain('omoc-config');
  });

  it('omoc-health returns version and service status', async () => {
    registerStatusCommands(mockApi);
    const healthCall = mockApi.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc-health');
    const handler = healthCall[0].handler;

    const result = await handler({});

    expect(getStatus).toHaveBeenCalled();
    expect(getMessageCount).toHaveBeenCalled();
    expect(result.text).toContain('oh-my-openclaw Health');
    expect(result.text).toContain('Version: 9.9.9-test');
    expect(result.text).toContain('Ralph Loop: INACTIVE');
    expect(result.text).toContain('Messages Tracked: 42');
  });

  it('omoc-config returns current config in JSON block', () => {
    registerStatusCommands(mockApi);
    const configCall = mockApi.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc-config');
    const handler = configCall[0].handler;

    const result = handler({});

    expect(result.text).toContain('oh-my-openclaw Configuration');
    expect(result.text).toContain('```json');
    expect(result.text).toContain('"todo_enforcer_enabled": true');
  });

  it('omoc-config masks sensitive values', () => {
    const apiWithSensitiveConfig = createMockApi({
      api_token: 'token-value',
      service_secret: 'secret-value',
      api_key: 'key-value',
    });
    registerStatusCommands(apiWithSensitiveConfig);
    const configCall = apiWithSensitiveConfig.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc-config');
    const handler = configCall[0].handler;

    const result = handler({});

    expect(result.text).toContain('"api_token": "***"');
    expect(result.text).toContain('"service_secret": "***"');
    expect(result.text).toContain('"api_key": "***"');
  });
});
