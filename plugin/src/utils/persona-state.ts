import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { OmocPluginApi } from '../types.js';

let activePersonaId: string | null = null;
let loaded = false;
const stateDir = join('workspace', '.omoc-state');
let stateFilePath = join(stateDir, 'active-persona');

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
  await saveOffState();
}

async function loadFromDisk(): Promise<void> {
  try {
    const content = (await readFile(stateFilePath, 'utf-8')).trim();
    activePersonaId = (content && content !== OFF_MARKER) ? content : null;
  } catch (error: any) {
    // ENOENT is expected on first boot — no state file yet
    if (error?.code !== 'ENOENT') {
      console.warn('[omoc] Failed to load persona state from disk:', error);
    }
    activePersonaId = null;
  }
  loaded = true;
}

export const OFF_MARKER = '__OFF__';

async function saveToDisk(): Promise<void> {
  try {
    await mkdir(dirname(stateFilePath), { recursive: true });
    await writeFile(stateFilePath, activePersonaId ?? '', 'utf-8');
  } catch (error) {
    console.warn('[omoc] Failed to persist persona state to disk:', error);
  }
}

async function saveOffState(): Promise<void> {
  try {
    await mkdir(dirname(stateFilePath), { recursive: true });
    await writeFile(stateFilePath, OFF_MARKER, 'utf-8');
  } catch (error) {
    console.warn('[omoc] Failed to persist persona off-state to disk:', error);
  }
}

export function resolveAgentsMdPath(): string {
  const profile = process.env.OPENCLAW_PROFILE?.trim();
  const wsDir = (profile && profile.toLowerCase() !== 'default')
    ? join(homedir(), '.openclaw', `workspace-${profile}`)
    : join(homedir(), '.openclaw', 'workspace');
  return join(wsDir, 'AGENTS.md');
}

export async function replaceAgentsMd(personaContent: string): Promise<void> {
  const agentsPath = resolveAgentsMdPath();
  await mkdir(dirname(agentsPath), { recursive: true });
  const merged = `${DEFAULT_AGENTS_MD}\n---\n\n${personaContent}`;
  await writeFile(agentsPath, merged, 'utf-8');
}

export async function restoreAgentsMdToDefault(): Promise<void> {
  const agentsPath = resolveAgentsMdPath();
  await mkdir(dirname(agentsPath), { recursive: true });
  await writeFile(agentsPath, DEFAULT_AGENTS_MD, 'utf-8');
}

const DEFAULT_AGENTS_MD = `# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## First Run

If \`BOOTSTRAP.md\` exists, that's your birth certificate. Follow it, figure out who you are, then delete it. You won't need it again.

## Every Session

Before doing anything else:

1. Read \`SOUL.md\` — this is who you are
2. Read \`USER.md\` — this is who you're helping
3. Read \`memory/YYYY-MM-DD.md\` (today + yesterday) for recent context
4. **If in MAIN SESSION** (direct chat with your human): Also read \`MEMORY.md\`

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. These files are your continuity:

- **Daily notes:** \`memory/YYYY-MM-DD.md\` (create \`memory/\` if needed) — raw logs of what happened
- **Long-term:** \`MEMORY.md\` — your curated memories, like a human's long-term memory

Capture what matters. Decisions, context, things to remember. Skip the secrets unless asked to keep them.

## Safety

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- \`trash\` > \`rm\` (recoverable beats gone forever)
- When in doubt, ask.

## Tools

Skills provide your tools. When you need one, check its \`SKILL.md\`. Keep local notes in \`TOOLS.md\`.

## Make It Yours

This is a starting point. Add your own conventions, style, and rules as you figure out what works.
`;
