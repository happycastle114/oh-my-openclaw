import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateConfig, getConfig } from '../utils/config.js';
import { isValidCategory, sanitizeToolName, clampIterations } from '../utils/validation.js';
import { CATEGORIES } from '../constants.js';
import { VERSION } from '../version.js';
import { createMockApi, createMockConfig } from './helpers/mock-factory.js';

const createFactoryApi = createMockApi;

describe('validateConfig', () => {
  it('returns valid for correct config', () => {
    const result = validateConfig({
      max_ralph_iterations: 10,
      todo_enforcer_cooldown_ms: 2000,
      todo_enforcer_max_failures: 5,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects negative max_ralph_iterations', () => {
    const result = validateConfig({ max_ralph_iterations: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects max_ralph_iterations over 100', () => {
    const result = validateConfig({ max_ralph_iterations: 200 });
    expect(result.valid).toBe(false);
  });

  it('rejects negative todo_enforcer_cooldown_ms', () => {
    const result = validateConfig({ todo_enforcer_cooldown_ms: -100 });
    expect(result.valid).toBe(false);
  });

  it('rejects negative todo_enforcer_max_failures', () => {
    const result = validateConfig({ todo_enforcer_max_failures: -1 });
    expect(result.valid).toBe(false);
  });

  it('accepts zero cooldown', () => {
    const result = validateConfig({ todo_enforcer_cooldown_ms: 0 });
    expect(result.valid).toBe(true);
  });

  it('accepts zero max_failures', () => {
    const result = validateConfig({ todo_enforcer_max_failures: 0 });
    expect(result.valid).toBe(true);
  });
});

describe('getConfig', () => {
  it('clamps negative cooldown_ms to 0', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_cooldown_ms: -500 }) });
    const config = getConfig(api);
    expect(config.todo_enforcer_cooldown_ms).toBe(0);
  });

  it('clamps negative max_failures to 0', () => {
    const api = createMockApi({ config: createMockConfig({ todo_enforcer_max_failures: -3 }) });
    const config = getConfig(api);
    expect(config.todo_enforcer_max_failures).toBe(0);
  });

  it('clamps max_ralph_iterations to 100', () => {
    const api = createMockApi({ config: createMockConfig({ max_ralph_iterations: 200 }) });
    const config = getConfig(api);
    expect(config.max_ralph_iterations).toBe(100);
  });

  it('clamps negative max_ralph_iterations to 0', () => {
    const api = createMockApi({ config: createMockConfig({ max_ralph_iterations: -5 }) });
    const config = getConfig(api);
    expect(config.max_ralph_iterations).toBe(0);
  });
});

describe('isValidCategory', () => {
  it.each([...CATEGORIES])('accepts valid category: %s', (cat) => {
    expect(isValidCategory(cat)).toBe(true);
  });

  it('rejects invalid category', () => {
    expect(isValidCategory('nonexistent')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidCategory('')).toBe(false);
  });
});

describe('sanitizeToolName', () => {
  it('adds omoc_ prefix', () => {
    expect(sanitizeToolName('myTool')).toBe('omoc_mytool');
  });

  it('does not double-prefix', () => {
    expect(sanitizeToolName('omoc_tool')).toBe('omoc_tool');
  });

  it('replaces special characters', () => {
    expect(sanitizeToolName('my-tool.v2')).toBe('omoc_my_tool_v2');
  });
});

describe('clampIterations', () => {
  it('clamps to max', () => {
    expect(clampIterations(200)).toBe(100);
  });

  it('clamps negative to 0', () => {
    expect(clampIterations(-5)).toBe(0);
  });

  it('passes through valid value', () => {
    expect(clampIterations(50)).toBe(50);
  });
});

describe('VERSION', () => {
  it('is a valid semver string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('matches package.json version', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../../package.json');
    expect(VERSION).toBe(pkg.version);
  });
});

describe('initPersonaState', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates state directory when initializing', async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const readFile = vi.fn().mockRejectedValue(new Error('ENOENT'));

    vi.doMock('fs/promises', () => ({
      readFile,
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir,
    }));

    const { initPersonaState } = await import('../utils/persona-state.js');
    await initPersonaState(createMockApi());

    expect(mkdir).toHaveBeenCalled();
    expect(readFile).toHaveBeenCalled();
  });

  it('loads existing persona state from disk', async () => {
    vi.doMock('fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue('omoc_frontend\n'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
    }));

    const { initPersonaState, getActivePersona } = await import('../utils/persona-state.js');
    await initPersonaState(createMockApi());

    expect(await getActivePersona()).toBe('omoc_frontend');
  });
});

describe('persona-state error handling', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('handles corrupted persona state reads gracefully and falls back to null', async () => {
    const readFileMock = vi
      .fn()
      .mockRejectedValue(new Error('Unexpected token } in JSON at position 1'));
    const mkdirMock = vi.fn().mockResolvedValue(undefined);
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.doMock('fs/promises', () => ({
      readFile: readFileMock,
      mkdir: mkdirMock,
      writeFile: writeFileMock,
    }));

    const { initPersonaState, getActivePersona } = await import('../utils/persona-state.js');
    const mockApi = createMockApi();

    await initPersonaState(mockApi);
    const persona = await getActivePersona();

    expect(persona).toBeNull();
    expect(readFileMock).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      '[omoc] Failed to load persona state from disk:',
      expect.any(Error)
    );
  });
});
