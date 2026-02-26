import { SEARCH_PATTERN, SEARCH_MESSAGE } from './search-mode.js';
import { ANALYZE_PATTERN, ANALYZE_MESSAGE } from './analyze-mode.js';
import { ULTRAWORK_PATTERN, ULTRAWORK_MESSAGE } from './ultrawork-mode.js';
import { CODING_PATTERN, CODING_MESSAGE } from './coding-mode.js';
import { PLAN_PATTERN, PLAN_MESSAGE } from './plan-mode.js';
import { START_WORK_PATTERN, START_WORK_MESSAGE } from './start-work-mode.js';

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`]+`/g;

export type KeywordType = 'ultrawork' | 'search' | 'analyze' | 'coding' | 'plan' | 'start_work';

export interface DetectedKeyword {
  type: KeywordType;
  message: string;
}

interface KeywordDetector {
  type: KeywordType;
  pattern: RegExp;
  message: string;
}

/** Persona to auto-switch when a workflow keyword is detected */
export const WORKFLOW_PERSONA_MAP: Partial<Record<KeywordType, string>> = {
  ultrawork: 'omoc_atlas',
  plan: 'omoc_prometheus',
  start_work: 'omoc_atlas',
};

const KEYWORD_DETECTORS: KeywordDetector[] = [
  { type: 'ultrawork', pattern: ULTRAWORK_PATTERN, message: ULTRAWORK_MESSAGE },
  { type: 'plan', pattern: PLAN_PATTERN, message: PLAN_MESSAGE },
  { type: 'start_work', pattern: START_WORK_PATTERN, message: START_WORK_MESSAGE },
  { type: 'search', pattern: SEARCH_PATTERN, message: SEARCH_MESSAGE },
  { type: 'analyze', pattern: ANALYZE_PATTERN, message: ANALYZE_MESSAGE },
  { type: 'coding', pattern: CODING_PATTERN, message: CODING_MESSAGE },
];

function removeCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, '').replace(INLINE_CODE_PATTERN, '');
}

export function detectKeywords(text: string): DetectedKeyword[] {
  const cleaned = removeCodeBlocks(text);
  return KEYWORD_DETECTORS
    .filter(({ pattern }) => pattern.test(cleaned))
    .map(({ type, message }) => ({ type, message }));
}
