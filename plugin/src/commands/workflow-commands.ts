import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { OmocPluginApi } from '../types.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From dist/commands/ → plugin root is ../../
const PLUGIN_ROOT = join(__dirname, '..', '..');
function readWorkflow(workflowName: string): string {
  try {
    const workflowPath = join(PLUGIN_ROOT, 'workflows', `${workflowName}.md`);
    return readFileSync(workflowPath, 'utf-8');
  } catch {
    return `Error: Could not read workflow file 'workflows/${workflowName}.md'. Plugin root: ${PLUGIN_ROOT}`;
  }
}

export function registerWorkflowCommands(api: OmocPluginApi) {
  api.registerCommand({
    name: 'ultrawork',
    description: 'Full planning \u2192 execution \u2192 verification workflow',
    handler: (ctx: { args?: string }) => {
      const taskDescription = ctx.args || 'No task specified';
      const workflow = readWorkflow('ultrawork');
      return {
        text: `# Ultrawork Mode\n\n**Task**: ${taskDescription}\n\n---\n\n${workflow}`,
      };
    },
  });

  api.registerCommand({
    name: 'plan',
    description: 'Create a structured execution plan',
    handler: (ctx: { args?: string }) => {
      const topic = ctx.args || 'No topic specified';
      const workflow = readWorkflow('plan');
      return {
        text: `# Planning Mode\n\n**Topic**: ${topic}\n\n---\n\n${workflow}`,
      };
    },
  });

  api.registerCommand({
    name: 'start-work',
    description: 'Execute an approved plan',
    handler: (ctx: { args?: string }) => {
      const planPath = ctx.args || 'most recent plan';
      const workflow = readWorkflow('start-work');
      return {
        text: `# Start Work Mode\n\n**Plan**: ${planPath}\n\n---\n\n${workflow}`,
      };
    },
  });
}