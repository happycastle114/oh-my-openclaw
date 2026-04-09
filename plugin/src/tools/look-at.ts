import { Type } from '@sinclair/typebox';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { toolResponse, toolError } from '../utils/helpers.js';
import { execFileAsync } from '../utils/exec-adapter.js';

const GEMINI_TIMEOUT_MS = 60_000;

interface LookAtParams {
  file_path: string;
  goal: string;
  model?: string;
}

export function registerLookAtTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}look_at`,
    description: 'Analyze files (PDF, images, video) using Gemini CLI',
    parameters: Type.Object({
      file_path: Type.String({ description: 'Path to the file to analyze' }),
      goal: Type.String({ description: 'What to analyze or look for' }),
      model: Type.Optional(
        Type.String({
          description: 'Gemini model to use',
          default: 'gemini-3-flash-preview',
        }),
      ),
    }),
    execute: async (_toolCallId: string, params: LookAtParams) => {
      const model = params.model ?? 'gemini-3-flash-preview';

      try {
        const { stdout } = await execFileAsync(
          'gemini',
          ['-m', model, '--prompt', params.goal, '-f', params.file_path, '-o', 'text'],
          { timeout: GEMINI_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
        );

        return toolResponse(stdout.trim() || '(empty response from Gemini CLI)');
      } catch (error: unknown) {
        const err = error as { killed?: boolean; code?: number; stderr?: string; message?: string };
        if (err.killed) {
          return toolError(`Gemini CLI timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`);
        }
        const detail = err.stderr?.trim() || err.message || String(error);
        return toolError(`Gemini CLI failed (exit ${err.code}): ${detail}`);
      }
    },
    optional: true,
  });
}
