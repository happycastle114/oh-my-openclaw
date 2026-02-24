import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('# Mock Persona Content\nYou are Atlas.'),
  statSync: vi.fn().mockReturnValue({ mtimeMs: 1000 }),
  promises: {
    readFile: vi.fn().mockResolvedValue('# Mock Persona Content\nYou are Atlas.'),
  },
}));

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
} from '../utils/persona-state.js';
import {
  resolvePersonaId,
  readPersonaPrompt,
  readPersonaPromptSync,
  listPersonas,
  DEFAULT_PERSONA_ID,
  clearPersonaCache,
} from '../agents/persona-prompts.js';
import { registerPersonaInjector } from '../hooks/persona-injector.js';
import { registerPersonaCommands } from '../commands/persona-commands.js';

function createMockApi(): any {
  return {
    config: {},
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    registerHook: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
    registerService: vi.fn(),
    registerGatewayMethod: vi.fn(),
    registerCli: vi.fn(),
    on: vi.fn(),
  };
}

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

describe('persona-injector hook (before_prompt_build)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    clearPersonaCache();
    await resetPersonaState();
    vi.mocked(statSync).mockReturnValue({ mtimeMs: 1000 } as any);
    vi.mocked(readFileSync).mockReturnValue('# Mock Persona Content\nYou are Atlas.');
  });

  it('registers before_prompt_build typed hook via api.on()', () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    expect(api.on).toHaveBeenCalledTimes(1);
    expect(api.on.mock.calls[0][0]).toBe('before_prompt_build');
    expect(api.on.mock.calls[0][2]).toEqual({ priority: 100 });
    expect(api.registerHook).not.toHaveBeenCalled();
  });

  it('does not inject when no persona is active and no agentId', async () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = {};
    const result = await handler(event, ctx);

    expect(result).toBeUndefined();
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('no persona resolved')
    );
  });

  it('does not inject when agentId is not an omoc agent', async () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'some_other_agent' };
    const result = await handler(event, ctx);

    expect(result).toBeUndefined();
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('no persona resolved')
    );
  });

  it('injects persona prompt when persona is manually active', async () => {
    await setActivePersona('omoc_atlas');
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = {};
    const result = await handler(event, ctx);

    expect(result).toBeDefined();
    expect(result.prependContext).toContain('Mock Persona Content');
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('manual')
    );
  });

  it('auto-injects persona from ctx.agentId', async () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'omoc_atlas' };
    const result = await handler(event, ctx);

    expect(result).toBeDefined();
    expect(result.prependContext).toContain('Mock Persona Content');
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('auto')
    );
  });

  it('auto-injects for all known omoc agents', async () => {
    const knownAgentIds = [
      'omoc_prometheus', 'omoc_sisyphus', 'omoc_hephaestus',
      'omoc_oracle', 'omoc_explore', 'omoc_librarian',
      'omoc_metis', 'omoc_momus', 'omoc_looker', 'omoc_frontend',
    ];

    for (const agentId of knownAgentIds) {
      vi.clearAllMocks();
      clearPersonaCache();
      await resetPersonaState();
      vi.mocked(statSync).mockReturnValue({ mtimeMs: 1000 } as any);
      vi.mocked(readFileSync).mockReturnValue(`# ${agentId} Content`);

      const api = createMockApi();
      registerPersonaInjector(api);

      const handler = api.on.mock.calls[0][1];
      const event = { prompt: 'hello' };
      const ctx = { agentId };
      const result = await handler(event, ctx);

      expect(result).toBeDefined();
      expect(result.prependContext).toContain(`${agentId} Content`);
    }
  });

  it('manual persona takes priority over agentId', async () => {
    await setActivePersona('omoc_oracle');
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'omoc_atlas' };
    const result = await handler(event, ctx);

    expect(result).toBeDefined();
    expect(result.prependContext).toContain('Mock Persona Content');
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('manual')
    );
  });

  it('returns prependContext (not bootstrapFiles)', async () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    const event = { prompt: 'hello' };
    const ctx = { agentId: 'omoc_atlas' };
    const result = await handler(event, ctx);

    expect(result).toHaveProperty('prependContext');
    expect(result).not.toHaveProperty('bootstrapFiles');
    expect(result).not.toHaveProperty('systemPrompt');
  });

  it('logs with source=auto for agentId detection', async () => {
    const api = createMockApi();
    registerPersonaInjector(api);

    const handler = api.on.mock.calls[0][1];
    await handler({ prompt: 'hello' }, { agentId: 'omoc_prometheus' });

    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('before_prompt_build')
    );
    expect(api.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('auto')
    );
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

  it('/omoc (no args) activates default persona', async () => {
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: '' });

    expect(await getActivePersona()).toBe('omoc_atlas');
    expect(result.text).toContain('OmOC Mode: ON');
    expect(result.text).toContain('Atlas');
  });

  it('/omoc off deactivates persona', async () => {
    await setActivePersona('omoc_atlas');
    const api = createMockApi();
    registerPersonaCommands(api);

    const handler = api.registerCommand.mock.calls[0][0].handler;
    const result = await handler({ args: 'off' });

    expect(await getActivePersona()).toBeNull();
    expect(result.text).toContain('OmOC Mode: OFF');
    expect(result.text).toContain('Atlas');
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
