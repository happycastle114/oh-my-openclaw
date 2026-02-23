import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateConfig, getConfig } from '../utils/config.js';
import { isValidCategory, sanitizeToolName, clampIterations } from '../utils/validation.js';
import { CATEGORIES } from '../constants.js';
import { VERSION } from '../version.js';
import type { OmocPluginApi } from '../types.js';

function createMockApi(configOverrides = {}): OmocPluginApi {
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
  } as unknown as OmocPluginApi;
}

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
    const api = createMockApi({ todo_enforcer_cooldown_ms: -500 });
    const config = getConfig(api);
    expect(config.todo_enforcer_cooldown_ms).toBe(0);
  });

  it('clamps negative max_failures to 0', () => {
    const api = createMockApi({ todo_enforcer_max_failures: -3 });
    const config = getConfig(api);
    expect(config.todo_enforcer_max_failures).toBe(0);
  });

  it('clamps max_ralph_iterations to 100', () => {
    const api = createMockApi({ max_ralph_iterations: 200 });
    const config = getConfig(api);
    expect(config.max_ralph_iterations).toBe(100);
  });

  it('clamps negative max_ralph_iterations to 0', () => {
    const api = createMockApi({ max_ralph_iterations: -5 });
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
