export type ContextPriority = 'critical' | 'high' | 'normal' | 'low';
export type ContextSourceType = 'persona' | 'todo-enforcer' | 'system' | 'plugin';

export interface ContextEntry {
  id: string;
  content: string;
  priority: ContextPriority;
  source: ContextSourceType;
  oneShot?: boolean;
}

interface SessionData {
  entries: Map<string, ContextEntry>;
  lastAccessed: number;
}

export interface RegisterContextOptions {
  id: string;
  content: string;
  priority?: ContextPriority;
  source?: ContextSourceType;
  oneShot?: boolean;
}

const PRIORITY_ORDER: Record<ContextPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const MAX_SESSIONS = 100;
const SESSION_TTL_MS = 30 * 60 * 1000;

export class ContextCollector {
  private sessions: Map<string, SessionData> = new Map();

  register(sessionKey: string, options: RegisterContextOptions): void {
    this.pruneExpiredSessions();

    const sessionEntries = this.getOrCreateSession(sessionKey);
    const entry: ContextEntry = {
      id: options.id,
      content: options.content,
      priority: options.priority ?? 'normal',
      source: options.source ?? 'plugin',
      oneShot: options.oneShot ?? false,
    };
    sessionEntries.set(options.id, entry);

    if (this.sessions.size > MAX_SESSIONS) {
      const oldestKey = this.sessions.entries().next().value?.[0];
      if (oldestKey !== undefined) {
        this.sessions.delete(oldestKey);
      }
    }
  }

  unregister(sessionKey: string, entryId: string): void {
    const sessionData = this.sessions.get(sessionKey);
    if (!sessionData) {
      return;
    }

    sessionData.entries.delete(entryId);
    if (sessionData.entries.size === 0) {
      this.sessions.delete(sessionKey);
    }
  }

  collect(sessionKey: string): ContextEntry[] {
    this.pruneExpiredSessions();

    const sessionData = this.sessions.get(sessionKey);
    if (!sessionData) {
      return [];
    }

    sessionData.lastAccessed = Date.now();
    const sessionEntries = sessionData.entries;
    const entries = this.sortEntries([...sessionEntries.values()]);
    for (const entry of entries) {
      if (entry.oneShot) {
        sessionEntries.delete(entry.id);
      }
    }

    if (sessionEntries.size === 0) {
      this.sessions.delete(sessionKey);
    }

    return entries;
  }

  collectAsString(sessionKey: string, separator = '\n\n'): string {
    const entries = this.collect(sessionKey);
    return entries.map((entry) => entry.content).join(separator);
  }

  clear(sessionKey: string): void {
    this.sessions.delete(sessionKey);
  }

  clearAll(): void {
    this.sessions.clear();
  }

  getEntries(sessionKey: string): ContextEntry[] {
    const sessionData = this.sessions.get(sessionKey);
    if (!sessionData) {
      return [];
    }

    return this.sortEntries([...sessionData.entries.values()]);
  }

  hasEntries(sessionKey: string): boolean {
    const sessionData = this.sessions.get(sessionKey);
    return Boolean(sessionData && sessionData.entries.size > 0);
  }

  private getOrCreateSession(sessionKey: string): Map<string, ContextEntry> {
    let sessionData = this.sessions.get(sessionKey);
    if (!sessionData) {
      sessionData = {
        entries: new Map(),
        lastAccessed: Date.now(),
      };
      this.sessions.set(sessionKey, sessionData);
    } else {
      sessionData.lastAccessed = Date.now();
    }
    return sessionData.entries;
  }

  private pruneExpiredSessions(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, sessionData] of this.sessions.entries()) {
      if (now - sessionData.lastAccessed > SESSION_TTL_MS) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.sessions.delete(key);
    }
  }

  private sortEntries(entries: ContextEntry[]): ContextEntry[] {
    return entries.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.id.localeCompare(b.id);
    });
  }
}

export const contextCollector = new ContextCollector();
