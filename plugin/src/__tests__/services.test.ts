import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
  },
}));

vi.mock('../utils/state.js', () => ({
  readState: vi.fn().mockResolvedValue({ ok: false, error: 'not_found', message: 'File not found' }),
  writeState: vi.fn().mockResolvedValue(undefined),
  ensureDir: vi.fn().mockResolvedValue(undefined),
}));

import {
  registerRalphLoop,
  startLoop,
  stopLoop,
  getStatus,
  incrementIteration,
} from '../services/ralph-loop.js';
import { createMockApi } from './helpers/mock-factory.js';

describe('Ralph Loop Service', () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockApi = createMockApi();
    registerRalphLoop(mockApi);
    await stopLoop();
  });

  it('startLoop initializes state correctly', async () => {
    const result = await startLoop('test.md', 5);

    expect(result.success).toBe(true);
    expect(result.state.active).toBe(true);
    expect(result.state.iteration).toBe(0);
    expect(result.state.maxIterations).toBe(5);
    expect(result.state.taskFile).toBe('test.md');
    expect(result.state.startedAt).toBeTruthy();
  });

  it('stopLoop sets active to false', async () => {
    await startLoop('test.md', 5);
    const result = await stopLoop();

    expect(result.success).toBe(true);
    expect(result.state.active).toBe(false);
  });

  it('incrementIteration auto-stops at maxIterations', async () => {
    await startLoop('test.md', 3);

    const iter1 = await incrementIteration();
    expect(iter1.continue).toBe(true);
    expect(iter1.state.iteration).toBe(1);

    const iter2 = await incrementIteration();
    expect(iter2.continue).toBe(true);
    expect(iter2.state.iteration).toBe(2);

    const iter3 = await incrementIteration();
    expect(iter3.continue).toBe(false);
    expect(iter3.state.iteration).toBe(3);
    expect(iter3.state.active).toBe(false);
  });

  it('hard cap enforced (200 clamped to 100)', async () => {
    const result = await startLoop('test.md', 200);

    expect(result.success).toBe(true);
    expect(result.state.maxIterations).toBe(100);
  });

  it('concurrent invocation rejected', async () => {
    const first = await startLoop('test.md', 10);
    expect(first.success).toBe(true);

    const second = await startLoop('other.md', 5);
    expect(second.success).toBe(false);
    expect(second.message).toContain('already running');
  });

  it('getStatus returns a clone and protects internal state', async () => {
    const factoryApi = createMockApi();
    registerRalphLoop(factoryApi);
    await stopLoop();
    await startLoop('clone-check.md', 4);

    const firstStatus = await getStatus();
    firstStatus.iteration = 999;
    firstStatus.active = false;
    firstStatus.taskFile = 'mutated.md';

    const secondStatus = await getStatus();

    expect(secondStatus.iteration).toBe(0);
    expect(secondStatus.active).toBe(true);
    expect(secondStatus.taskFile).toBe('clone-check.md');
  });

  it('concurrent incrementIteration and stopLoop does not corrupt state', async () => {
    const factoryApi = createMockApi();
    registerRalphLoop(factoryApi);
    await stopLoop();
    await startLoop('race.md', 5);

    const [incrementResult, stopResult] = await Promise.all([
      incrementIteration(),
      stopLoop(),
    ]);
    const finalStatus = await getStatus();

    expect(stopResult.success).toBe(true);
    expect(finalStatus.active).toBe(false);
    expect(finalStatus.iteration).toBeGreaterThanOrEqual(0);
    expect(finalStatus.iteration).toBeLessThanOrEqual(1);
    expect(finalStatus.maxIterations).toBe(5);
    expect(incrementResult.state.taskFile).toBe('race.md');
    expect(finalStatus.taskFile).toBe('race.md');
  });
});
