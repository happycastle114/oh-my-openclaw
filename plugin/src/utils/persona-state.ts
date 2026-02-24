import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

let activePersonaId: string | null = null;
let loaded = false;
let stateFilePath = join('workspace', '.omoc-state', 'active-persona');

export function initPersonaState(filePath?: string): void {
  if (filePath) stateFilePath = filePath;
  loadFromDisk();
}

export function setActivePersona(id: string | null): void {
  activePersonaId = id;
  loaded = true;
  saveToDisk();
}

export function getActivePersona(): string | null {
  if (!loaded) loadFromDisk();
  return activePersonaId;
}

export function resetPersonaState(): void {
  activePersonaId = null;
  loaded = true;
  saveToDisk();
}

export function resetPersonaStateForTesting(): void {
  activePersonaId = null;
  loaded = true;
}

function loadFromDisk(): void {
  try {
    const content = readFileSync(stateFilePath, 'utf-8').trim();
    activePersonaId = content || null;
  } catch {
    activePersonaId = null;
  }
  loaded = true;
}

function saveToDisk(): void {
  try {
    mkdirSync(dirname(stateFilePath), { recursive: true });
    writeFileSync(stateFilePath, activePersonaId ?? '', 'utf-8');
  } catch {
    // silent fail — in-memory state still works
  }
}
