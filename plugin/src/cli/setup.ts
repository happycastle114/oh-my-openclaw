import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline';
import JSON5 from 'json5';
import { OMOC_AGENT_CONFIGS, type OmocAgentConfig } from '../agents/agent-configs.js';
import {
  PROVIDER_PRESETS,
  PROVIDER_LABELS,
  AGENT_TIER_MAP,
  MODEL_TIERS,
  applyProviderPreset,
  getProviderNames,
  buildCustomPreset,
  registerCustomPreset,
  type ModelTier,
} from './model-presets.js';

type AgentsSection = {
  defaults?: Record<string, unknown>;
  list?: Array<{ id: string; [key: string]: unknown }>;
};

type ConfigShape = {
  agents?: AgentsSection;
  [key: string]: unknown;
};

type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

const CONFIG_FILENAMES = [
  'openclaw.json5',
  'openclaw.json',
  'openclaw.yaml',
  'openclaw.yml',
] as const;

export function findConfigPath(workspaceDir?: string): string | undefined {
  const searchDirs: string[] = [];

  if (workspaceDir) {
    searchDirs.push(workspaceDir);
    const parent = path.dirname(workspaceDir);
    if (parent !== workspaceDir) {
      searchDirs.push(parent);
    }
  }

  searchDirs.push(process.cwd());

  const homeDir = process.env['HOME'] ?? process.env['USERPROFILE'];
  if (homeDir) {
    searchDirs.push(path.join(homeDir, '.openclaw'));
  }

  for (const dir of searchDirs) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

/**
 * Parse OpenClaw config using JSON5 (matches OpenClaw's own parser).
 * Handles comments, trailing commas, unquoted keys, multi-line strings, etc.
 */
export function parseConfig(raw: string): ConfigShape {
  return JSON5.parse(raw) as ConfigShape;
}

export function serializeConfig(config: ConfigShape): string {
  return JSON.stringify(config, null, 2) + '\n';
}

export interface MergeResult {
  added: string[];
  skipped: string[];
  updated: string[];
}

export function mergeAgentConfigs(
  existing: Array<{ id: string; [key: string]: unknown }>,
  incoming: OmocAgentConfig[],
  force: boolean,
): { merged: Array<{ id: string; [key: string]: unknown }>; result: MergeResult } {
  const result: MergeResult = { added: [], skipped: [], updated: [] };
  const merged = [...existing];
  const existingIds = new Set(existing.map((a) => a.id));

  for (const agent of incoming) {
    if (existingIds.has(agent.id)) {
      if (force) {
        const idx = merged.findIndex((a) => a.id === agent.id);
        if (idx !== -1) {
          merged[idx] = agent as unknown as { id: string; [key: string]: unknown };
          result.updated.push(agent.id);
        }
      } else {
        result.skipped.push(agent.id);
      }
    } else {
      merged.push(agent as unknown as { id: string; [key: string]: unknown });
      result.added.push(agent.id);
    }
  }

  return { merged, result };
}

export function applyProviderToConfigs(
  configs: OmocAgentConfig[],
  provider: string,
): OmocAgentConfig[] {
  return configs.map((agent) => {
    const modelOverride = applyProviderPreset(agent.id, provider);
    if (!modelOverride) return agent;

    return {
      ...agent,
      model: modelOverride.fallbacks
        ? { primary: modelOverride.primary, fallbacks: modelOverride.fallbacks }
        : modelOverride.primary,
    };
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

const TIER_LABELS: Record<ModelTier, string> = {
  planning: 'Planning/Architecture',
  worker: 'Implementation Workers',
  orchestrator: 'Task Orchestrator',
  lightweight: 'Search/Research',
  visual: 'Visual/Frontend',
};

function printPreview(logger: Logger, provider: string): void {
  const preset = PROVIDER_PRESETS[provider]!;
  for (const [tier, label] of Object.entries(TIER_LABELS)) {
    const config = preset[tier as ModelTier];
    const agents = Object.entries(AGENT_TIER_MAP)
      .filter(([, t]) => t === tier)
      .map(([id]) => id.replace('omoc_', ''))
      .join(', ');
    logger.info(`  ${label} (${agents}):`);
    logger.info(`    → ${config.primary}`);
    if (config.fallbacks.length > 0) {
      logger.info(`      fallback: ${config.fallbacks.join(', ')}`);
    }
  }
}

async function runCustomProviderFlow(
  rl: readline.Interface,
  logger: Logger,
): Promise<string> {
  logger.info('');
  logger.info('  Enter model IDs for each tier.');
  logger.info('  Format: provider/model (e.g., cliproxy/claude-opus-4-6, z.ai/gpt-5.3-codex)');
  logger.info('');

  const tierModels = {} as Record<ModelTier, string>;

  for (const tier of MODEL_TIERS) {
    const label = TIER_LABELS[tier];
    const agents = Object.entries(AGENT_TIER_MAP)
      .filter(([, t]) => t === tier)
      .map(([id]) => id.replace('omoc_', ''))
      .join(', ');

    let model = '';
    while (!model) {
      model = await askQuestion(rl, `  ${label} (${agents}): `);
      if (!model) {
        logger.info('    Model ID required.');
      }
    }
    tierModels[tier] = model;
  }

  const customPreset = buildCustomPreset(tierModels);
  const customName = '_custom_' + Date.now();
  registerCustomPreset(customName, customPreset);
  return customName;
}

export async function runInteractiveSetup(logger: Logger): Promise<{ provider: string }> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    logger.info('');
    logger.info('🗺️  Oh-My-OpenClaw Agent Setup');
    logger.info('─'.repeat(40));
    logger.info('');

    const presetProviders = getProviderNames();
    const choices = [...presetProviders, 'custom'];
    const choiceCount = choices.length;

    logger.info('Step 1/2: Select your AI provider');
    logger.info('');
    choices.forEach((p, i) => {
      logger.info(`  ${i + 1}. ${PROVIDER_LABELS[p] ?? p}`);
    });
    logger.info('');

    let provider = '';
    while (!provider) {
      const answer = await askQuestion(rl, `  Select (1-${choiceCount}): `);
      const idx = parseInt(answer, 10) - 1;
      if (idx >= 0 && idx < choiceCount) {
        provider = choices[idx]!;
      } else if (choices.includes(answer.toLowerCase())) {
        provider = answer.toLowerCase();
      } else {
        logger.info(`  Invalid choice. Enter 1-${choiceCount}.`);
      }
    }

    if (provider === 'custom') {
      provider = await runCustomProviderFlow(rl, logger);
    }

    logger.info('');
    logger.info(`  ✓ Selected: ${PROVIDER_LABELS[provider] ?? 'Custom'}`);
    logger.info('');

    logger.info('Step 2/2: Model configuration preview');
    logger.info('');
    printPreview(logger, provider);
    logger.info('');

    const confirm = await askQuestion(rl, '  Apply this configuration? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      logger.info('  Setup cancelled.');
      return { provider: '' };
    }

    logger.info('');
    return { provider };
  } finally {
    rl.close();
  }
}

export interface SetupOptions {
  configPath?: string;
  workspaceDir?: string;
  force?: boolean;
  dryRun?: boolean;
  provider?: string;
  interactive?: boolean;
  logger: Logger;
}

export function runSetup(options: SetupOptions): MergeResult {
  const { logger, force = false, dryRun = false, provider } = options;

  const configPath = options.configPath ?? findConfigPath(options.workspaceDir);
  if (!configPath) {
    throw new Error(
      'Could not find OpenClaw config file. Searched for: ' +
        CONFIG_FILENAMES.join(', ') +
        '\nSpecify the path with --config <path>',
    );
  }

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  logger.info(`Found config: ${configPath}`);

  const raw = fs.readFileSync(configPath, 'utf-8');

  if (configPath.endsWith('.yaml') || configPath.endsWith('.yml')) {
    throw new Error(
      'YAML config files are not supported by omoc-setup. ' +
        'Please convert to JSON or JSON5, or manually add agent configs.',
    );
  }

  const config = parseConfig(raw);

  if (!config.agents) {
    config.agents = {};
  }
  if (!config.agents.list) {
    config.agents.list = [];
  }

  const agentConfigs = provider
    ? applyProviderToConfigs(OMOC_AGENT_CONFIGS, provider)
    : OMOC_AGENT_CONFIGS;

  if (provider) {
    logger.info(`Using provider preset: ${PROVIDER_LABELS[provider] ?? provider}`);
  }

  const { merged, result } = mergeAgentConfigs(config.agents.list, agentConfigs, force);
  config.agents.list = merged;

  if (dryRun) {
    logger.info('[dry-run] Would write config to: ' + configPath);
  } else {
    const backupPath = configPath + '.bak';
    fs.copyFileSync(configPath, backupPath);
    logger.info(`Backup created: ${backupPath}`);

    fs.writeFileSync(configPath, serializeConfig(config), 'utf-8');
    logger.info(`Config updated: ${configPath}`);
  }

  if (result.added.length > 0) {
    logger.info(`Added ${result.added.length} agent(s): ${result.added.join(', ')}`);
  }
  if (result.updated.length > 0) {
    logger.info(`Updated ${result.updated.length} agent(s): ${result.updated.join(', ')}`);
  }
  if (result.skipped.length > 0) {
    logger.info(`Skipped ${result.skipped.length} existing agent(s): ${result.skipped.join(', ')}`);
  }
  if (result.added.length === 0 && result.updated.length === 0) {
    logger.info('No changes needed — all OmOC agents already present.');
  }

  return result;
}

export function registerSetupCli(ctx: {
  program: { command: (name: string) => CommandBuilder };
  workspaceDir?: string;
  logger: Logger;
}): void {
  ctx.program
    .command('omoc-setup')
    .description('Inject OmOC agent definitions into your OpenClaw config')
    .option('--force', 'Overwrite existing OmOC agent configs', false)
    .option('--dry-run', 'Preview changes without writing', false)
    .option('--config <path>', 'Path to OpenClaw config file')
    .option('--provider <name>', 'AI provider preset: anthropic, openai, google (skips interactive)')
    .action(async (...args: unknown[]) => {
      const opts = (args[0] ?? {}) as {
        force?: boolean;
        dryRun?: boolean;
        config?: string;
        provider?: string;
      };
      try {
        let provider = opts.provider;

        if (provider && !PROVIDER_PRESETS[provider]) {
          const valid = getProviderNames().join(', ');
          throw new Error(`Unknown provider "${provider}". Valid: ${valid}`);
        }

        if (!provider && process.stdin.isTTY) {
          const result = await runInteractiveSetup(ctx.logger);
          if (!result.provider) return;
          provider = result.provider;
        }

        runSetup({
          configPath: opts.config,
          workspaceDir: ctx.workspaceDir,
          force: provider ? true : opts.force,
          dryRun: opts.dryRun,
          provider,
          logger: ctx.logger,
        });

        ctx.logger.info('');
        ctx.logger.info('✓ Setup complete! Restart OpenClaw to apply changes.');
      } catch (err) {
        ctx.logger.error(
          `Setup failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}

type CommandBuilder = {
  description: (desc: string) => CommandBuilder;
  option: (flags: string, desc: string, defaultValue?: unknown) => CommandBuilder;
  action: (fn: (...args: unknown[]) => void) => CommandBuilder;
};
