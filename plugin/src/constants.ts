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
