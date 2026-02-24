import { Type } from '@sinclair/typebox';
import * as childProcess from 'child_process';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { getConfig } from '../utils/config.js';
import { toolResponse, toolError } from '../utils/helpers.js';

const TMUX_SESSION_TARGET = 'gemini:0.0';
const GEMINI_TIMEOUT_MS = 60_000;
const TMUX_SEND_TIMEOUT_MS = 5_000;
let lockPromise: Promise<void> = Promise.resolve();

interface LookAtParams {
  file_path: string;
  goal: string;
  model?: string;
}

function shellQuote(arg: string): string {
  return arg.replace(/'/g, "'\\''");
}

function runTmux(tmuxArgs: string[], timeout: number): void {
  if (Object.prototype.hasOwnProperty.call(childProcess, 'execFileSync')) {
    (childProcess as { execFileSync: (file: string, args: string[], opts: { timeout: number }) => void }).execFileSync(
      'tmux',
      tmuxArgs,
      { timeout },
    );
    return;
  }

  const fallbackCommand = ['tmux', ...tmuxArgs]
    .map((arg) => `'${shellQuote(arg)}'`)
    .join(' ');
  childProcess.execSync(fallbackCommand, { timeout });
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const current = lockPromise;
  let resolveLock!: () => void;
  lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  await current;
  try {
    return await fn();
  } finally {
    resolveLock();
  }
}

export function registerLookAtTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}look_at`,
    description: 'Analyze files (PDF, images, video) using Gemini CLI via tmux',
    parameters: Type.Object({
      file_path: Type.String({ description: 'Path to the file to analyze' }),
      goal: Type.String({ description: 'What to analyze or look for' }),
      model: Type.Optional(
        Type.String({
          description: 'Gemini model to use',
          default: 'gemini-2.5-flash',
        }),
      ),
    }),
    execute: async (params: LookAtParams) => {
      return withLock(async () => {
        const tempFile = `/tmp/omoc-look-at-${randomUUID()}.md`;
        const tmuxSocket = getConfig(api).tmux_socket;

        try {
          const model = params.model ?? 'gemini-2.5-flash';

          const command = `gemini -m '${shellQuote(model)}' --prompt '${shellQuote(params.goal)}' -f '${shellQuote(params.file_path)}' -o text > '${shellQuote(tempFile)}' 2>&1`;

          runTmux(
            ['-S', tmuxSocket, 'send-keys', '-t', TMUX_SESSION_TARGET, '-l', '--', command],
            TMUX_SEND_TIMEOUT_MS,
          );
          runTmux(
            ['-S', tmuxSocket, 'send-keys', '-t', TMUX_SESSION_TARGET, 'Enter'],
            TMUX_SEND_TIMEOUT_MS,
          );

          const startTime = Date.now();
          while (Date.now() - startTime < GEMINI_TIMEOUT_MS) {
            try {
              const stat = await fs.stat(tempFile);
              if (stat.size > 0) {
               const result = await fs.readFile(tempFile, 'utf-8');
                 await fs.unlink(tempFile);
                 return toolResponse(result);
              }
            } catch {
              /* file not ready yet, continue polling */
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          try {
            await fs.unlink(tempFile);
          } catch (cleanupErr) {
            api.logger.warn('[omoc] Failed to clean up temp file:', tempFile, cleanupErr);
          }

           return toolError(`Gemini CLI timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`);
        } catch (error) {
          try {
            await fs.unlink(tempFile);
          } catch (cleanupErr) {
            api.logger.warn('[omoc] Failed to clean up temp file:', tempFile, cleanupErr);
          }

           const message = error instanceof Error ? error.message : String(error);
           return toolError(message);
        }
      });
    },
    optional: true,
  });
}
