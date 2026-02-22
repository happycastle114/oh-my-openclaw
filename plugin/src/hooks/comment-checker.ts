import { OmocPluginApi, CommentViolation } from '../types.js';
import { getConfig } from '../utils/config.js';

interface ToolResultPayload {
  tool?: string;
  content?: string;
  file?: string;
  filename?: string;
  path?: string;
  [key: string]: unknown;
}

const NON_CODE_EXTENSIONS = ['.md', '.json', '.yaml', '.yml', '.txt'];

const AI_SLOP_PATTERNS: RegExp[] = [
  /^\s*\/\/\s*Import\s/i,
  /^\s*\/\/\s*Define\s/i,
  /^\s*\/\/\s*Return\s/i,
  /^\s*\/\/\s*Export\s/i,
  /^\s*\/\/\s*Set\s.*\sto\s/i,
  /^\s*\/\/\s*Loop\s/i,
  /^\s*\/\/\s*Initialize\s/i,
  /^\s*\/\/\s*Create\s(a|an|the|new)\s/i,
  /^\s*\/\/\s*This\s(function|method|class|module|component)\s/i,
  /^\s*\/\/\s*Handle\s(the|an?)?\s?(error|exception|response|request|event)/i,
  /^\s*\/\/\s*Check\s(if|whether)\s/i,
];

function hasNonCodeExtension(value: string): boolean {
  const lowered = value.toLowerCase();
  return NON_CODE_EXTENSIONS.some((ext) => lowered.endsWith(ext));
}

function extractFileHint(payload: ToolResultPayload): string {
  if (typeof payload.file === 'string') {
    return payload.file;
  }
  if (typeof payload.filename === 'string') {
    return payload.filename;
  }
  if (typeof payload.path === 'string') {
    return payload.path;
  }
  return 'unknown';
}

function contentLooksNonCode(content: string): boolean {
  const extensionMatch = content.match(/\b[^\s"']+\.(md|json|ya?ml|txt)\b/i);
  return extensionMatch !== null;
}

function findViolations(content: string, file: string): CommentViolation[] {
  const violations: CommentViolation[] = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineText = lines[index];
    const isViolation = AI_SLOP_PATTERNS.some((pattern) => pattern.test(lineText));

    if (isViolation) {
      violations.push({
        file,
        line: index + 1,
        content: lineText.trim(),
        reason: 'AI slop: obvious/narrating comment',
      });
    }
  }

  return violations;
}

function appendViolationSummary(content: string, violations: CommentViolation[]): string {
  const details = violations
    .map((violation) => `  - Line ${violation.line}: "${violation.content}" → ${violation.reason}`)
    .join('\n');

  return `${content}\n\n---\n⚠️ [OMOC Comment Checker] Found ${violations.length} AI slop comment(s):\n${details}\n\nConsider removing these obvious/narrating comments to keep code clean.`;
}

export function registerCommentChecker(api: OmocPluginApi): void {
  api.registerHook(
    'tool_result_persist',
    (payload: ToolResultPayload): ToolResultPayload | undefined => {
      const config = getConfig(api);
      if (!config.comment_checker_enabled) {
        return undefined;
      }

      const { content } = payload;
      if (typeof content !== 'string' || content.trim().length === 0) {
        return undefined;
      }

      const fileHint = extractFileHint(payload);
      if (hasNonCodeExtension(fileHint) || contentLooksNonCode(content)) {
        return undefined;
      }

      const violations = findViolations(content, fileHint);
      if (violations.length === 0) {
        return undefined;
      }

      const updatedContent = appendViolationSummary(content, violations);
      return {
        ...payload,
        content: updatedContent,
      };
    },
    {
      name: 'oh-my-openclaw.comment-checker',
      description: 'Detects AI slop comments in code',
    }
  );
}
