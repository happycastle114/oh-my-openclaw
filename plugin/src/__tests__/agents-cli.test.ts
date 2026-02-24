import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  OMOC_AGENT_CONFIGS,
  type OmocAgentConfig,
} from '../agents/agent-configs.js';
import {
  parseConfig,
  mergeAgentConfigs,
  runSetup,
  serializeConfig,
  applyProviderToConfigs,
  type MergeResult,
} from '../cli/setup.js';
import {
  PROVIDER_PRESETS,
  AGENT_TIER_MAP,
  applyProviderPreset,
  getProviderNames,
} from '../cli/model-presets.js';

describe('Agent Configs', () => {
  describe('OMOC_AGENT_CONFIGS structure', () => {
    it('should have exactly 11 agents', () => {
      expect(OMOC_AGENT_CONFIGS).toHaveLength(11);
    });

    it('should have all agents with unique IDs', () => {
      const ids = OMOC_AGENT_CONFIGS.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all agent IDs starting with omoc_', () => {
      OMOC_AGENT_CONFIGS.forEach((agent) => {
        expect(agent.id).toMatch(/^omoc_/);
      });
    });

    it('should have all agents with id and at least one of model/tools/identity', () => {
      OMOC_AGENT_CONFIGS.forEach((agent) => {
        expect(agent.id).toBeDefined();
        const hasModel = agent.model !== undefined;
        const hasTools = agent.tools !== undefined;
        const hasIdentity = agent.identity !== undefined;
        expect(hasModel || hasTools || hasIdentity).toBe(true);
      });
    });
  });

  describe('Read-only agents (oracle, explore, librarian, metis, momus)', () => {
    const readOnlyAgentIds = [
      'omoc_oracle',
      'omoc_explore',
      'omoc_librarian',
      'omoc_metis',
      'omoc_momus',
    ];

    it('should not have subagents', () => {
      readOnlyAgentIds.forEach((id) => {
        const agent = OMOC_AGENT_CONFIGS.find((a) => a.id === id);
        expect(agent).toBeDefined();
        expect(agent?.subagents).toBeUndefined();
      });
    });

    it('should have deny arrays with write, edit, apply_patch, sessions_spawn', () => {
      readOnlyAgentIds.forEach((id) => {
        const agent = OMOC_AGENT_CONFIGS.find((a) => a.id === id);
        expect(agent?.tools?.deny).toBeDefined();
        const deny = agent?.tools?.deny ?? [];
        expect(deny).toContain('write');
        expect(deny).toContain('edit');
        expect(deny).toContain('apply_patch');
        expect(deny).toContain('sessions_spawn');
      });
    });
  });

  describe('Agents with subagents (prometheus, atlas, sisyphus, hephaestus, frontend)', () => {
    const agentsWithSubagents = [
      'omoc_prometheus',
      'omoc_atlas',
      'omoc_sisyphus',
      'omoc_hephaestus',
      'omoc_frontend',
    ];

    it('should have subagents defined', () => {
      agentsWithSubagents.forEach((id) => {
        const agent = OMOC_AGENT_CONFIGS.find((a) => a.id === id);
        expect(agent?.subagents).toBeDefined();
      });
    });

    it('prometheus and atlas should have allowAgents: ["*"]', () => {
      ['omoc_prometheus', 'omoc_atlas'].forEach((id) => {
        const agent = OMOC_AGENT_CONFIGS.find((a) => a.id === id);
        expect(agent?.subagents?.allowAgents).toEqual(['*']);
      });
    });

    it('sisyphus, hephaestus, frontend should have specific allowAgents', () => {
      const sisyphus = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_sisyphus');
      expect(sisyphus?.subagents?.allowAgents).toEqual([
        'omoc_explore',
        'omoc_librarian',
        'omoc_oracle',
      ]);

      const hephaestus = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_hephaestus');
      expect(hephaestus?.subagents?.allowAgents).toEqual([
        'omoc_explore',
        'omoc_librarian',
        'omoc_oracle',
      ]);

      const frontend = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_frontend');
      expect(frontend?.subagents?.allowAgents).toEqual([
        'omoc_explore',
        'omoc_librarian',
      ]);
    });
  });

  describe('Looker agent (read-only allowlist)', () => {
    it('should not have subagents', () => {
      const looker = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_looker');
      expect(looker?.subagents).toBeUndefined();
    });

    it('should have allow array with only read', () => {
      const looker = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_looker');
      expect(looker?.tools?.allow).toEqual(['read']);
    });

    it('should have deny array with write, edit, apply_patch, sessions_spawn', () => {
      const looker = OMOC_AGENT_CONFIGS.find((a) => a.id === 'omoc_looker');
      const deny = looker?.tools?.deny ?? [];
      expect(deny).toContain('write');
      expect(deny).toContain('edit');
      expect(deny).toContain('apply_patch');
      expect(deny).toContain('sessions_spawn');
    });
  });

  describe('Agent names and identities', () => {
    it('should have all agents with name and identity', () => {
      OMOC_AGENT_CONFIGS.forEach((agent) => {
        expect(agent.name).toBeDefined();
        expect(agent.identity).toBeDefined();
        expect(agent.identity?.name).toBeDefined();
        expect(agent.identity?.emoji).toBeDefined();
        expect(agent.identity?.theme).toBeDefined();
      });
    });

    it('should have all agents with model defined', () => {
      OMOC_AGENT_CONFIGS.forEach((agent) => {
        expect(agent.model).toBeDefined();
      });
    });
  });
});

describe('parseConfig', () => {
  it('should parse valid JSON', () => {
    const json = '{"agents": {"list": []}}';
    const result = parseConfig(json);
    expect(result.agents?.list).toEqual([]);
  });

  it('should parse JSON5 with single-line comments', () => {
    const json5 = `{
      // This is a comment
      "agents": {
        "list": []
      }
    }`;
    const result = parseConfig(json5);
    expect(result.agents?.list).toEqual([]);
  });

  it('should parse JSON5 with multi-line comments', () => {
    const json5 = `{
      /* This is a
         multi-line comment */
      "agents": {
        "list": []
      }
    }`;
    const result = parseConfig(json5);
    expect(result.agents?.list).toEqual([]);
  });

  it('should parse JSON5 with trailing commas', () => {
    const json5 = `{
      "agents": {
        "list": [
          {"id": "test"},
        ],
      },
    }`;
    const result = parseConfig(json5);
    expect(result.agents?.list).toHaveLength(1);
    expect(result.agents?.list?.[0]?.id).toBe('test');
  });

  it('should throw on invalid JSON', () => {
    const invalid = '{"agents": {invalid}}';
    expect(() => parseConfig(invalid)).toThrow();
  });

  it('should handle mixed comments and trailing commas', () => {
    const json5 = `{
      // Config file
      "agents": {
        /* Agent list */
        "list": [
          {"id": "agent1"},
          {"id": "agent2"},
        ],
      },
    }`;
    const result = parseConfig(json5);
    expect(result.agents?.list).toHaveLength(2);
  });
});

describe('serializeConfig', () => {
  it('should serialize config to JSON with proper formatting', () => {
    const config = { agents: { list: [{ id: 'test' }] } };
    const serialized = serializeConfig(config);
    expect(serialized).toContain('agents');
    expect(serialized).toContain('list');
    expect(serialized).toContain('id');
    expect(serialized).toContain('test');
    expect(serialized).toMatch(/\n$/);
  });

  it('should be parseable back to original config', () => {
    const config = { agents: { list: [{ id: 'test', name: 'Test' }] } };
    const serialized = serializeConfig(config);
    const parsed = parseConfig(serialized);
    expect(parsed).toEqual(config);
  });
});

describe('mergeAgentConfigs', () => {
  it('should add all agents to empty list', () => {
    const existing: Array<{ id: string }> = [];
    const { merged, result } = mergeAgentConfigs(
      existing,
      OMOC_AGENT_CONFIGS,
      false,
    );

    expect(merged).toHaveLength(OMOC_AGENT_CONFIGS.length);
    expect(result.added).toHaveLength(OMOC_AGENT_CONFIGS.length);
    expect(result.skipped).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
  });

  it('should skip existing agents when force=false', () => {
    const existing = [{ id: 'omoc_prometheus', custom: 'value' }];
    const { merged, result } = mergeAgentConfigs(
      existing,
      OMOC_AGENT_CONFIGS,
      false,
    );

    expect(result.skipped).toContain('omoc_prometheus');
    expect(result.added).toHaveLength(OMOC_AGENT_CONFIGS.length - 1);
    const prometheus = merged.find((a) => a.id === 'omoc_prometheus');
    expect(prometheus?.custom).toBe('value');
  });

  it('should update existing agents when force=true', () => {
    const existing = [{ id: 'omoc_prometheus', custom: 'value' }];
    const { merged, result } = mergeAgentConfigs(
      existing,
      OMOC_AGENT_CONFIGS,
      true,
    );

    expect(result.updated).toContain('omoc_prometheus');
    expect(result.skipped).toHaveLength(0);
    const prometheus = merged.find((a) => a.id === 'omoc_prometheus');
    expect(prometheus?.custom).toBeUndefined();
  });

  it('should handle mixed: adds new + skips existing', () => {
    const existing = [
      { id: 'omoc_prometheus', custom: 'value' },
      { id: 'custom_agent', name: 'Custom' },
    ];
    const { merged, result } = mergeAgentConfigs(
      existing,
      OMOC_AGENT_CONFIGS,
      false,
    );

    expect(result.added).toHaveLength(OMOC_AGENT_CONFIGS.length - 1);
    expect(result.skipped).toContain('omoc_prometheus');
    expect(merged).toHaveLength(existing.length + result.added.length);
  });

  it('should preserve non-OmOC agents in the list', () => {
    const customAgent = { id: 'custom_agent', name: 'Custom Agent' };
    const existing = [customAgent];
    const { merged } = mergeAgentConfigs(existing, OMOC_AGENT_CONFIGS, false);

    const found = merged.find((a) => a.id === 'custom_agent');
    expect(found).toEqual(customAgent);
  });

  it('should maintain order: existing first, then new', () => {
    const existing = [{ id: 'custom_agent' }];
    const { merged } = mergeAgentConfigs(existing, OMOC_AGENT_CONFIGS, false);

    expect(merged[0]?.id).toBe('custom_agent');
    expect(merged.slice(1).every((a) => a.id.startsWith('omoc_'))).toBe(true);
  });
});

describe('runSetup', () => {
  function createTempConfig(content: string): {
    dir: string;
    configPath: string;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omoc-test-'));
    const configPath = path.join(dir, 'openclaw.json');
    fs.writeFileSync(configPath, content, 'utf-8');
    return { dir, configPath };
  }

  afterEach(() => {});

  it('should create backup file before writing', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger });

      const backupPath = configPath + '.bak';
      expect(fs.existsSync(backupPath)).toBe(true);
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      expect(backupContent).toBe('{"agents": {"list": []}}');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should write merged config', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger });

      const content = fs.readFileSync(configPath, 'utf-8');
      const parsed = parseConfig(content);
      expect(parsed.agents?.list).toBeDefined();
      expect(
        (parsed.agents?.list as Array<{ id: string }>).some((a) =>
          a.id.startsWith('omoc_'),
        ),
      ).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should not write on dry-run', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const originalContent = fs.readFileSync(configPath, 'utf-8');

      runSetup({ configPath, logger, dryRun: true });

      const currentContent = fs.readFileSync(configPath, 'utf-8');
      expect(currentContent).toBe(originalContent);
      expect(fs.existsSync(configPath + '.bak')).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should throw on missing config file', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    expect(() =>
      runSetup({
        configPath: '/nonexistent/path/openclaw.json',
        logger,
      }),
    ).toThrow('Config file not found');
  });

  it('should throw on YAML config file', () => {
    const { dir, configPath: jsonPath } = createTempConfig('agents: {}');
    const yamlPath = path.join(dir, 'openclaw.yaml');
    fs.writeFileSync(yamlPath, 'agents: {}', 'utf-8');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      expect(() => runSetup({ configPath: yamlPath, logger })).toThrow(
        'YAML config files are not supported',
      );
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should be idempotent: running twice does not duplicate agents', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

      runSetup({ configPath, logger });
      const firstRun = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const firstCount = (firstRun.agents?.list as Array<{ id: string }>)
        .length;

      runSetup({ configPath, logger });
      const secondRun = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const secondCount = (secondRun.agents?.list as Array<{ id: string }>)
        .length;

      expect(firstCount).toBe(secondCount);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should return MergeResult with added agents', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const result = runSetup({ configPath, logger });

      expect(result.added).toHaveLength(OMOC_AGENT_CONFIGS.length);
      expect(result.skipped).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should skip existing agents by default', () => {
    const { dir, configPath } = createTempConfig(
      '{"agents": {"list": [{"id": "omoc_prometheus", "custom": "value"}]}}',
    );

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const result = runSetup({ configPath, logger });

      expect(result.skipped).toContain('omoc_prometheus');
      expect(result.added).toHaveLength(OMOC_AGENT_CONFIGS.length - 1);

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const prometheus = (config.agents?.list as Array<{ id: string; custom?: string }>).find(
        (a) => a.id === 'omoc_prometheus',
      );
      expect(prometheus?.custom).toBe('value');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should update existing agents with force=true', () => {
    const { dir, configPath } = createTempConfig(
      '{"agents": {"list": [{"id": "omoc_prometheus", "custom": "value"}]}}',
    );

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const result = runSetup({ configPath, logger, force: true });

      expect(result.updated).toContain('omoc_prometheus');
      expect(result.skipped).toHaveLength(0);

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const prometheus = (config.agents?.list as Array<{ id: string; custom?: string }>).find(
        (a) => a.id === 'omoc_prometheus',
      );
      expect(prometheus?.custom).toBeUndefined();
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should create agents section if missing', () => {
    const { dir, configPath } = createTempConfig('{}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger });

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      expect(config.agents).toBeDefined();
      expect(config.agents?.list).toBeDefined();
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should preserve other config sections', () => {
    const { dir, configPath } = createTempConfig(
      '{"other": {"key": "value"}, "agents": {"list": []}}',
    );

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger });

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      expect(config.other).toEqual({ key: 'value' });
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should log info messages', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger });

      expect(logger.info).toHaveBeenCalled();
      const calls = (logger.info as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((msg: string) => msg.includes('Found config'))).toBe(
        true,
      );
      expect(calls.some((msg: string) => msg.includes('Added'))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should apply provider preset when provider is specified', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger, provider: 'anthropic' });

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const prometheus = (config.agents?.list as Array<{ id: string; model?: any }>).find(
        (a) => a.id === 'omoc_prometheus',
      );
      expect(prometheus?.model?.primary).toBe('anthropic/claude-opus-4-6');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should apply openai provider preset', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger, provider: 'openai' });

      const config = parseConfig(fs.readFileSync(configPath, 'utf-8'));
      const prometheus = (config.agents?.list as Array<{ id: string; model?: any }>).find(
        (a) => a.id === 'omoc_prometheus',
      );
      expect(prometheus?.model?.primary).toBe('openai/gpt-5.3-codex');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('should log provider preset info when provider is specified', () => {
    const { dir, configPath } = createTempConfig('{"agents": {"list": []}}');

    try {
      const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      runSetup({ configPath, logger, provider: 'google' });

      const calls = (logger.info as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((msg: string) => msg.includes('Using provider preset'))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe('model-presets', () => {
  it('should have 3 provider presets', () => {
    expect(getProviderNames()).toEqual(['anthropic', 'openai', 'google']);
  });

  it('should have all 11 agents mapped to tiers', () => {
    const mappedIds = Object.keys(AGENT_TIER_MAP);
    expect(mappedIds).toHaveLength(11);
    OMOC_AGENT_CONFIGS.forEach((agent) => {
      expect(AGENT_TIER_MAP[agent.id]).toBeDefined();
    });
  });

  it('each preset should cover all 5 tiers', () => {
    const tiers = ['planning', 'worker', 'orchestrator', 'lightweight', 'visual'];
    for (const provider of getProviderNames()) {
      const preset = PROVIDER_PRESETS[provider]!;
      tiers.forEach((tier) => {
        expect(preset[tier as keyof typeof preset]).toBeDefined();
      });
    }
  });

  it('applyProviderPreset returns model config for valid agent + provider', () => {
    const result = applyProviderPreset('omoc_prometheus', 'anthropic');
    expect(result).toBeDefined();
    expect(result?.primary).toBe('anthropic/claude-opus-4-6');
  });

  it('applyProviderPreset returns undefined for unknown agent', () => {
    expect(applyProviderPreset('unknown_agent', 'anthropic')).toBeUndefined();
  });

  it('applyProviderPreset returns undefined for unknown provider', () => {
    expect(applyProviderPreset('omoc_atlas', 'unknown')).toBeUndefined();
  });
});

describe('applyProviderToConfigs', () => {
  it('overrides all agent models with the selected provider', () => {
    const modified = applyProviderToConfigs(OMOC_AGENT_CONFIGS, 'anthropic');
    expect(modified).toHaveLength(11);

    const prometheus = modified.find((a) => a.id === 'omoc_prometheus');
    const model = prometheus?.model as { primary: string; fallbacks?: string[] };
    expect(model.primary).toBe('anthropic/claude-opus-4-6');
  });

  it('preserves non-model fields', () => {
    const modified = applyProviderToConfigs(OMOC_AGENT_CONFIGS, 'openai');
    const oracle = modified.find((a) => a.id === 'omoc_oracle');
    expect(oracle?.identity?.name).toBe('Oracle');
    expect(oracle?.tools?.deny).toContain('write');
  });

  it('lightweight agents get string model (no fallbacks)', () => {
    const modified = applyProviderToConfigs(OMOC_AGENT_CONFIGS, 'anthropic');
    const explore = modified.find((a) => a.id === 'omoc_explore');
    expect(explore?.model).toBe('anthropic/claude-sonnet-4-6');
  });
});
