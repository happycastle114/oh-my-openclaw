import { Type } from '@sinclair/typebox';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { getConfig } from '../utils/config.js';
import { resolveCliCommand, runCli } from '../utils/cli-runner.js';
import { toolResponse, toolError } from '../utils/helpers.js';

interface WebSearchParams {
  query: string;
  model?: string;
}

export function registerWebSearchTool(api: OmocPluginApi) {
  const config = getConfig(api);
  const backend = config.cli_backend?.web_search ?? 'gemini';

  api.registerTool({
    name: `${TOOL_PREFIX}web_search`,
    description: `Search the web using ${backend} CLI with Google Search grounding. Returns markdown text with grounded results.`,
    parameters: Type.Object({
      query: Type.String({ description: 'Search query or question to answer using web search' }),
      model: Type.Optional(
        Type.String({
          description: 'Gemini model to use',
          default: 'gemini-3-flash-preview',
        }),
      ),
    }),
    execute: async (_toolCallId: string, params: WebSearchParams) => {
      const query = params.query?.trim();
      if (!query) {
        return toolError('Query is required and must not be empty');
      }

      try {
        const { command, args } = resolveCliCommand(backend, 'web_search', {
          model: params.model,
          prompt: query,
        });

        const result = await runCli(command, args, { timeout: 90_000 });

        if (!result.stdout) {
          return toolError('CLI returned empty output');
        }

        return toolResponse(result.stdout);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
    optional: true,
  });
}
