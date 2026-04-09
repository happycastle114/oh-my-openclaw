import { AsyncLocalStorage } from 'node:async_hooks';

const sessionStore = new AsyncLocalStorage<string>();

let currentSessionKey: string | undefined;

export function runWithSessionKey<T>(sessionKey: string, fn: () => T): T {
  return sessionStore.run(sessionKey, fn);
}

export function getCurrentSessionKey(): string | undefined {
  return sessionStore.getStore() ?? currentSessionKey;
}

export function setCurrentSessionKey(key: string | undefined): void {
  currentSessionKey = key;
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
  const extracted = extractSessionKey(options);
  if (extracted !== undefined) return extracted;

  return getCurrentSessionKey();
}
