import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('# Mock Persona Content\nYou are Atlas.'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs', async () => {
  const fsp = await vi.importMock<typeof import('fs/promises')>('fs/promises');
  return {
    readFileSync: vi.fn().mockReturnValue('# Mock Persona Content\nYou are Atlas.'),
    statSync: vi.fn().mockReturnValue({ mtimeMs: 1000 }),
    promises: fsp,
  };
});

vi.mock('../utils/config.js', () => ({
  getConfig: vi.fn(() => ({
    todo_enforcer_enabled: true,
    todo_enforcer_cooldown_ms: 2000,
    todo_enforcer_max_failures: 5,
    comment_checker_enabled: true,
  })),
}));

import { readFileSync, statSync, promises as fsPromises } from 'fs';
import {
  setActivePersona,
  getActivePersona,
  resetPersonaState,
  replaceAgentsMd,
  restoreAgentsMdToDefault,
} from '../utils/persona-state.js';
import {
  resolvePersonaId,
  readPersonaPrompt,
  readPersonaPromptSync,
  listPersonas,
  DEFAULT_PERSONA_ID,
  clearPersonaCache,
} from '../agents/persona-prompts.js';
import { registerPersonaCommands } from '../commands/persona-commands.js';
import { registerPersonaInjector } from '../hooks/persona-injector.js';
import { createMockApi } from './helpers/mock-factory.js';

describe('persona-state', () => {
  beforeEach(async () => {
    await resetPersonaState();
  });

  it('starts with null active persona', async () => {
    expect(await getActivePersona()).toBeNull();
  });

  it('sets and gets active persona', async () => {
    await setActivePersona('omoc_atlas');
    expect(await getActivePersona()).toBe('omoc_atlas');
  });

  it('resets persona to null', async () => {
    await setActivePersona('omoc_prometheus');
    await resetPersonaState();
    expect(await getActivePersona()).toBeNull();
  });

  it('can overwrite active persona', async () => {
    await setActivePersona('omoc_atlas');
    await setActivePersona('omoc_oracle');
    expect(await getActivePersona()).toBe('omoc_oracle');
  });
});

describe('persona-prompts', () => {
  describe('resolvePersonaId', () => {
    it('resolves full ID', () => {
      expect(resolvePersonaId('omoc_atlas')).toBe('omoc_atlas');
    });

    it('resolves short name', () => {
      expect(resolvePersonaId('atlas')).toBe('omoc_atlas');
      expect(resolvePersonaId('prometheus')).toBe('omoc_prometheus');
      expect(resolvePersonaId('sisyphus')).toBe('omoc_sisyphus');
    });

    it('resolves display name (case-insensitive)', () => {
      expect(resolvePersonaId('Atlas')).toBe('omoc_atlas');
      expect(resolvePersonaId('Sisyphus-Junior')).toBe('omoc_sisyphus');
      expect(resolvePersonaId('Multimodal Looker')).toBe('omoc_looker');
    });

    it('returns null for unknown names', () => {
      expect(resolvePersonaId('nonexistent')).toBeNull();
      expect(resolvePersonaId('')).toBeNull();
    });

    it('is case-insensitive for all formats', () => {
      expect(resolvePersonaId('OMOC_ATLAS')).toBe('omoc_atlas');
      expect(resolvePersonaId('ORACLE')).toBe('omoc_oracle');
    });
  });

  describe('readPersonaPrompt', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      clearPersonaCache();
    });

    it('reads persona markdown for valid agent ID', async () => {
      const content = await readPersonaPrompt('omoc_atlas');
      expect(content).toContain('Mock Persona Content');
      expect(fsPromises.readFile).toHaveBeenCalledWith(
        expect.stringContaining('atlas.md'),
        'utf-8'
      );
    });

    it('returns error message for unknown agent ID', async () => {
      const content = await readPersonaPrompt('omoc_unknown');
      expect(content).toContain('Unknown persona');
    });

    it('returns graceful fallback when file is missing', async () => {
      vi.mocked(fsPromises.readFile).mockRejectedValueOnce(new Error('ENOENT'));
      const content = await readPersonaPrompt('omoc_atlas');
      expect(content).toContain('Could not read persona file');
    });
  });

  describe('readPersonaPromptSync caching', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      clearPersonaCache();
      vi.mocked(statSync).mockReturnValue({ mtimeMs: 1000 } as any);
      vi.mocked(readFileSync).mockReturnValue('# Mock Persona Content\nYou are Atlas.');
    });

    it('reads from disk on first call', () => {
      readPersonaPromptSync('omoc_atlas');
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(statSync).toHaveBeenCalledTimes(1);
    });

    it('returns cached content on second call with same mtime', () => {
      readPersonaPromptSync('omoc_atlas');
      vi.mocked(readFileSync).mockClear();

      const result = readPersonaPromptSync('omoc_atlas');
      expect(readFileSync).not.toHaveBeenCalled();
      expect(result).toContain('Mock Persona Content');
    });

    it('invalidates cache when mtime changes', () => {
      readPersonaPromptSync('omoc_atlas');
      vi.mocked(readFileSync).mockClear();
      vi.mocked(statSync).mockReturnValue({ mtimeMs: 2000 } as any);
      vi.mocked(readFileSync).mockReturnValue('# Updated Content');

      const result = readPersonaPromptSync('omoc_atlas');
      expect(readFileSync).toHaveBeenCalledTimes(1);
      expect(result).toBe('# Updated Content');
    });

    it('clearPersonaCache forces re-read on next call', () => {
      readPersonaPromptSync('omoc_atlas');
      clearPersonaCache();
      vi.mocked(readFileSync).mockClear();

      readPersonaPromptSync('omoc_atlas');
      expect(readFileSync).toHaveBeenCalledTimes(1);
    });

    it('clears cache entry on error', () => {
      readPersonaPromptSync('omoc_atlas');
      vi.mocked(statSync).mockImplementation(() => { throw new Error('ENOENT'); });

      const result = readPersonaPromptSync('omoc_atlas');
      expect(result).toContain('Could not read persona file');
    });
  });

  describe('listPersonas', () => {
    it('returns all 11 personas', () => {
      const personas = listPersonas();
      expect(personas).toHaveLength(11);
    });

    it('each persona has required fields', () => {
      const personas = listPersonas();
      for (const p of personas) {
        expect(p.id).toBeTruthy();
        expect(p.shortName).toBeTruthy();
        expect(p.displayName).toBeTruthy();
        expect(typeof p.emoji).toBe('string');
        expect(typeof p.theme).toBe('string');
      }
    });

    it('shortName strips omoc_ prefix', () => {
      const personas = listPersonas();
      const atlas = personas.find((p) => p.id === 'omoc_atlas');
      expect(atlas?.shortName).toBe('atlas');
    });
  });

  describe('DEFAULT_PERSONA_ID', () => {
    it('is omoc_atlas', () => {
      expect(DEFAULT_PERSONA_ID).toBe('omoc_atlas');
    });
  });
});

describe('AGENTS.md manager (replaceAgentsMd / restoreAgentsMdToDefault)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaceAgentsMd writes persona content to AGENTS.md', async () => {
    await replaceAgentsMd('# Persona Content');

    expect(fsPromises.mkdir).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('AGENTS.md'),
      expect.stringMatching(/# AGENTS\.md - Your Workspace[\s\S]*---\n\n# Persona Content/),
      'utf-8',
    );
  });

  it('restoreAgentsMdToDefault writes default template to AGENTS.md', async () => {
    await restoreAgentsMdToDefault();

    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('AGENTS.md'),
      expect.stringContaining('# AGENTS.md - Your Workspace'),
      'utf-8',
    );
  });

  it('restoreAgentsMdToDefault includes essential sections', async () => {
    await restoreAgentsMdToDefault();

    const writeCall = vi.mocked(fsPromises.writeFile).mock.calls.find(
      (c) => String(c[0]).includes('AGENTS.md'),
    );
    expect(writeCall).toBeDefined();
    const content = writeCall![1] as string;
    expect(content).toContain('## Every Session');
    expect(content).toContain('## Memory');
    expect(content).toContain('## Safety');
  });
});

describe('persona-commands (/omoc)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetPersonaState();
  });

  it('registers the /omoc command', () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    expect(api.registerCommand).toHaveBeenCalledTimes(1);
    expect(api.registerCommand.mock.calls[0][0].name).toBe('omoc');
    expect(api.registerCommand.mock.calls[0][0].acceptsArgs).toBe(true);
  });

  it('/omoc (no args) activates default persona and writes AGENTS.md', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: '' });

    expect(await getActivePersona()).toBe('omoc_atlas');
    expect(result.text).toContain('OmOC Mode: ON');
    expect(result.text).toContain('Atlas');
    expect(result.text).toContain('AGENTS.md replaced');
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('AGENTS.md'),
      expect.stringContaining('Mock Persona Content'),
      'utf-8',
    );
  });

  it('/omoc off deactivates persona and restores AGENTS.md to default', async () => {
    await setActivePersona('omoc_atlas');
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'off' });

    expect(await getActivePersona()).toBeNull();
    expect(result.text).toContain('OmOC Mode: OFF');
    expect(result.text).toContain('Atlas');
    expect(result.text).toContain('restored to default');
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('AGENTS.md'),
      expect.stringContaining('# AGENTS.md - Your Workspace'),
      'utf-8',
    );
  });

  it('/omoc off when no persona active', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'off' });

    expect(result.text).toContain('No persona was active');
  });

  it('/omoc list shows all 11 personas', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'list' });

    expect(result.text).toContain('OmOC Personas');
    expect(result.text).toContain('atlas');
    expect(result.text).toContain('prometheus');
    expect(result.text).toContain('oracle');
    expect(result.text).toContain('Command');
    expect(result.text).toContain('Role');
  });

  it('/omoc list marks active persona', async () => {
    await setActivePersona('omoc_oracle');
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'list' });

    expect(result.text).toContain('← active');
    expect(result.text).toContain('Oracle');
  });

  it('/omoc <name> switches persona by short name', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'prometheus' });

    expect(await getActivePersona()).toBe('omoc_prometheus');
    expect(result.text).toContain('Persona Switched');
    expect(result.text).toContain('Prometheus');
  });

  it('/omoc <unknown> shows error with available list', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'nonexistent' });

    expect(await getActivePersona()).toBeNull();
    expect(result.text).toContain('Unknown Persona');
    expect(result.text).toContain('atlas');
    expect(result.text).toContain('prometheus');
  });

  it('/omoc handles undefined args gracefully', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({});

    expect(await getActivePersona()).toBe('omoc_atlas');
    expect(result.text).toContain('OmOC Mode: ON');
  });
});

describe('persona-injector (sub-agent before_prompt_build)', () => {
  let hookHandler: (event: { systemPrompt?: string }, ctx: { agentId?: string; sessionKey?: string }) => Promise<{ systemPrompt?: string; prependContext?: string } | void>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPersonaCache();
    vi.mocked(readFileSync).mockReturnValue('# Mock Persona Content\nYou are Atlas.');
    vi.mocked(statSync).mockReturnValue({ mtimeMs: Date.now() } as ReturnType<typeof statSync>);
    const api = createMockApi();
    registerPersonaInjector(api);
    hookHandler = (api.on as ReturnType<typeof vi.fn>).mock.calls[0][1];
  });

  it('skips main session (no :subagent: in sessionKey)', async () => {
    const result = await hookHandler(
      { systemPrompt: 'base prompt' },
      { agentId: 'atlas', sessionKey: 'agent:main:main' },
    );
    expect(result).toBeUndefined();
  });

  it('injects persona for sub-agent session with known agentId', async () => {
    const result = await hookHandler(
      { systemPrompt: 'base prompt' },
      { agentId: 'explore', sessionKey: 'agent:main:subagent:abc-123' },
    );
    expect(result).toBeDefined();
    expect(result!.systemPrompt).toContain('base prompt');
    expect(result!.systemPrompt).toContain('Mock Persona Content');
  });

  it('skips sub-agent with unknown agentId', async () => {
    const result = await hookHandler(
      { systemPrompt: 'base prompt' },
      { agentId: 'nonexistent-agent', sessionKey: 'agent:main:subagent:abc-123' },
    );
    expect(result).toBeUndefined();
  });

  it('falls back to prependContext when no systemPrompt in event', async () => {
    const result = await hookHandler(
      {},
      { agentId: 'oracle', sessionKey: 'agent:main:subagent:abc-123' },
    );
    expect(result).toBeDefined();
    expect(result!.prependContext).toContain('Mock Persona Content');
    expect(result!.systemPrompt).toBeUndefined();
  });

  it('skips when no agentId provided', async () => {
    const result = await hookHandler(
      { systemPrompt: 'base prompt' },
      { sessionKey: 'agent:main:subagent:abc-123' },
    );
    expect(result).toBeUndefined();
  });
});
