import fs from 'node:fs';
import path from 'node:path';
import JSON5 from 'json5';
import { OMOC_AGENT_CONFIGS, type OmocAgentConfig } from '../agents/agent-configs.js';

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

export interface SetupOptions {
  configPath?: string;
  workspaceDir?: string;
  force?: boolean;
  dryRun?: boolean;
  logger: Logger;
}

export function runSetup(options: SetupOptions): MergeResult {
  const { logger, force = false, dryRun = false } = options;

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

  const { merged, result } = mergeAgentConfigs(config.agents.list, OMOC_AGENT_CONFIGS, force);
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
    .action((...args: unknown[]) => {
      const opts = (args[0] ?? {}) as { force?: boolean; dryRun?: boolean; config?: string };
      try {
        runSetup({
          configPath: opts.config,
          workspaceDir: ctx.workspaceDir,
          force: opts.force,
          dryRun: opts.dryRun,
          logger: ctx.logger,
        });
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
