import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { toolResponse, toolError } from '../utils/helpers.js';

const VALID_ACP_AGENTS = ['opencode', 'codex', 'claude', 'gemini', 'pi'] as const;

const OmoDelegateParamsSchema = Type.Object({
  task: Type.String({ description: 'What OmO (OpenCode) should do — the coding task description. Use @agentname prefix to invoke OpenCode subagents (e.g., "@explore find auth files").' }),
  agent: Type.Optional(Type.String({ description: 'ACP harness agent ID (default: "opencode"). Valid: opencode, codex, claude, gemini, pi' })),
  opencode_agent: Type.Optional(Type.String({ description: 'OpenCode internal agent mode (e.g., "build", "plan", or custom agent name). Only applies when agent is "opencode". Defaults to OpenCode\'s configured primary agent. Uses ACP session mode switching.' })),
  model: Type.Optional(Type.String({ description: 'Override model — only when you need a specific model. Leave empty to use OpenCode\'s own configured default.' })),
  thread: Type.Optional(Type.Boolean({ description: 'Bind to a thread for persistent multi-turn session (default: false)', default: false })),
  label: Type.Optional(Type.String({ description: 'Label for easy identification in /subagents list and /acp sessions' })),
  cwd: Type.Optional(Type.String({ description: 'Working directory for the ACP session' })),
});

type OmoDelegateParams = Static<typeof OmoDelegateParamsSchema>;

export function registerOmoDelegateTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX.replace('omoc_', 'omo_')}delegate`,
    description: 'Delegate a coding task to OmO (OpenCode) via ACP session. Use this for coding work — implementation, bug fixes, refactoring, testing.',
    parameters: OmoDelegateParamsSchema,
    execute: async (_toolCallId: string, params: OmoDelegateParams) => {
      if (!params.task?.trim()) {
        return toolError('Task is required and cannot be empty');
      }

      if (params.task.length > 10000) {
        return toolError('Task too long (max 10000 chars)');
      }

      const agent = params.agent || 'opencode';

      if (!VALID_ACP_AGENTS.includes(agent as typeof VALID_ACP_AGENTS[number])) {
        return toolError(`Invalid ACP agent: ${agent}. Valid: ${VALID_ACP_AGENTS.join(', ')}`);
      }

      const sessionMode = params.thread ? 'session' : 'run';

      api.logger.info(`${LOG_PREFIX} OmO delegation:`, { agent, opencode_agent: params.opencode_agent, model: params.model, thread: params.thread });

      const instruction = [
        `OmO Delegation → ACP runtime → harness "${agent}"`,
        '',
        '⚡ NOW CALL sessions_spawn with these parameters:',
        `  task: "${params.task}"`,
        `  runtime: "acp"`,
        `  agentId: "${agent}"`,
        `  mode: "${sessionMode}"`,
        params.model ? `  model: "${params.model}"` : '',
        params.thread ? '  thread: true' : '',
        params.label ? `  label: "${params.label}"` : '',
        params.cwd ? `  cwd: "${params.cwd}"` : '',
        '',
        'Do NOT just return this metadata. Actually call sessions_spawn NOW.',
        params.opencode_agent ? [
          '',
          `🔀 AFTER session is created, switch OpenCode agent mode to "${params.opencode_agent}":`,
          `  Use ACP session mode switching (setSessionMode) to select "${params.opencode_agent}"`,
          '  Available modes are returned in the session creation response',
        ].join('\n') : '',
        '',
        '⚠️ AFTER the ACP session completes:',
        '  1. Check the announce result immediately',
        '  2. Verify with git status/diff',
        '  3. Proceed to next task — do NOT stop',
      ].filter(Boolean).join('\n');

      return toolResponse(instruction);
    },
    optional: true,
  });
}
