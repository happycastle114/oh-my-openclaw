import { join } from 'path';
import { PluginConfig, OmocPluginApi, ABSOLUTE_MAX_RALPH_ITERATIONS } from '../types.js';
import { resolveOpenClawWorkspaceDir } from './paths.js';

export function getConfig(api: OmocPluginApi): PluginConfig {
  const wsDir = resolveOpenClawWorkspaceDir();
  const defaults: PluginConfig = {
    max_ralph_iterations: 10,
    todo_enforcer_enabled: false,
    todo_enforcer_cooldown_ms: 2000,
    todo_enforcer_max_failures: 5,
    comment_checker_enabled: true,
    checkpoint_dir: join(wsDir, 'checkpoints'),
    model_routing: undefined,
    webhook_bridge_enabled: false,
    gateway_url: process.env.OPENCLAW_GATEWAY_URL ?? 'http://127.0.0.1:18789',
    hooks_token: process.env.OPENCLAW_HOOKS_TOKEN ?? '',
    webhook_reminder_interval_ms: 5 * 60 * 1000, // 5 minutes
    webhook_subagent_stale_threshold_ms: 10 * 60 * 1000, // 10 minutes
  };

  const config = { ...defaults, ...(api.pluginConfig ?? api.config) };
  const validation = validateConfig(config);

  if (!validation.valid) {
    api.logger.warn(`Config validation failed: ${validation.errors.join(', ')}`);
  }

  if (config.max_ralph_iterations > ABSOLUTE_MAX_RALPH_ITERATIONS) {
    config.max_ralph_iterations = ABSOLUTE_MAX_RALPH_ITERATIONS;
  }
  if (config.max_ralph_iterations < 0) {
    config.max_ralph_iterations = 0;
  }

  if (config.todo_enforcer_cooldown_ms < 0) {
    config.todo_enforcer_cooldown_ms = 0;
  }
  if (config.todo_enforcer_max_failures < 0) {
    config.todo_enforcer_max_failures = 0;
  }

  return config;
}

export function validateConfig(config: Partial<PluginConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.max_ralph_iterations !== undefined) {
    if (config.max_ralph_iterations < 0 || config.max_ralph_iterations > ABSOLUTE_MAX_RALPH_ITERATIONS) {
      errors.push(`max_ralph_iterations must be between 0 and ${ABSOLUTE_MAX_RALPH_ITERATIONS}`);
    }
  }

  if (config.todo_enforcer_cooldown_ms !== undefined) {
    if (config.todo_enforcer_cooldown_ms < 0) {
      errors.push('todo_enforcer_cooldown_ms must be >= 0 (negative values clamped to 0)');
    }
  }

  if (config.todo_enforcer_max_failures !== undefined) {
    if (config.todo_enforcer_max_failures < 0) {
      errors.push('todo_enforcer_max_failures must be >= 0 (negative values clamped to 0)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
