export function extractSessionKey(options?: unknown): string | undefined {
  if (typeof options === 'object' && options !== null) {
    const opts = options as Record<string, unknown>;
    if (typeof opts.sessionKey === 'string') return opts.sessionKey;
    if (typeof opts.sessionId === 'string') return opts.sessionId;
  }
  return undefined;
}
