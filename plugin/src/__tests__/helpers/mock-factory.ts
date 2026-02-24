import { vi } from 'vitest';
import type { OmocPluginApi, PluginConfig, TypedHookContext } from '../../types.js';

/**
 * Creates a fully-typed mock OmocPluginApi with sensible defaults.
 * Superset of all mock shapes used across 7 test files.
 * All methods are vi.fn() mocks for assertion support.
 *
 * @param overrides - Partial config overrides (spread last)
 * @returns Mock OmocPluginApi with all required methods
 */
export function createMockApi(overrides?: Partial<OmocPluginApi>): OmocPluginApi {
  return {
    config: createMockConfig(),
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
    registerCli: vi.fn(),
    on: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a fully-typed mock PluginConfig with sensible defaults.
 * Includes all fields from PluginConfig interface.
 *
 * @param overrides - Partial config overrides (spread last)
 * @returns Mock PluginConfig with all required fields
 */
export function createMockConfig(overrides?: Partial<PluginConfig>): PluginConfig {
  return {
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
    ...overrides,
  };
}

/**
 * Creates a fully-typed mock TypedHookContext.
 * Provides context for hook handlers (agentId, sessionKey, sessionId, etc).
 *
 * @param overrides - Partial context overrides (spread last)
 * @returns Mock TypedHookContext with sensible defaults
 */
export function createMockContext(overrides?: Partial<TypedHookContext>): TypedHookContext {
  return {
    agentId: 'test-agent',
    sessionKey: 'test-session-key',
    sessionId: 'test-session-id',
    workspaceDir: '/tmp/test-workspace',
    messageProvider: undefined,
    ...overrides,
  };
}
