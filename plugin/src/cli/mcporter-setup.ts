import fs from 'node:fs';
import path from 'node:path';

type McpServerEntry = {
  url: string;
  description: string;
};
export const OMOC_MCP_SERVERS: Record<string, McpServerEntry> = {
  'web-search-prime': {
    url: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
    description: 'Keyword-based web search (news, blogs, general)',
  },
  'web-reader': {
    url: 'https://api.z.ai/api/mcp/web_reader/mcp',
    description: 'Clean full-page content extraction',
  },
  exa: {
    url: 'https://mcp.exa.ai/mcp?tools=web_search_exa',
    description: 'Semantic web search (Exa)',
  },
  context7: {
    url: 'https://mcp.context7.com/mcp',
    description: 'Library/framework documentation search',
  },
  grep_app: {
    url: 'https://mcp.grep.app',
    description: 'Open-source code search on GitHub',
  },
  zread: {
    url: 'https://api.z.ai/api/mcp/zread/mcp',
    description: 'Direct GitHub repository exploration',
  },
};

type McporterConfig = {
  mcpServers: Record<string, { url?: string; baseUrl?: string; type?: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

/**
 * Resolve mcporter config path.
 * Priority: ~/.openclaw/workspace/config/mcporter.json > ~/.config/mcporter/mcporter.json
 */
export function resolveMcporterConfigPath(): string {
  const homeDir = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';

  const openclawPath = path.join(homeDir, '.openclaw', 'workspace', 'config', 'mcporter.json');
  if (fs.existsSync(openclawPath)) {
    return openclawPath;
  }

  const mcporterHomePath = path.join(homeDir, '.config', 'mcporter', 'mcporter.json');
  if (fs.existsSync(mcporterHomePath)) {
    return mcporterHomePath;
  }

  return openclawPath;
}

export function readMcporterConfig(configPath: string): McporterConfig {
  if (!fs.existsSync(configPath)) {
    return { mcpServers: {} };
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as McporterConfig;

  if (!parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
    parsed.mcpServers = {};
  }

  return parsed;
}

export function writeMcporterConfig(configPath: string, config: McporterConfig): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export interface McporterMergeResult {
  added: string[];
  skipped: string[];
}

export function mergeMcpServers(
  existing: McporterConfig,
  servers: Record<string, McpServerEntry>,
): { config: McporterConfig; result: McporterMergeResult } {
  const result: McporterMergeResult = { added: [], skipped: [] };
  const merged = { ...existing, mcpServers: { ...existing.mcpServers } };

  for (const [name, entry] of Object.entries(servers)) {
    if (merged.mcpServers[name]) {
      result.skipped.push(name);
    } else {
      merged.mcpServers[name] = { url: entry.url };
      result.added.push(name);
    }
  }

  return { config: merged, result };
}

type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
};

export interface McporterSetupOptions {
  configPath?: string;
  dryRun?: boolean;
  logger: Logger;
}

export function runMcporterSetup(options: McporterSetupOptions): McporterMergeResult {
  const { logger, dryRun = false } = options;
  const configPath = options.configPath ?? resolveMcporterConfigPath();

  logger.info(`mcporter config: ${configPath}`);

  const existing = readMcporterConfig(configPath);
  const { config: merged, result } = mergeMcpServers(existing, OMOC_MCP_SERVERS);

  if (result.added.length === 0) {
    logger.info('No changes needed — all MCP servers already configured.');
    return result;
  }

  if (dryRun) {
    logger.info(`[dry-run] Would add ${result.added.length} MCP server(s): ${result.added.join(', ')}`);
    return result;
  }

  if (fs.existsSync(configPath)) {
    const backupPath = configPath + '.bak';
    fs.copyFileSync(configPath, backupPath);
    logger.info(`Backup created: ${backupPath}`);
  }

  writeMcporterConfig(configPath, merged);
  logger.info(`Added ${result.added.length} MCP server(s): ${result.added.join(', ')}`);

  if (result.skipped.length > 0) {
    logger.info(`Skipped ${result.skipped.length} existing server(s): ${result.skipped.join(', ')}`);
  }

  return result;
}
