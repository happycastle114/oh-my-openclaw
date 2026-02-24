import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import type { OmocPluginApi } from '../types.js';

let activePersonaId: string | null = null;
let loaded = false;
let stateFilePath = join('workspace', '.omoc-state', 'active-persona');

export async function initPersonaState(_api: OmocPluginApi): Promise<void> {
  try {
    await mkdir(dirname(stateFilePath), { recursive: true });
  } catch (error) {
    console.warn('[omoc] Failed to initialize persona state directory:', error);
  }
  await loadFromDisk();
}

export async function setActivePersonaId(id: string | null): Promise<void> {
  activePersonaId = id;
  loaded = true;
  await saveToDisk();
}

export async function setActivePersona(id: string | null): Promise<void> {
  await setActivePersonaId(id);
}

export async function getActivePersona(): Promise<string | null> {
  if (!loaded) await loadFromDisk();
  return activePersonaId;
}

export async function resetPersonaState(): Promise<void> {
  activePersonaId = null;
  loaded = true;
  await saveToDisk();
}

async function loadFromDisk(): Promise<void> {
  try {
    const content = (await readFile(stateFilePath, 'utf-8')).trim();
    activePersonaId = content || null;
  } catch (error: any) {
    // ENOENT is expected on first boot — no state file yet
    if (error?.code !== 'ENOENT') {
      console.warn('[omoc] Failed to load persona state from disk:', error);
    }
    activePersonaId = null;
  }
  loaded = true;
}

async function saveToDisk(): Promise<void> {
  try {
    await mkdir(dirname(stateFilePath), { recursive: true });
    await writeFile(stateFilePath, activePersonaId ?? '', 'utf-8');
  } catch (error) {
    // silent fail — in-memory state still works, but log for debugging
    console.warn('[omoc] Failed to persist persona state to disk:', error);
  }
}
