import { getConfig } from '../utils/config.js';
import { join } from 'path';

import {
  ABSOLUTE_MAX_RALPH_ITERATIONS,
  OmocPluginApi,
  PLUGIN_ID,
  RalphLoopState,
} from '../types.js';
import { readState, writeState } from '../utils/state.js';
import { clampIterations } from '../utils/validation.js';

const DEFAULT_STATE: RalphLoopState = {
  active: false,
  iteration: 0,
  maxIterations: 10,
  taskFile: '',
  startedAt: '',
};

let apiRef: OmocPluginApi | null = null;
let stateFilePath = '';
let currentState: RalphLoopState = { ...DEFAULT_STATE };
let stateLock: Promise<void> = Promise.resolve();

async function withStateLock<T>(fn: () => Promise<T>): Promise<T> {
  const current = stateLock;
  let release!: () => void;
  stateLock = new Promise<void>(resolve => {
    release = resolve;
  });

  await current;
  try {
    return await fn();
  } finally {
    release();
  }
}

function getApi(): OmocPluginApi {
  if (!apiRef) {
    throw new Error('Ralph Loop service is not registered');
  }
  return apiRef;
}

async function loadStateFromFile(): Promise<void> {
  if (!stateFilePath) {
    currentState = { ...DEFAULT_STATE };
    return;
  }

  const result = await readState<RalphLoopState>(stateFilePath);
  if (result.ok) {
    currentState = result.data;
    return;
  }

  if (result.error === 'corrupted') {
    getApi().logger.warn(`[${PLUGIN_ID}] Ralph Loop state was corrupted; recovering with default state`);
  }

  currentState = { ...DEFAULT_STATE };
}

async function saveStateToFile(): Promise<void> {
  if (!stateFilePath) {
    return;
  }
  await writeState(stateFilePath, currentState);
}

export function registerRalphLoop(api: OmocPluginApi): void {
  apiRef = api;
  const config = getConfig(api);
  stateFilePath = join(config.checkpoint_dir, 'ralph-loop-state.json');

  api.registerService({
    id: 'omoc-ralph-loop',
    name: 'Ralph Loop Service',
    description: 'Self-referential completion mechanism with configurable iterations',
    start: async () => {
      await loadStateFromFile();
    },
    stop: async () => {
      await saveStateToFile();
    },
  });
}

export async function startLoop(
  taskFile: string,
  maxIterations: number
): Promise<{ success: boolean; message: string; state: RalphLoopState }> {
  const api = getApi();

  if (currentState.active) {
    return {
      success: false,
      message: 'Ralph Loop is already running',
      state: currentState,
    };
  }

  const clampedIterations = clampIterations(maxIterations, ABSOLUTE_MAX_RALPH_ITERATIONS);

  currentState = {
    active: true,
    iteration: 0,
    maxIterations: clampedIterations,
    taskFile,
    startedAt: new Date().toISOString(),
  };

  await saveStateToFile();
  api.logger.info('[omoc] Ralph Loop started');

  return {
    success: true,
    message: 'Ralph Loop started',
    state: currentState,
  };
}

export async function stopLoop(): Promise<{ success: boolean; message: string; state: RalphLoopState }> {
  return withStateLock(async () => {
    const api = getApi();

    currentState = {
      ...currentState,
      active: false,
    };

    await saveStateToFile();
    api.logger.info('[omoc] Ralph Loop stopped');

    return {
      success: true,
      message: 'Ralph Loop stopped',
      state: currentState,
    };
  });
}

export async function getStatus(): Promise<RalphLoopState> {
  return { ...currentState };
}

export async function incrementIteration(): Promise<{ continue: boolean; state: RalphLoopState }> {
  return withStateLock(async () => {
    if (!currentState.active) {
      return {
        continue: false,
        state: currentState,
      };
    }

    const nextIteration = currentState.iteration + 1;
    const reachedLimit = nextIteration >= currentState.maxIterations;

    currentState = {
      ...currentState,
      iteration: nextIteration,
      active: reachedLimit ? false : currentState.active,
    };

    await saveStateToFile();

    return {
      continue: currentState.active,
      state: currentState,
    };
  });
}
