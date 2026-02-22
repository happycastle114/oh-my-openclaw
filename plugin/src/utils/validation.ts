import { TOOL_PREFIX, ABSOLUTE_MAX_RALPH_ITERATIONS } from '../types.js';

const VALID_CATEGORIES = [
  'quick',
  'deep',
  'ultrabrain',
  'visual-engineering',
  'multimodal',
  'artistry',
  'unspecified-low',
  'unspecified-high',
  'writing',
];

export function isValidCategory(cat: string): boolean {
  return VALID_CATEGORIES.includes(cat);
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
