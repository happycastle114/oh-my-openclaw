import { OmocPluginApi } from '../types.js';
import { LOG_PREFIX } from '../constants.js';
import { setActivePersonaId, replaceAgentsMd } from '../utils/persona-state.js';
import { readPersonaPrompt, listPersonas } from '../agents/persona-prompts.js';

interface WorkflowCommandConfig {
  name: string;
  description: string;
  personaId: string;
  argLabel: string;
  defaultArgValue: string;
}

const WORKFLOW_COMMANDS: WorkflowCommandConfig[] = [
  {
    name: 'ultrawork',
    description: 'Full planning → execution → verification workflow',
    personaId: 'omoc_atlas',
    argLabel: 'Task',
    defaultArgValue: 'No task specified',
  },
  {
    name: 'plan',
    description: 'Create a structured execution plan',
    personaId: 'omoc_prometheus',
    argLabel: 'Topic',
    defaultArgValue: 'No topic specified',
  },
  {
    name: 'start_work',
    description: 'Execute an approved plan',
    personaId: 'omoc_atlas',
    argLabel: 'Plan',
    defaultArgValue: 'most recent plan',
  },
];

function getDisplayName(personaId: string): string {
  const persona = listPersonas().find((p) => p.id === personaId);
  return persona ? `${persona.emoji} ${persona.displayName}` : personaId;
}

export function registerWorkflowCommands(api: OmocPluginApi) {
  for (const config of WORKFLOW_COMMANDS) {
    api.registerCommand({
      name: config.name,
      description: config.description,
      acceptsArgs: true,
      handler: async (ctx: { args?: string }) => {
        const argValue = ctx.args || config.defaultArgValue;

        try {
          await setActivePersonaId(config.personaId);
          const content = await readPersonaPrompt(config.personaId);
          await replaceAgentsMd(content);
          api.logger.info(`${LOG_PREFIX} /${config.name}: persona switched to ${config.personaId}`);
        } catch (err) {
          api.logger.error(`${LOG_PREFIX} /${config.name}: failed to switch persona`, err);
          return { text: `Failed to switch persona to ${config.personaId}.` };
        }

        const displayName = getDisplayName(config.personaId);
        return {
          text: `Persona switched to **${displayName}**. **${config.argLabel}**: ${argValue}`,
        };
      },
    });
  }
}
