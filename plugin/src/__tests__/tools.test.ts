import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    access: vi.fn(),
  },
  readFileSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../utils/state.js', () => ({
  readState: vi.fn(),
  writeState: vi.fn(),
  ensureDir: vi.fn(),
}));

vi.mock('../utils/config.js', () => ({
  getConfig: vi.fn((api: any) => ({
    ...api.config,
  })),
}));

import { execSync } from 'child_process';
import * as childProcess from 'child_process';
import { promises as fs } from 'fs';
import { registerDelegateTool } from '../tools/task-delegation.js';
import { registerLookAtTool } from '../tools/look-at.js';
import { registerCheckpointTool } from '../tools/checkpoint.js';
import { readState, writeState, ensureDir } from '../utils/state.js';
import { createMockApi, createMockConfig } from './helpers/mock-factory.js';

// ─── Delegate Tool Tests ────────────────────────────────────────────

describe('registerDelegateTool', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
  });

  it("registers with name 'omoc_delegate' and optional=true", () => {
    registerDelegateTool(mockApi);

    expect(mockApi.registerTool).toHaveBeenCalledOnce();
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe('omoc_delegate');
    expect(toolConfig.optional).toBe(true);
  });

  it('execute returns sessions_spawn instruction for valid category', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      task_description: 'test task',
      category: 'quick',
    });

    const text = result.content[0].text;
    expect(text).toContain('claude-sonnet-4-6');
    expect(text).toContain('sessions_spawn');
    expect(text).toContain('test task');
  });

  it('uses custom model from config.model_routing', async () => {
    const customApi = createMockApi({
      config: createMockConfig({ model_routing: { quick: { model: 'custom-model-v1', alternatives: ['fallback-1'] } } }),
    });
    registerDelegateTool(customApi);
    const toolConfig = customApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ task_description: 'test', category: 'quick' });

    expect(result.content[0].text).toContain('custom-model-v1');
    expect(result.content[0].text).toContain('fallback-1');
  });

  it('returns error for empty task_description', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      task_description: '   ',
      category: 'quick',
    });

    expect(result.content[0].text).toContain('Task description is required and cannot be empty');
  });

  it('returns error for overly long task_description', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      task_description: 'a'.repeat(10001),
      category: 'quick',
    });

    expect(result.content[0].text).toContain('Task description too long (max 10000 chars)');
  });

  it('includes fallback suggestion text when alternatives exist', async () => {
    const customApi = createMockApi({
      config: createMockConfig({
        model_routing: {
          deep: {
            model: 'custom-deep-model',
            alternatives: ['fallback-a', 'fallback-b'],
          },
        },
      }),
    });
    registerDelegateTool(customApi);
    const toolConfig = customApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      task_description: 'test fallback messaging',
      category: 'deep',
    });

    expect(result.content[0].text).toContain('If "custom-deep-model" is unavailable, try: fallback-a, fallback-b');
  });

  it('execute returns error for invalid category', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      task_description: 'test task',
      category: 'nonexistent',
    });

    const text = result.content[0].text.toLowerCase();
    expect(text).toContain('invalid');
    expect(text).toContain('error');
  });

  it('parameters schema has required fields', () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    const schema = toolConfig.parameters;

    expect(schema.properties).toHaveProperty('task_description');
    expect(schema.properties).toHaveProperty('category');
    expect(schema.required).toContain('task_description');
    expect(schema.required).toContain('category');
  });
});

// ─── Look-At Tool Tests ─────────────────────────────────────────────

describe('registerLookAtTool', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi();
  });

  it("registers with name 'omoc_look_at' and optional=true", () => {
    registerLookAtTool(mockApi);

    expect(mockApi.registerTool).toHaveBeenCalledOnce();
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe('omoc_look_at');
    expect(toolConfig.optional).toBe(true);
  });

  it('escapes shell arguments in file_path to prevent injection', async () => {
    const mockedExecSync = vi.mocked(execSync);
    mockedExecSync.mockImplementation(() => Buffer.from(''));
    vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any);
    vi.mocked(fs.readFile).mockResolvedValue('gemini output');
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    await toolConfig.execute({
      file_path: "file'with'quotes.pdf",
      goal: 'analyze this',
    });
      expect(mockedExecSync).toHaveBeenCalled();
    const cmdArg = mockedExecSync.mock.calls[0][0] as string;
    expect(cmdArg).not.toContain("file'with'quotes.pdf");
    expect(cmdArg).toContain('file');
  });

  it('handles execution errors gracefully', async () => {
    const mockedExecSync = vi.mocked(execSync);
    mockedExecSync.mockImplementation(() => {
      throw new Error('tmux not found');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      file_path: '/some/file.pdf',
      goal: 'analyze this',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('tmux not found');
  });

  it('uses correct tmux socket path', async () => {
    const mockedExecSync = vi.mocked(execSync);
    mockedExecSync.mockImplementation(() => Buffer.from(''));
    vi.mocked(fs.stat).mockResolvedValue({ size: 50 } as any);
    vi.mocked(fs.readFile).mockResolvedValue('result text');
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    await toolConfig.execute({
      file_path: '/test/file.pdf',
      goal: 'test',
    });
      expect(mockedExecSync).toHaveBeenCalled();
    const cmdArg = mockedExecSync.mock.calls[0][0] as string;
    expect(cmdArg).toContain('/tmp/openclaw-tmux-sockets/openclaw.sock');
  });

  it('passes file_path as execFileSync arg array without shell interpolation', async () => {
    const mockApiFromFactory = createMockApi();

    const mockedExecFileSync = vi.fn();
    Object.defineProperty(childProcess, 'execFileSync', {
      value: mockedExecFileSync,
      configurable: true,
    });

    vi.mocked(fs.stat).mockResolvedValue({ size: 128 } as any);
    vi.mocked(fs.readFile).mockResolvedValue('ok');
    vi.mocked(fs.unlink).mockResolvedValue(undefined);

    registerLookAtTool(mockApiFromFactory);
    const toolConfig = mockApiFromFactory.registerTool.mock.calls[0][0];

    const maliciousPath = "report.pdf; rm -rf / $(whoami)";
    await toolConfig.execute({
      file_path: maliciousPath,
      goal: 'security regression',
    });

    expect(mockedExecFileSync).toHaveBeenCalled();
    const firstCall = mockedExecFileSync.mock.calls[0];
    expect(firstCall[0]).toBe('tmux');
    expect(Array.isArray(firstCall[1])).toBe(true);
    expect(firstCall[1]).toContain('-l');
    expect(firstCall[1]).toContain('--');
    expect(firstCall[1][firstCall[1].length - 1]).toContain(maliciousPath);
    expect(firstCall[1][firstCall[1].length - 1]).toContain("-f 'report.pdf; rm -rf / $(whoami)'");
  });
});

// ─── Checkpoint Tool Tests ──────────────────────────────────────────

describe('registerCheckpointTool', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApi({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
  });

  it("registers with name 'omoc_checkpoint' and optional=true", () => {
    registerCheckpointTool(mockApi);

    expect(mockApi.registerTool).toHaveBeenCalledOnce();
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe('omoc_checkpoint');
    expect(toolConfig.optional).toBe(true);
  });

  it('save action creates checkpoint with correct schema', async () => {
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(writeState).mockResolvedValue(undefined);

    registerCheckpointTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({
      action: 'save',
      task: 'test-task',
      step: 'step-1',
      changed_files: ['a.ts', 'b.ts'],
      next_action: 'continue',
    });

    expect(writeState).toHaveBeenCalledOnce();
    const [filePath, data] = vi.mocked(writeState).mock.calls[0];
    expect(filePath).toContain('/tmp/test-checkpoints/checkpoint-');
    expect(data).toMatchObject({
      type: 'session-checkpoint',
      task: 'test-task',
      step: 'step-1',
      changed_files: ['a.ts', 'b.ts'],
      next_action: 'continue',
    });
    expect((data as any).verification).toEqual({
      diagnostics: 'not-run',
      tests: 'not-run',
      build: 'not-run',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.saved).toMatch(/^checkpoint-\d+\.json$/);
  });

  it("load returns 'No checkpoints found' when dir is empty", async () => {
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    registerCheckpointTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ action: 'load' });

    expect(result.content[0].text).toBe('No checkpoints found');
  });

  it('load returns error when most recent checkpoint is corrupted', async () => {
    const factoryApi = createMockApi({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['checkpoint-999.json'] as any);
    vi.mocked(readState).mockResolvedValue({
      ok: false,
      error: 'corrupted',
      message: 'Malformed JSON in /tmp/test-checkpoints/checkpoint-999.json',
    });

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ action: 'load' });

    expect(result.content[0].text).toContain('Error: Failed to load checkpoint checkpoint-999.json');
    expect(result.content[0].text).toContain('Malformed JSON');
  });

  it('load handles missing checkpoint file by returning tool error', async () => {
    const factoryApi = createMockApi({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['checkpoint-111.json'] as any);
    vi.mocked(readState).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'File not found: /tmp/test-checkpoints/checkpoint-111.json',
    });

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ action: 'load' });

    expect(result.content[0].text).toContain('Error: Failed to load checkpoint checkpoint-111.json');
    expect(result.content[0].text).toContain('File not found');
  });

  it('list handles missing directory gracefully with empty result message', async () => {
    const factoryApi = createMockApi({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ action: 'list' });

    expect(result.content[0].text).toBe('No checkpoints found');
  });

  it('list returns sorted checkpoint files', async () => {
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([
      'checkpoint-100.json',
      'checkpoint-300.json',
      'checkpoint-200.json',
    ] as any);
    vi.mocked(readState).mockImplementation(async (filePath: string) => {
      if (filePath.includes('300')) {
        return { ok: true, data: { timestamp: '2025-01-03', task: 'task-c', step: 'step-3' } };
      }
      if (filePath.includes('200')) {
        return { ok: true, data: { timestamp: '2025-01-02', task: 'task-b', step: 'step-2' } };
      }
      return { ok: true, data: { timestamp: '2025-01-01', task: 'task-a', step: 'step-1' } };
    });

    registerCheckpointTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute({ action: 'list' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.checkpoints).toHaveLength(3);
    // Sorted reverse alphabetically: 300, 200, 100
    expect(parsed.checkpoints[0].file).toBe('checkpoint-300.json');
    expect(parsed.checkpoints[1].file).toBe('checkpoint-200.json');
    expect(parsed.checkpoints[2].file).toBe('checkpoint-100.json');
  });
});
