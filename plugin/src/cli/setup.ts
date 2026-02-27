import crypto from 'node:crypto';
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
import { CORE_MCP_SERVERS, OPTIONAL_MCP_SERVERS, runMcporterSetup } from './mcporter-setup.js';
import { PLANNER_DENY } from '../constants.js';

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
 * Validate that parsed config has the expected shape.
 * Throws descriptive error if validation fails.
 */
function validateConfigShape(data: unknown): ConfigShape {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid config: expected object at root level');
  }

  const config = data as Record<string, unknown>;

  // If agents section exists, validate its structure
  if (config.agents !== undefined) {
    if (typeof config.agents !== 'object' || config.agents === null) {
      throw new Error('Invalid config: agents must be an object');
    }

    const agents = config.agents as Record<string, unknown>;
    if (agents.list !== undefined) {
      if (!Array.isArray(agents.list)) {
        throw new Error('Invalid config: agents.list must be an array');
      }

      // Validate each agent has an id
      for (let i = 0; i < agents.list.length; i++) {
        const agent = agents.list[i];
        if (!agent || typeof agent !== 'object') {
          throw new Error(`Invalid config: agents.list[${i}] must be an object`);
        }
        if (!('id' in agent) || typeof (agent as Record<string, unknown>).id !== 'string') {
          throw new Error(`Invalid config: agents.list[${i}] must have a string id field`);
        }
      }
    }
  }

  return config as ConfigShape;
}

/**
 * Parse OpenClaw config using JSON5 (matches OpenClaw's own parser).
 * Handles comments, trailing commas, unquoted keys, multi-line strings, etc.
 * Validates the resulting shape before returning.
 */
export function parseConfig(raw: string): ConfigShape {
  const parsed = JSON5.parse(raw);
  return validateConfigShape(parsed);
}

export function serializeConfig(config: ConfigShape): string {
  return JSON5.stringify(config, null, 2) + '\n';
}

export interface MergeResult {
  added: string[];
  skipped: string[];
  updated: string[];
  mcporterAdded?: string[];
  mcporterSkipped?: string[];
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
          merged[idx] = agent as { id: string; [key: string]: unknown };
          result.updated.push(agent.id);
        }
      } else {
        result.skipped.push(agent.id);
      }
    } else {
      merged.push(agent as { id: string; [key: string]: unknown });
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
  planner: 'Strategic Planning (prometheus)',
  orchestrator: 'Orchestration (atlas)',
  reasoning: 'Deep Reasoning (oracle)',
  analysis: 'Analysis/Review (metis, momus)',
  worker: 'Implementation (sisyphus)',
  'deep-worker': 'Deep Implementation (hephaestus)',
  search: 'Codebase Search (explore)',
  research: 'Documentation Research (librarian)',
  visual: 'Visual/Frontend (looker, frontend)',
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
    logger.info('Step 1/3: Select your AI provider');
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

export function readExistingHooksToken(configPath: string): string | undefined {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON5.parse(raw) as Record<string, unknown>;
    const hooks = config.hooks as { token?: string } | undefined;
    return hooks?.token && typeof hooks.token === 'string' ? hooks.token : undefined;
  } catch {
    return undefined;
  }
}

export function generateHooksToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface InteractiveSetupResult {
  provider: string;
  setupMcporter: boolean;
  excludeServers: string[];
  enableTodoEnforcer: boolean;
  enablePlannerGuard: boolean;
  enableWebhookBridge: boolean;
  webhookHooksToken: string;
}

export async function runInteractiveSetup(logger: Logger): Promise<InteractiveSetupResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const emptyResult: InteractiveSetupResult = {
    provider: '',
    setupMcporter: false,
    excludeServers: [],
    enableTodoEnforcer: false,
    enablePlannerGuard: false,
    enableWebhookBridge: false,
    webhookHooksToken: '',
  };

  try {
    logger.info('');
    logger.info('Oh-My-OpenClaw Agent Setup');
    logger.info('-'.repeat(40));
    logger.info('');

    // Step 1/4: Provider selection
    const presetProviders = getProviderNames();
    const choices = [...presetProviders, 'custom'];
    const choiceCount = choices.length;

    logger.info('Step 1/4: Select your AI provider');
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
    logger.info(`  Selected: ${PROVIDER_LABELS[provider] ?? 'Custom'}`);
    logger.info('');

    // Step 2/4: Model preview + confirm
    logger.info('Step 2/4: Model configuration preview');
    logger.info('');
    printPreview(logger, provider);
    logger.info('');

    const confirm = await askQuestion(rl, '  Apply this configuration? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      logger.info('  Setup cancelled.');
      return emptyResult;
    }

    // Step 3/4: MCP servers
    logger.info('');
    logger.info('Step 3/4: MCP servers');
    logger.info('');
    logger.info('  Core servers (always included):');
    for (const [name, entry] of Object.entries(CORE_MCP_SERVERS)) {
      logger.info(`    ${name}: ${entry.description}`);
    }
    logger.info('');

    logger.info('  Optional servers:');
    const excludeServers: string[] = [];
    for (const [name, entry] of Object.entries(OPTIONAL_MCP_SERVERS)) {
      const answer = await askQuestion(rl, `    Enable ${name} (${entry.description})? (Y/n): `);
      if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
        excludeServers.push(name);
      }
    }
    logger.info('');

    const setupMcporter = true;

    // Step 4/4: Plugin features
    logger.info('Step 4/4: Plugin features');
    logger.info('');

    const todoAnswer = await askQuestion(rl, '  Enable todo enforcer (forces task tracking)? (Y/n): ');
    const enableTodoEnforcer = todoAnswer.toLowerCase() !== 'n' && todoAnswer.toLowerCase() !== 'no';

    const guardAnswer = await askQuestion(rl, '  Enable planner guard (prevents prometheus from editing code)? (Y/n): ');
    const enablePlannerGuard = guardAnswer.toLowerCase() !== 'n' && guardAnswer.toLowerCase() !== 'no';

    const webhookAnswer = await askQuestion(rl, '  Enable webhook bridge (proactive agent reminders via hooks/wake)? (Y/n): ');
    const enableWebhookBridge = webhookAnswer.toLowerCase() !== 'n' && webhookAnswer.toLowerCase() !== 'no';

    let webhookHooksToken = '';
    if (enableWebhookBridge) {
      const configPath = findConfigPath();
      const existingToken = configPath ? readExistingHooksToken(configPath) : undefined;

      if (existingToken) {
        logger.info(`  Found existing hooks.token in config`);
        const reuseAnswer = await askQuestion(rl, '  Reuse existing hooks token? (Y/n): ');
        if (reuseAnswer.toLowerCase() !== 'n' && reuseAnswer.toLowerCase() !== 'no') {
          webhookHooksToken = existingToken;
        }
      }

      if (!webhookHooksToken) {
        webhookHooksToken = generateHooksToken();
        logger.info(`  Generated new hooks token`);
      }
    }

    logger.info('');
    return { provider, setupMcporter, excludeServers, enableTodoEnforcer, enablePlannerGuard, enableWebhookBridge, webhookHooksToken };
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
  setupMcporter?: boolean;
  mcporterConfigPath?: string;
  excludeServers?: string[];
  enableTodoEnforcer?: boolean;
  enablePlannerGuard?: boolean;
  enableWebhookBridge?: boolean;
  webhookHooksToken?: string;
  interactive?: boolean;
  logger: Logger;
}

export function applyPlannerGuard(
  agentList: Array<{ id: string; tools?: { deny?: string[]; [key: string]: unknown }; [key: string]: unknown }>,
): void {
  for (const agent of agentList) {
    if (agent.id === 'omoc_prometheus') {
      if (!agent.tools) {
        agent.tools = {};
      }
      const existingDeny = agent.tools.deny ?? [];
      const merged = new Set([...existingDeny, ...PLANNER_DENY]);
      agent.tools.deny = [...merged];
    }
  }
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

  if (options.enablePlannerGuard) {
    applyPlannerGuard(config.agents.list);
    if (!dryRun) {
      fs.writeFileSync(configPath, serializeConfig(config), 'utf-8');
    }
    logger.info('Planner guard enabled: prometheus restricted from code editing');
  }

  if (options.enableTodoEnforcer !== undefined) {
    const pluginSettings = ((config as Record<string, unknown>).pluginSettings ?? {}) as Record<string, Record<string, unknown>>;
    if (!pluginSettings['oh-my-openclaw']) {
      pluginSettings['oh-my-openclaw'] = {};
    }
    pluginSettings['oh-my-openclaw']['todo_enforcer_enabled'] = options.enableTodoEnforcer;
    (config as Record<string, unknown>).pluginSettings = pluginSettings;
    if (!dryRun) {
      fs.writeFileSync(configPath, serializeConfig(config), 'utf-8');
    }
    logger.info(`Todo enforcer: ${options.enableTodoEnforcer ? 'enabled' : 'disabled'}`);
  }

  if (options.enableWebhookBridge && options.webhookHooksToken) {
    const pluginSettings = ((config as Record<string, unknown>).pluginSettings ?? {}) as Record<string, Record<string, unknown>>;
    if (!pluginSettings['oh-my-openclaw']) {
      pluginSettings['oh-my-openclaw'] = {};
    }
    pluginSettings['oh-my-openclaw']['webhook_bridge_enabled'] = true;
    pluginSettings['oh-my-openclaw']['hooks_token'] = options.webhookHooksToken;
    (config as Record<string, unknown>).pluginSettings = pluginSettings;

    const hooksSection = ((config as Record<string, unknown>).hooks ?? {}) as Record<string, unknown>;
    hooksSection.enabled = true;
    if (!hooksSection.token) {
      hooksSection.token = options.webhookHooksToken;
    }
    (config as Record<string, unknown>).hooks = hooksSection;

    if (!dryRun) {
      fs.writeFileSync(configPath, serializeConfig(config), 'utf-8');
    }
    logger.info('Webhook bridge enabled with hooks token configured');
  }

  if (options.setupMcporter) {
    logger.info('');
    logger.info('Setting up mcporter MCP servers...');
    const mcpResult = runMcporterSetup({
      configPath: options.mcporterConfigPath,
      excludeServers: options.excludeServers,
      dryRun,
      logger,
    });
    result.mcporterAdded = mcpResult.added;
    result.mcporterSkipped = mcpResult.skipped;
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

        let setupMcporter = false;
        let excludeServers: string[] = [];
        let enableTodoEnforcer: boolean | undefined;
        let enablePlannerGuard: boolean | undefined;
        let enableWebhookBridge: boolean | undefined;
        let webhookHooksToken: string | undefined;

        if (!provider && process.stdin.isTTY) {
          const result = await runInteractiveSetup(ctx.logger);
          if (!result.provider) return;
          provider = result.provider;
          setupMcporter = result.setupMcporter;
          excludeServers = result.excludeServers;
          enableTodoEnforcer = result.enableTodoEnforcer;
          enablePlannerGuard = result.enablePlannerGuard;
          enableWebhookBridge = result.enableWebhookBridge;
          webhookHooksToken = result.webhookHooksToken;
        }

        runSetup({
          configPath: opts.config,
          workspaceDir: ctx.workspaceDir,
          force: provider ? true : opts.force,
          dryRun: opts.dryRun,
          provider,
          setupMcporter,
          excludeServers,
          enableTodoEnforcer,
          enablePlannerGuard,
          enableWebhookBridge,
          webhookHooksToken,
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
