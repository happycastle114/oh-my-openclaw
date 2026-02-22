import { Type } from '@sinclair/typebox';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';

import { OmocPluginApi, TOOL_PREFIX } from '../types.js';

const TMUX_SOCKET = '/tmp/openclaw-tmux-sockets/openclaw.sock';
const TMUX_SESSION_TARGET = 'gemini:0.0';
const GEMINI_TIMEOUT_MS = 60_000;

interface LookAtParams {
  file_path: string;
  goal: string;
  model?: string;
}

function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''");
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
      const tempFile = `/tmp/omoc-look-at-${Date.now()}.md`;

      try {
        const model = params.model ?? 'gemini-2.5-flash';
        const escapedFilePath = escapeShellArg(params.file_path);
        const escapedGoal = escapeShellArg(params.goal);
        const escapedModel = escapeShellArg(model);

        const command = `gemini -m ${escapedModel} --prompt '${escapedGoal}' -f '${escapedFilePath}' -o text > ${tempFile} 2>&1`;
        const tmuxCommand = `tmux -S ${TMUX_SOCKET} send-keys -t ${TMUX_SESSION_TARGET} -l -- '${command}' && sleep 0.1 && tmux -S ${TMUX_SOCKET} send-keys -t ${TMUX_SESSION_TARGET} Enter`;

        execSync(tmuxCommand, { timeout: 5000 });

        const startTime = Date.now();
        while (Date.now() - startTime < GEMINI_TIMEOUT_MS) {
          try {
            const stat = await fs.stat(tempFile);
            if (stat.size > 0) {
              const result = await fs.readFile(tempFile, 'utf-8');
              await fs.unlink(tempFile);
              return { content: [{ type: 'text', text: result }] };
            }
          } catch {}

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        try {
          await fs.unlink(tempFile);
        } catch {}

        return {
          content: [
            { type: 'text', text: 'Error: Gemini CLI timed out after 60 seconds' },
          ],
        };
      } catch (error) {
        try {
          await fs.unlink(tempFile);
        } catch {}

        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: 'text', text: `Error: ${message}` }] };
      }
    },
    optional: true,
  });
}
