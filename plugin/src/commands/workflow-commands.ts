import { promises as fs } from 'fs';
import { OmocPluginApi } from '../types.js';
import { resolvePluginPath } from '../utils/paths.js';

async function readWorkflow(workflowName: string): Promise<string> {
  try {
    const workflowPath = resolvePluginPath('workflows', `${workflowName}.md`);
    return await fs.readFile(workflowPath, 'utf-8');
  } catch (error) {
    console.warn('[omoc] Failed to read workflow file:', `workflows/${workflowName}.md`, error);
    return `Error: Could not read workflow file 'workflows/${workflowName}.md'.`;
  }
}

interface WorkflowCommandConfig {
  name: string;
  description: string;
  workflowFile: string;
  headerTitle: string;
  argLabel: string;
  defaultArgValue: string;
}

const WORKFLOW_COMMANDS: WorkflowCommandConfig[] = [
  {
    name: 'ultrawork',
    description: 'Full planning → execution → verification workflow',
    workflowFile: 'ultrawork',
    headerTitle: 'Ultrawork Mode',
    argLabel: 'Task',
    defaultArgValue: 'No task specified',
  },
  {
    name: 'plan',
    description: 'Create a structured execution plan',
    workflowFile: 'plan',
    headerTitle: 'Planning Mode',
    argLabel: 'Topic',
    defaultArgValue: 'No topic specified',
  },
  {
    name: 'start_work',
    description: 'Execute an approved plan',
    workflowFile: 'start-work',
    headerTitle: 'Start Work Mode',
    argLabel: 'Plan',
    defaultArgValue: 'most recent plan',
  },
];

export function registerWorkflowCommands(api: OmocPluginApi) {
  for (const config of WORKFLOW_COMMANDS) {
    api.registerCommand({
      name: config.name,
      description: config.description,
      acceptsArgs: true,
      handler: async (ctx: { args?: string }) => {
        const argValue = ctx.args || config.defaultArgValue;
        const workflow = await readWorkflow(config.workflowFile);
        return {
          text: `# ${config.headerTitle}\n\n**${config.argLabel}**: ${argValue}\n\n---\n\n${workflow}`,
        };
      },
    });
  }
}
