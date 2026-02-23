import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { OmocPluginApi } from '../types.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From dist/commands/ → plugin root is ../../
const PLUGIN_ROOT = join(__dirname, '..', '..');
async function readWorkflow(workflowName: string): Promise<string> {
  try {
    const workflowPath = join(PLUGIN_ROOT, 'workflows', `${workflowName}.md`);
    return await fs.readFile(workflowPath, 'utf-8');
  } catch {
    return `Error: Could not read workflow file 'workflows/${workflowName}.md'. Plugin root: ${PLUGIN_ROOT}`;
  }
}

export function registerWorkflowCommands(api: OmocPluginApi) {
  api.registerCommand({
    name: 'ultrawork',
    description: 'Full planning → execution → verification workflow',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const taskDescription = ctx.args || 'No task specified';
      const workflow = await readWorkflow('ultrawork');
      return {
        text: `# Ultrawork Mode\n\n**Task**: ${taskDescription}\n\n---\n\n${workflow}`,
      };
    },
  });

  api.registerCommand({
    name: 'plan',
    description: 'Create a structured execution plan',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const topic = ctx.args || 'No topic specified';
      const workflow = await readWorkflow('plan');
      return {
        text: `# Planning Mode\n\n**Topic**: ${topic}\n\n---\n\n${workflow}`,
      };
    },
  });

  api.registerCommand({
    name: 'start_work',
    description: 'Execute an approved plan',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const planPath = ctx.args || 'most recent plan';
      const workflow = await readWorkflow('start-work');
      return {
        text: `# Start Work Mode\n\n**Plan**: ${planPath}\n\n---\n\n${workflow}`,
      };
    },
  });
}
