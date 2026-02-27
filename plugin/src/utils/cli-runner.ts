import { execFile } from 'child_process';

import type { CliBackend } from '../constants.js';

/** Options for CLI execution. */
export interface CliRunOptions {
  /** Timeout in milliseconds. Default: 60_000 */
  timeout?: number;
  /** Max stdout/stderr buffer size in bytes. Default: 10 * 1024 * 1024 (10 MB) */
  maxBuffer?: number;
  /** Working directory for the child process. */
  cwd?: string;
}

/** Result of a CLI execution. */
export interface CliResult {
  stdout: string;
  stderr: string;
}

/** Resolved command and arguments for a CLI invocation. */
export interface CliCommandSpec {
  command: string;
  args: string[];
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10 MB
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Resolve the CLI command and arguments for a given backend and tool type.
 *
 * For look_at:
 * - gemini: gemini -m <model> --prompt <goal> -f <filePath> -o text
 * - codex: codex exec --prompt "Analyze file <filePath>: <goal>"
 * - opencode: opencode --non-interactive --prompt "Analyze file <filePath>: <goal>"
 *
 * For web_search:
 * - gemini: gemini -m <model> --prompt <query> -o text
 * - codex: codex exec --prompt "<query>"
 * - opencode: opencode --non-interactive --prompt "<query>"
 */
export function resolveCliCommand(
  backend: CliBackend,
  toolType: 'look_at' | 'web_search',
  params: {
    model?: string;
    prompt: string;
    filePath?: string; // only for look_at
  },
): CliCommandSpec {
  const { prompt, filePath } = params;
  const model = params.model || DEFAULT_GEMINI_MODEL;

  switch (backend) {
    case 'gemini': {
      const args = ['-m', model, '--prompt', prompt];
      if (toolType === 'look_at') {
        if (!filePath) {
          throw new Error('filePath is required for look_at tool type');
        }
        args.push('-f', filePath);
      }
      args.push('-o', 'text');
      return { command: 'gemini', args };
    }

    case 'codex': {
      if (toolType === 'look_at') {
        return {
          command: 'codex',
          args: ['exec', '--prompt', `Analyze file ${filePath}: ${prompt}`],
        };
      }
      return {
        command: 'codex',
        args: ['exec', '--prompt', prompt],
      };
    }

    case 'opencode': {
      if (toolType === 'look_at') {
        return {
          command: 'opencode',
          args: ['--non-interactive', '--prompt', `Analyze file ${filePath}: ${prompt}`],
        };
      }
      return {
        command: 'opencode',
        args: ['--non-interactive', '--prompt', prompt],
      };
    }

    default: {
      // Exhaustive check — CliBackend is a union, so this should be unreachable
      const _exhaustive: never = backend;
      throw new Error(`Unsupported CLI backend: ${_exhaustive}`);
    }
  }
}

/**
 * Execute a CLI command with timeout and error handling.
 * Returns `{ stdout, stderr }`.
 * Throws on timeout (`error.killed`), non-zero exit, or other failures.
 */
export function runCli(
  command: string,
  args: string[],
  options?: CliRunOptions,
): Promise<CliResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxBuffer = options?.maxBuffer ?? DEFAULT_MAX_BUFFER;

  return new Promise<CliResult>((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout,
        maxBuffer,
        ...(options?.cwd ? { cwd: options.cwd } : {}),
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(
              new Error(
                `CLI command '${command}' timed out after ${Math.round(timeout / 1000)} seconds`,
              ),
            );
          } else {
            const detail = stderr?.trim() || error.message;
            reject(
              new Error(
                `CLI command '${command}' failed (exit ${error.code}): ${detail}`,
              ),
            );
          }
          return;
        }

        resolve({
          stdout: stdout.trim(),
          stderr: stderr ?? '',
        });
      },
    );
  });
}
