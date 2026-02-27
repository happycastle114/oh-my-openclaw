import { Type } from '@sinclair/typebox';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { getConfig } from '../utils/config.js';
import { resolveCliCommand, runCli } from '../utils/cli-runner.js';
import { toolResponse, toolError } from '../utils/helpers.js';

interface LookAtParams {
  file_path: string;
  goal: string;
  model?: string;
}

export function registerLookAtTool(api: OmocPluginApi) {
  const config = getConfig(api);
  const backend = config.cli_backend?.look_at ?? 'gemini';

  api.registerTool({
    name: `${TOOL_PREFIX}look_at`,
    description: `Analyze files (PDF, images, video) using ${backend} CLI`,
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
      try {
        const { command, args } = resolveCliCommand(backend, 'look_at', {
          model: params.model,
          prompt: params.goal,
          filePath: params.file_path,
        });

        const result = await runCli(command, args, { timeout: 60_000 });

        return toolResponse(result.stdout || '(empty response from CLI)');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
    optional: true,
  });
}
