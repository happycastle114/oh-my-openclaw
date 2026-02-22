import { Type } from '@sinclair/typebox';
import { promises as fs } from 'fs';
import { join } from 'path';
import { OmocPluginApi, CheckpointData } from '../types.js';
import { readState, writeState, ensureDir } from '../utils/state.js';
import { getConfig } from '../utils/config.js';

export function registerCheckpointTool(api: OmocPluginApi) {
  api.registerTool({
    name: 'omoc_checkpoint',
    description: 'Save, load, or list session checkpoints for crash recovery',
    parameters: Type.Object({
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
    }),
    execute: async (params: any) => {
      const config = getConfig(api);
      const checkpointDir = config.checkpoint_dir;
      await ensureDir(checkpointDir);

      if (params.action === 'save') {
        const checkpoint: CheckpointData = {
          type: 'session-checkpoint',
          session_id: `checkpoint-${Date.now()}`,
          task: params.task || 'unknown',
          step: params.step || 'unknown',
          changed_files: params.changed_files || [],
          verification: { diagnostics: 'not-run', tests: 'not-run', build: 'not-run' },
          next_action: params.next_action || '',
          timestamp: new Date().toISOString(),
        };
        const filename = `checkpoint-${Date.now()}.json`;
        await writeState(join(checkpointDir, filename), checkpoint);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ saved: filename, checkpoint }, null, 2),
            },
          ],
        };
      }

      if (params.action === 'load') {
        try {
          const files = await fs.readdir(checkpointDir);
          const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();

          if (jsonFiles.length === 0) {
            return {
              content: [{ type: 'text', text: 'No checkpoints found' }],
            };
          }

          const mostRecent = jsonFiles[0];
          const checkpoint = await readState<CheckpointData>(join(checkpointDir, mostRecent));

          if (!checkpoint) {
            return {
              content: [{ type: 'text', text: `Failed to load checkpoint: ${mostRecent}` }],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ loaded: mostRecent, checkpoint }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error loading checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      }

      if (params.action === 'list') {
        try {
          const files = await fs.readdir(checkpointDir);
          const jsonFiles = files.filter((f) => f.endsWith('.json')).sort().reverse();

          if (jsonFiles.length === 0) {
            return {
              content: [{ type: 'text', text: 'No checkpoints found' }],
            };
          }

          const checkpoints = await Promise.all(
            jsonFiles.map(async (file) => {
              const checkpoint = await readState<CheckpointData>(join(checkpointDir, file));
              return {
                file,
                timestamp: checkpoint?.timestamp || 'unknown',
                task: checkpoint?.task || 'unknown',
                step: checkpoint?.step || 'unknown',
              };
            })
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ checkpoints }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing checkpoints: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      }

      return {
        content: [{ type: 'text', text: 'Invalid action' }],
      };
    },
    optional: true,
  });
}
