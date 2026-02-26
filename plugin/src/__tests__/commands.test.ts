import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { registerRalphCommands } from '../commands/ralph-commands.js';
import { registerStatusCommands } from '../commands/status-commands.js';
import { startLoop, stopLoop, getStatus } from '../services/ralph-loop.js';
import { getMessageCount } from '../hooks/message-monitor.js';
import { createMockApi, createMockConfig } from './helpers/mock-factory.js';

// ─── Ralph Commands ─────────────────────────────────────────
describe('registerRalphCommands', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
  });

  it('registers 3 commands (ralph_loop, ralph_stop, omoc_status)', () => {
    registerRalphCommands(mockApi);

    expect(mockApi.registerCommand).toHaveBeenCalledTimes(3);

    const names = mockApi.registerCommand.mock.calls.map((c: any) => c[0].name);
    expect(names).toContain('ralph_loop');
    expect(names).toContain('ralph_stop');
    expect(names).toContain('omoc_status');
  });

  it('ralph_loop parses args and calls startLoop', async () => {
    registerRalphCommands(mockApi);

    const ralphLoopCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ralph_loop'
    );
    const handler = ralphLoopCall[0].handler;
    const result = await handler({ args: '5 task.md' });

    expect(startLoop).toHaveBeenCalledWith('task.md', 5);
    expect(result.text).toContain('Ralph Loop started');
    expect(result.text).toContain('Max iterations: 10');
  });

  it('ralph_stop calls stopLoop', async () => {
    registerRalphCommands(mockApi);

    const ralphStopCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'ralph_stop'
    );
    const handler = ralphStopCall[0].handler;
    const result = await handler({});

    expect(stopLoop).toHaveBeenCalled();
    expect(result.text).toContain('Ralph Loop stopped');
    expect(result.text).toContain('Final iteration: 5/10');
  });

  it('omoc_status returns formatted summary with ralph state', async () => {
    registerRalphCommands(mockApi);

    const statusCall = mockApi.registerCommand.mock.calls.find(
      (c: any) => c[0].name === 'omoc_status'
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
    mockApi = createMockApi({ config: createMockConfig({ todo_enforcer_enabled: true }) });
  });

  it('registers omoc_health and omoc_config commands', () => {
    registerStatusCommands(mockApi);

    expect(mockApi.registerCommand).toHaveBeenCalledTimes(2);
    const names = mockApi.registerCommand.mock.calls.map((c: any) => c[0].name);
    expect(names).toContain('omoc_health');
    expect(names).toContain('omoc_config');
  });

  it('omoc_health returns version and service status', async () => {
    registerStatusCommands(mockApi);
    const healthCall = mockApi.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc_health');
    const handler = healthCall[0].handler;

    const result = await handler({});

    expect(getStatus).toHaveBeenCalled();
    expect(getMessageCount).toHaveBeenCalled();
    expect(result.text).toContain('oh-my-openclaw Health');
    expect(result.text).toContain('Version: 9.9.9-test');
    expect(result.text).toContain('Ralph Loop: INACTIVE');
    expect(result.text).toContain('Messages Tracked: 42');
  });

  it('omoc_config returns current config in JSON block', () => {
    registerStatusCommands(mockApi);
    const configCall = mockApi.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc_config');
    const handler = configCall[0].handler;

    const result = handler({});

    expect(result.text).toContain('oh-my-openclaw Configuration');
    expect(result.text).toContain('```json');
    expect(result.text).toContain('"todo_enforcer_enabled": true');
  });

  it('omoc_config masks sensitive values', () => {
    const apiWithSensitiveConfig = createMockApi({
      config: {
        ...createMockConfig({ todo_enforcer_enabled: true }),
        api_token: 'token-value',
        service_secret: 'secret-value',
        api_key: 'key-value',
      } as any,
    });
    registerStatusCommands(apiWithSensitiveConfig);
    const configCall = apiWithSensitiveConfig.registerCommand.mock.calls.find((c: any) => c[0].name === 'omoc_config');
    const handler = configCall[0].handler;

    const result = handler({});

    expect(result.text).toContain('"api_token": "***"');
    expect(result.text).toContain('"service_secret": "***"');
    expect(result.text).toContain('"api_key": "***"');
  });

  it('omoc_config masks uppercase, camelCase, and secret keys while preserving normal fields', () => {
    const apiFromFactory = createMockApi({
      config: {
        ...createMockApi().config,
        API_KEY: 'secret123',
        apiToken: 'token456',
        SECRET_VALUE: 'hidden',
        normalField: 'visible',
      } as any,
    });
    registerStatusCommands(apiFromFactory);
    const configCall = (apiFromFactory.registerCommand as ReturnType<typeof vi.fn>).mock.calls.find((c: any) => c[0].name === 'omoc_config');
    expect(configCall).toBeDefined();
    const handler = configCall![0].handler;

    const result = handler({});

    expect(result.text).toContain('"API_KEY": "***"');
    expect(result.text).toContain('"apiToken": "***"');
    expect(result.text).toContain('"SECRET_VALUE": "***"');
    expect(result.text).toContain('"normalField": "visible"');
  });
});
