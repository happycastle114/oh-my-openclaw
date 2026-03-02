/**
 * Session key management for todo tools.
 *
 * ## Concurrency Model
 *
 * This module uses a singleton `currentSessionKey` for capturing the session key
 * from the `session_start` hook. While AsyncLocalStorage would provide better
 * isolation for truly concurrent sessions, OpenClaw's execution model makes
 * this unnecessary in practice:
 *
 * 1. OpenClaw processes one agent turn at a time per session
 * 2. Tool calls within a single agent turn are sequential (not parallel)
 * 3. Session lifecycle hooks (`session_start`, `session_end`) fire synchronously
 *    in the session context before/after agent turns
 *
 * This means there's no actual concurrent access to `currentSessionKey` within
 * a single session. The singleton pattern is safe because:
 * - Each session has its own isolated execution context
 * - Tool executions are sequential within a turn
 * - The safety net `tool_result_persist` hook validates sessionKey correctness
 *
 * ## Safety Net
 *
 * As an additional safeguard, the `todo-reminder` hook registers a
 * `tool_result_persist` hook that validates and corrects the sessionKey
 * for todo tools after each tool execution.
 */

// Module-level state to capture session key from session_start hook
let currentSessionKey: string | undefined;

export function setCurrentSessionKey(key: string | undefined): void {
  currentSessionKey = key;
}

export function getCurrentSessionKey(): string | undefined {
  return currentSessionKey;
}

export function clearCurrentSessionKey(): void {
  currentSessionKey = undefined;
}

export function extractSessionKey(options?: unknown): string | undefined {
  if (typeof options === 'object' && options !== null) {
    const opts = options as Record<string, unknown>;
    if (typeof opts.sessionKey === 'string') return opts.sessionKey;
    if (typeof opts.sessionId === 'string') return opts.sessionId;
  }
  return undefined;
}

export function resolveSessionKey(options?: unknown): string | undefined {
  // First try extracting from options (for future OpenClaw API changes)
  const extracted = extractSessionKey(options);
  if (extracted !== undefined) return extracted;

  // Fall back to captured session key from session_start hook
  return getCurrentSessionKey();
}
