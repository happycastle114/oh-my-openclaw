import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { isValidCategory } from '../utils/validation.js';
import { type Category } from '../constants.js';
import { getConfig } from '../utils/config.js';
import { toolResponse, toolError } from '../utils/helpers.js';

const DEFAULT_CATEGORY_MODELS: Record<Category, string> = {
  quick: 'claude-sonnet-4-6',
  deep: 'claude-opus-4-6-thinking',
  ultrabrain: 'gpt-5.3-codex',
  'visual-engineering': 'gemini-3.1-pro',
  multimodal: 'gemini-2.5-flash',
  artistry: 'claude-opus-4-6-thinking',
  'unspecified-low': 'claude-sonnet-4-6',
  'unspecified-high': 'claude-opus-4-6-thinking',
  writing: 'claude-sonnet-4-6',
};

const DelegateParamsSchema = Type.Object({
  task_description: Type.String({ description: 'What the sub-agent should do' }),
  category: Type.String({ description: 'Task category for model routing (quick, deep, ultrabrain, etc.)' }),
  agent_id: Type.Optional(Type.String({ description: 'Target agent ID (e.g., omoc_sisyphus, omoc_oracle). Routes to specialized agent config.' })),
  skills: Type.Optional(Type.Array(Type.String(), { description: 'Skill names to load' })),
  background: Type.Optional(Type.Boolean({ description: 'Run in background (default: false)', default: false })),
});

type DelegateParams = Static<typeof DelegateParamsSchema>;

function getModelForCategory(category: Category, api: OmocPluginApi): { model: string; alternatives?: string[] } {
  const config = getConfig(api);
  const override = config.model_routing?.[category];
  if (override?.model) {
    return { model: override.model, alternatives: override.alternatives };
  }
  return { model: DEFAULT_CATEGORY_MODELS[category], alternatives: undefined };
}

export function registerDelegateTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}delegate`,
    description: 'Delegate a task to a sub-agent with category-based model routing',
    parameters: DelegateParamsSchema,
    execute: async (params: DelegateParams) => {
      const validCategories = Object.keys(DEFAULT_CATEGORY_MODELS);

      if (!params.task_description?.trim()) {
         return toolResponse(JSON.stringify({ error: 'Task description is required and cannot be empty' }, null, 2));
       }

      if (params.task_description.length > 10000) {
         return toolResponse(JSON.stringify({ error: 'Task description too long (max 10000 chars)' }, null, 2));
       }

       if (!isValidCategory(params.category)) {
         return toolResponse(JSON.stringify(
           {
             error: `Invalid category: ${params.category}`,
             valid_categories: validCategories,
           },
           null,
           2,
         ));
       }

      const { model, alternatives } = getModelForCategory(params.category as Category, api);

      api.logger.info('[omoc] Delegating task:', { category: params.category, model });

      const instruction = [
        `Category "${params.category}" → model "${model}"`,
        '',
        '⚡ NOW CALL sessions_spawn with these parameters:',
        `  task: "${params.task_description}"`,
        `  mode: "run"`,
        `  model: "${model}"`,
        params.agent_id ? `  agentId: "${params.agent_id}"` : '',
        alternatives?.length ? `  fallback_models: ${JSON.stringify(alternatives)}` : '',
        alternatives?.length ? `  If "${model}" is unavailable, try: ${alternatives.join(', ')}` : '',
        params.background ? '  (background execution — results will arrive via push notification)' : '',
        '',
        'Do NOT just return this metadata. Actually call sessions_spawn NOW.',
        '',
        '⚠️ AFTER the subagent completes:',
        '  1. Check the result immediately',
        '  2. Verify against success criteria',
        '  3. Proceed to next task — do NOT stop',
      ].filter(Boolean).join('\n');

       return toolResponse(instruction);
    },
    optional: true,
  });
}
