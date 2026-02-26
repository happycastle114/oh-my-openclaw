import { Type } from '@sinclair/typebox';
import { execFile } from 'child_process';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { toolResponse, toolError } from '../utils/helpers.js';

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
          default: 'gemini-3-flash',
        }),
      ),
    }),
    execute: async (_toolCallId: string, params: LookAtParams) => {
      const model = params.model ?? 'gemini-3-flash';

      try {
        const stdout = await new Promise<string>((resolve, reject) => {
          execFile(
            'gemini',
            ['-m', model, '--prompt', params.goal, '-f', params.file_path, '-o', 'text'],
            { timeout: GEMINI_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
              if (error) {
                if (error.killed) {
                  reject(new Error(`Gemini CLI timed out after ${GEMINI_TIMEOUT_MS / 1000} seconds`));
                } else {
                  const detail = stderr?.trim() || error.message;
                  reject(new Error(`Gemini CLI failed (exit ${error.code}): ${detail}`));
                }
                return;
              }
              resolve(stdout);
            },
          );
        });

        return toolResponse(stdout.trim() || '(empty response from Gemini CLI)');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
    optional: true,
  });
}
