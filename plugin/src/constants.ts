// Plugin constants
export const PLUGIN_ID = 'oh-my-openclaw';
export const TOOL_PREFIX = 'omoc_';
export const ABSOLUTE_MAX_RALPH_ITERATIONS = 100;
export const LOG_PREFIX = '[omoc]';
export const READ_ONLY_DENY = ['write', 'edit', 'apply_patch', 'sessions_spawn'];
export const PLANNER_DENY = ['write', 'edit', 'apply_patch'];

// Category definitions
export const CATEGORIES = [
  'quick',
  'deep',
  'ultrabrain',
  'visual-engineering',
  'multimodal',
  'artistry',
  'unspecified-low',
  'unspecified-high',
  'writing',
] as const;

export type Category = (typeof CATEGORIES)[number];
