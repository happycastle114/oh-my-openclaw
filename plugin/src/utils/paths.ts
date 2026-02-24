import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

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
