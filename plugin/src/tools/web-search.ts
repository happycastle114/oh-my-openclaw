import { Type } from '@sinclair/typebox';

import { OmocPluginApi } from '../types.js';
import { TOOL_PREFIX } from '../constants.js';
import { toolResponse, toolError } from '../utils/helpers.js';
import { execFileAsync } from '../utils/exec-adapter.js';

const GEMINI_TIMEOUT_MS = 90_000;

interface WebSearchParams {
  query: string;
  model?: string;
}

export function registerWebSearchTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}web_search`,
    description:
      'Search the web using Gemini CLI with Google Search grounding. Returns markdown text with grounded results.',
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

      const model = params.model ?? 'gemini-3-flash-preview';

      try {
        const { stdout } = await execFileAsync(
          'gemini',
          ['-m', model, '--prompt', query, '-o', 'text'],
          { timeout: GEMINI_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
        );

        if (!stdout.trim()) {
          return toolError('Gemini CLI returned empty output');
        }

        return toolResponse(stdout.trim());
      } catch (error: unknown) {
        const err = error as { stderr?: string; message?: string };
        const message = err.stderr?.trim() || err.message || 'Gemini CLI execution failed';
        return toolError(message);
      }
    },
    optional: true,
  });
}
