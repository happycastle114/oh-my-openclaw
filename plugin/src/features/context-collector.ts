export type ContextPriority = 'critical' | 'high' | 'normal' | 'low';
export type ContextSourceType = 'persona' | 'todo-enforcer' | 'system' | 'plugin';

export interface ContextEntry {
  id: string;
  content: string;
  priority: ContextPriority;
  source: ContextSourceType;
  oneShot?: boolean;
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

export class ContextCollector {
  private sessions: Map<string, Map<string, ContextEntry>> = new Map();

  register(sessionKey: string, options: RegisterContextOptions): void {
    const sessionEntries = this.getOrCreateSession(sessionKey);
    const entry: ContextEntry = {
      id: options.id,
      content: options.content,
      priority: options.priority ?? 'normal',
      source: options.source ?? 'plugin',
      oneShot: options.oneShot ?? false,
    };
    sessionEntries.set(options.id, entry);
  }

  unregister(sessionKey: string, entryId: string): void {
    const sessionEntries = this.sessions.get(sessionKey);
    if (!sessionEntries) {
      return;
    }

    sessionEntries.delete(entryId);
    if (sessionEntries.size === 0) {
      this.sessions.delete(sessionKey);
    }
  }

  collect(sessionKey: string): ContextEntry[] {
    const sessionEntries = this.sessions.get(sessionKey);
    if (!sessionEntries) {
      return [];
    }

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
    const sessionEntries = this.sessions.get(sessionKey);
    if (!sessionEntries) {
      return [];
    }

    return this.sortEntries([...sessionEntries.values()]);
  }

  hasEntries(sessionKey: string): boolean {
    const sessionEntries = this.sessions.get(sessionKey);
    return Boolean(sessionEntries && sessionEntries.size > 0);
  }

  private getOrCreateSession(sessionKey: string): Map<string, ContextEntry> {
    let sessionEntries = this.sessions.get(sessionKey);
    if (!sessionEntries) {
      sessionEntries = new Map();
      this.sessions.set(sessionKey, sessionEntries);
    }
    return sessionEntries;
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
