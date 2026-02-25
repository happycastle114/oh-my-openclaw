import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolves to plugin root (from dist/utils/ → go up ../../)
// When compiled: dist/utils/paths.js → dirname → dist/utils → .. → dist → .. → plugin root
export const PLUGIN_ROOT = resolve(__dirname, '..', '..');

export function resolvePluginPath(...segments: string[]): string {
  return join(PLUGIN_ROOT, ...segments);
}

export function resolveWorkspacePath(workspaceDir: string, ...segments: string[]): string {
  return join(workspaceDir, ...segments);
}

/**
 * Resolve the OpenClaw workspace directory (absolute path).
 * Uses explicit workspaceDir when provided (e.g. from hook context),
 * otherwise falls back to ~/.openclaw/workspace with OPENCLAW_PROFILE support.
 */
export function resolveOpenClawWorkspaceDir(workspaceDir?: string): string {
  if (workspaceDir) return workspaceDir;
  const profile = process.env.OPENCLAW_PROFILE?.trim();
  return (profile && profile.toLowerCase() !== 'default')
    ? join(homedir(), '.openclaw', `workspace-${profile}`)
    : join(homedir(), '.openclaw', 'workspace');
}
