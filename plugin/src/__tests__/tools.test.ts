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
  execFile: vi.fn(),
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

import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import { registerDelegateTool } from '../tools/task-delegation.js';
import { registerLookAtTool } from '../tools/look-at.js';
import { registerWebSearchTool } from '../tools/web-search.js';
import { registerCheckpointTool } from '../tools/checkpoint.js';
import { readState, writeState, ensureDir } from '../utils/state.js';
import { createMockApi, createMockConfig } from './helpers/mock-factory.js';

const createMockApiAny = createMockApi as (...args: any[]) => any;
const mockedExecFile = vi.mocked(execFile) as any;

// ─── Delegate Tool Tests ────────────────────────────────────────────

describe('registerDelegateTool', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApiAny();
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

    const result = await toolConfig.execute('test-call-id', {
      task_description: 'test task',
      category: 'quick',
    });

    const text = result.content[0].text;
    expect(text).toContain('claude-sonnet-4-6');
    expect(text).toContain('sessions_spawn');
    expect(text).toContain('test task');
  });

  it('uses custom model from config.model_routing', async () => {
    const customApi = createMockApiAny({
      config: createMockConfig({ model_routing: { quick: { model: 'custom-model-v1', alternatives: ['fallback-1'] } } }),
    });
    registerDelegateTool(customApi);
    const toolConfig = customApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', { task_description: 'test', category: 'quick' });

    expect(result.content[0].text).toContain('custom-model-v1');
    expect(result.content[0].text).toContain('fallback-1');
  });

  it('returns error for empty task_description', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      task_description: '   ',
      category: 'quick',
    });

    expect(result.content[0].text).toContain('Task description is required and cannot be empty');
  });

  it('returns error for overly long task_description', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      task_description: 'a'.repeat(10001),
      category: 'quick',
    });

    expect(result.content[0].text).toContain('Task description too long (max 10000 chars)');
  });

  it('includes fallback suggestion text when alternatives exist', async () => {
    const customApi = createMockApiAny({
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

    const result = await toolConfig.execute('test-call-id', {
      task_description: 'test fallback messaging',
      category: 'deep',
    });

    expect(result.content[0].text).toContain('If "custom-deep-model" is unavailable, try: fallback-a, fallback-b');
  });

  it('execute returns error for invalid category', async () => {
    registerDelegateTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
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
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApiAny();
  });

  it("registers with name 'omoc_look_at' and optional=true", () => {
    registerLookAtTool(mockApi);

    expect(mockApi.registerTool).toHaveBeenCalledOnce();
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe('omoc_look_at');
    expect(toolConfig.optional).toBe(true);
  });

  it('calls execFile with correct arguments', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, 'Analysis result text', '');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      file_path: '/path/to/image.png',
      goal: 'describe this image',
      model: 'gemini-2.5-pro',
    });

    expect(mockedExecFile).toHaveBeenCalledOnce();
    const [cmd, args, opts] = mockedExecFile.mock.calls[0];
    expect(cmd).toBe('gemini');
    expect(args).toEqual(['-m', 'gemini-2.5-pro', '--prompt', 'describe this image', '-f', '/path/to/image.png', '-o', 'text']);
    expect(opts).toMatchObject({ timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    expect(result.content[0].text).toBe('Analysis result text');
  });

  it('uses default model gemini-2.5-flash when model is not provided', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, 'output', '');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    await toolConfig.execute('test-call-id', {
      file_path: '/test.pdf',
      goal: 'analyze',
    });

    const [, args] = mockedExecFile.mock.calls[0];
    expect(args[1]).toBe('gemini-2.5-flash');
  });

  it('returns toolError when CLI times out (error.killed === true)', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      const error = new Error('process killed') as any;
      error.killed = true;
      cb(error, '', '');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      file_path: '/large/video.mp4',
      goal: 'summarize',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('timed out after 60 seconds');
  });

  it('returns toolError with stderr detail on non-zero exit', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      const error = new Error('exit 1') as any;
      error.killed = false;
      error.code = 1;
      cb(error, '', 'model not found');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      file_path: '/some/file.pdf',
      goal: 'analyze',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Gemini CLI failed (exit 1)');
    expect(result.content[0].text).toContain('model not found');
  });

  it('returns fallback message for empty stdout', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '   ', '');
    });

    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      file_path: '/empty.png',
      goal: 'describe',
    });

    expect(result.content[0].text).toBe('(empty response from Gemini CLI)');
  });

  it('parameters schema has required file_path and goal fields', () => {
    registerLookAtTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    const schema = toolConfig.parameters;

    expect(schema.properties).toHaveProperty('file_path');
    expect(schema.properties).toHaveProperty('goal');
    expect(schema.required).toContain('file_path');
    expect(schema.required).toContain('goal');
  });
});

// ─── Web Search Tool Tests ──────────────────────────────────────────

describe('registerWebSearchTool', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApiAny();
  });

  it("registers with name 'omoc_web_search' and optional=true", () => {
    registerWebSearchTool(mockApi);

    expect(mockApi.registerTool).toHaveBeenCalledOnce();
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    expect(toolConfig.name).toBe('omoc_web_search');
    expect(toolConfig.optional).toBe(true);
  });

  it('successful web search returns markdown text', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '## Search Results\n\n- Result 1\n- Result 2', '');
    });

    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      query: 'latest TypeScript features',
    });

    expect(result.content[0].text).toBe('## Search Results\n\n- Result 1\n- Result 2');
    // Verify no "Error:" prefix
    expect(result.content[0].text).not.toContain('Error');

    // Verify execFile was called with correct args
    const [cmd, args, opts] = mockedExecFile.mock.calls[0];
    expect(cmd).toBe('gemini');
    expect(args).toEqual(['-m', 'gemini-2.5-flash', '--prompt', 'latest TypeScript features', '-o', 'text']);
    expect(opts).toMatchObject({ timeout: 90_000 });
  });

  it('returns toolError for empty query', async () => {
    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      query: '   ',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Query is required and must not be empty');
    // execFile should NOT have been called
    expect(mockedExecFile).not.toHaveBeenCalled();
  });

  it('returns toolError with stderr on CLI failure', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      const error = new Error('command failed') as any;
      error.code = 1;
      cb(error, '', 'authentication error');
    });

    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      query: 'test query',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('authentication error');
  });

  it('returns toolError for empty output', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, '  ', '');
    });

    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', {
      query: 'some query',
    });

    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Gemini CLI returned empty output');
  });

  it('parameter schema has required query field', () => {
    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];
    const schema = toolConfig.parameters;

    expect(schema.properties).toHaveProperty('query');
    expect(schema.required).toContain('query');
  });

  it('uses custom model when provided', async () => {
    mockedExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
      cb(null, 'results', '');
    });

    registerWebSearchTool(mockApi);
    const toolConfig = mockApi.registerTool.mock.calls[0][0];

    await toolConfig.execute('test-call-id', {
      query: 'test',
      model: 'gemini-2.5-pro',
    });

    const [, args] = mockedExecFile.mock.calls[0];
    expect(args[1]).toBe('gemini-2.5-pro');
  });
});

// ─── Checkpoint Tool Tests ──────────────────────────────────────────

describe('registerCheckpointTool', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = createMockApiAny({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
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

    const result = await toolConfig.execute('test-call-id', {
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

    const result = await toolConfig.execute('test-call-id', { action: 'load' });

    expect(result.content[0].text).toBe('No checkpoints found');
  });

  it('load returns error when most recent checkpoint is corrupted', async () => {
    const factoryApi = createMockApiAny({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['checkpoint-999.json'] as any);
    vi.mocked(readState).mockResolvedValue({
      ok: false,
      error: 'corrupted',
      message: 'Malformed JSON in /tmp/test-checkpoints/checkpoint-999.json',
    });

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', { action: 'load' });

    expect(result.content[0].text).toContain('Error: Failed to load checkpoint checkpoint-999.json');
    expect(result.content[0].text).toContain('Malformed JSON');
  });

  it('load handles missing checkpoint file by returning tool error', async () => {
    const factoryApi = createMockApiAny({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['checkpoint-111.json'] as any);
    vi.mocked(readState).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'File not found: /tmp/test-checkpoints/checkpoint-111.json',
    });

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', { action: 'load' });

    expect(result.content[0].text).toContain('Error: Failed to load checkpoint checkpoint-111.json');
    expect(result.content[0].text).toContain('File not found');
  });

  it('list handles missing directory gracefully with empty result message', async () => {
    const factoryApi = createMockApiAny({ config: createMockConfig({ checkpoint_dir: '/tmp/test-checkpoints' }) });
    vi.mocked(ensureDir).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    registerCheckpointTool(factoryApi);
    const toolConfig = factoryApi.registerTool.mock.calls[0][0];

    const result = await toolConfig.execute('test-call-id', { action: 'list' });

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

    const result = await toolConfig.execute('test-call-id', { action: 'list' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.checkpoints).toHaveLength(3);
    // Sorted reverse alphabetically: 300, 200, 100
    expect(parsed.checkpoints[0].file).toBe('checkpoint-300.json');
    expect(parsed.checkpoints[1].file).toBe('checkpoint-200.json');
    expect(parsed.checkpoints[2].file).toBe('checkpoint-100.json');
  });
});
