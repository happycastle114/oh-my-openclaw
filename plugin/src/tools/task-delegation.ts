import { Type, Static } from '@sinclair/typebox';
import { OmocPluginApi, TOOL_PREFIX } from '../types.js';
import { isValidCategory } from '../utils/validation.js';

const CATEGORY_MODELS: Record<string, string> = {
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
  skills: Type.Optional(Type.Array(Type.String(), { description: 'Skill names to load' })),
  background: Type.Optional(Type.Boolean({ description: 'Run in background (default: false)', default: false })),
});

type DelegateParams = Static<typeof DelegateParamsSchema>;

export function registerDelegateTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}delegate`,
    description: 'Delegate a task to a sub-agent with category-based model routing',
    parameters: DelegateParamsSchema,
    execute: async (params: DelegateParams) => {
      const validCategories = Object.keys(CATEGORY_MODELS);

      if (!isValidCategory(params.category)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Invalid category: ${params.category}`,
                  valid_categories: validCategories,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const model = CATEGORY_MODELS[params.category];

      api.logger.info('[omoc] Delegating task:', { category: params.category, model });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                action: 'delegate',
                task_description: params.task_description,
                category: params.category,
                model,
                skills: params.skills || [],
                background: params.background || false,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
    optional: true,
  });
}
