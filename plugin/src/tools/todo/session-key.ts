// Module-level state to capture session key from session_start hook
let currentSessionKey: string | undefined;

export function setCurrentSessionKey(key: string | undefined): void {
  currentSessionKey = key;
}

export function getCurrentSessionKey(): string | undefined {
  return currentSessionKey;
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
