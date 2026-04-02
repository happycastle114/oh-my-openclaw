import { TOOL_PREFIX, ABSOLUTE_MAX_RALPH_ITERATIONS } from '../types.js';
import { CATEGORIES, type Category } from '../constants.js';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConfig(config: Record<string, unknown>): ConfigValidationResult {
  const errors: string[] = [];

  if (typeof config.max_ralph_iterations === 'number') {
    if (config.max_ralph_iterations < 0 || config.max_ralph_iterations > 100) {
      errors.push('max_ralph_iterations must be between 0 and 100');
    }
  }

  if (typeof config.todo_enforcer_cooldown_ms === 'number') {
    if (config.todo_enforcer_cooldown_ms < 0) {
      errors.push('todo_enforcer_cooldown_ms must be non-negative');
    }
  }

  if (typeof config.todo_enforcer_max_failures === 'number') {
    if (config.todo_enforcer_max_failures < 0) {
      errors.push('todo_enforcer_max_failures must be non-negative');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isValidCategory(cat: string): cat is Category {
  return (CATEGORIES as readonly string[]).includes(cat);
}

export function sanitizeToolName(name: string): string {
  let sanitized = name.toLowerCase();
  sanitized = sanitized.replace(/[^a-z0-9_]/g, '_');

  if (!sanitized.startsWith(TOOL_PREFIX)) {
    sanitized = TOOL_PREFIX + sanitized;
  }

  return sanitized;
}

export function clampIterations(n: number, max: number = ABSOLUTE_MAX_RALPH_ITERATIONS): number {
  return Math.max(0, Math.min(n, max));
}
