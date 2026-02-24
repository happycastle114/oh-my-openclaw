import { Type, Static } from '@sinclair/typebox';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OmocPluginApi, CheckpointData, ToolResult } from '../types.js';
import { readState, writeState, ensureDir } from '../utils/state.js';
import { getConfig } from '../utils/config.js';
import { toolResponse, toolError } from '../utils/helpers.js';
import { TOOL_PREFIX } from '../constants.js';

// Use Type.Unsafe with enum instead of Type.Union([Type.Literal(...)]) to avoid
// generating JSON Schema "const" keyword, which Gemini API does not support.
const CheckpointParamsSchema = Type.Object({
  action: Type.Unsafe<'save' | 'load' | 'list'>({
    type: 'string',
    enum: ['save', 'load', 'list'],
    description: 'Checkpoint operation',
  }),
  task: Type.Optional(Type.String({ description: 'Current task name (for save)' })),
  step: Type.Optional(Type.String({ description: 'Current step name (for save)' })),
  changed_files: Type.Optional(
    Type.Array(Type.String(), { description: 'Files modified since last checkpoint' })
  ),
  next_action: Type.Optional(Type.String({ description: 'What to do after restore' })),
});

type CheckpointParams = Static<typeof CheckpointParamsSchema>;

/**
 * List checkpoint files in a directory, sorted by name in reverse order (newest first)
 */
async function listCheckpointFiles(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  return files.filter((f) => f.endsWith('.json')).sort().reverse();
}

/**
 * Handle save action - persist checkpoint to disk
 */
async function handleSave(params: CheckpointParams, checkpointDir: string): Promise<ToolResult> {
  const now = Date.now();
  const checkpoint: CheckpointData = {
    type: 'session-checkpoint',
    session_id: `checkpoint-${now}`,
    task: params.task || 'unknown',
    step: params.step || 'unknown',
    changed_files: params.changed_files || [],
    verification: { diagnostics: 'not-run', tests: 'not-run', build: 'not-run' },
    next_action: params.next_action || '',
    timestamp: new Date(now).toISOString(),
  };
  const filename = `checkpoint-${now}.json`;
  await writeState(join(checkpointDir, filename), checkpoint);
  return toolResponse(JSON.stringify({ saved: filename, checkpoint }, null, 2));
}

/**
 * Handle load action - restore most recent checkpoint
 */
async function handleLoad(checkpointDir: string): Promise<ToolResult> {
  try {
    const jsonFiles = await listCheckpointFiles(checkpointDir);

    if (jsonFiles.length === 0) {
      return toolResponse('No checkpoints found');
    }

    const mostRecent = jsonFiles[0];
    const result = await readState<CheckpointData>(join(checkpointDir, mostRecent));

    if (!result.ok) {
      return toolError(`Failed to load checkpoint ${mostRecent}: ${result.message}`);
    }

    return toolResponse(JSON.stringify({ loaded: mostRecent, checkpoint: result.data }, null, 2));
  } catch (error) {
    return toolError(`Error loading checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle list action - show all available checkpoints
 */
async function handleList(checkpointDir: string): Promise<ToolResult> {
  try {
    const jsonFiles = await listCheckpointFiles(checkpointDir);

    if (jsonFiles.length === 0) {
      return toolResponse('No checkpoints found');
    }

    const checkpoints = await Promise.all(
      jsonFiles.map(async (file) => {
        const result = await readState<CheckpointData>(join(checkpointDir, file));
        return {
          file,
          timestamp: result.ok ? result.data.timestamp : 'unknown',
          task: result.ok ? result.data.task : 'unknown',
          step: result.ok ? result.data.step : 'unknown',
        };
      })
    );

    return toolResponse(JSON.stringify({ checkpoints }, null, 2));
  } catch (error) {
    return toolError(`Error listing checkpoints: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function registerCheckpointTool(api: OmocPluginApi) {
  api.registerTool({
    name: `${TOOL_PREFIX}checkpoint`,
    description: 'Save, load, or list session checkpoints for crash recovery',
    parameters: CheckpointParamsSchema,
    execute: async (params: CheckpointParams) => {
      const config = getConfig(api);
      const checkpointDir = config.checkpoint_dir;
      await ensureDir(checkpointDir);

      switch (params.action) {
        case 'save':
          return handleSave(params, checkpointDir);
        case 'load':
          return handleLoad(checkpointDir);
        case 'list':
          return handleList(checkpointDir);
        default:
          return toolError('Invalid action');
      }
    },
    optional: true,
  });
}
