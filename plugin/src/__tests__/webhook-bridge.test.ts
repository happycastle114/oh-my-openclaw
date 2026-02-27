import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  callHooksWake,
  callHooksAgent,
  type WebhookConfig,
  type HooksAgentOptions,
} from '../utils/webhook-client.js';
import {
  registerWebhookBridge,
  trackSubagentSpawn,
  clearSubagentTracking,
  getTrackedSubagents,
  resetWebhookBridgeState,
} from '../services/webhook-bridge.js';
import {
  registerSubagentTracker,
  extractSpawnResult,
} from '../hooks/subagent-tracker.js';
import { createMockApi, createMockConfig } from './helpers/mock-factory.js';

const createMockApiAny = createMockApi as (...args: any[]) => any;

function getHookHandler(mockApi: any, callIndex = 0) {
  return mockApi.registerHook.mock.calls[callIndex][1];
}

function getServiceHandler(mockApi: any) {
  return mockApi.registerService.mock.calls[0][0];
}

// ---------------------------------------------------------------------------
// webhook-client.ts tests
// ---------------------------------------------------------------------------
describe('webhook-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('callHooksWake', () => {
    it('returns ok:false when hooks_token is empty', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: '',
      };

      const result = await callHooksWake('test message', config);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('hooks_token not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls fetch with correct URL, headers, body', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: 'test-token-123',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await callHooksWake('wake up', config);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/hooks/wake',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token-123',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: 'wake up', mode: 'now' }),
        },
      );
    });

    it('returns ok:true on successful response', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: 'test-token',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await callHooksWake('test', config);

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('handles fetch errors gracefully', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: 'test-token',
      };

      const mockLogger = { warn: vi.fn() };
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await callHooksWake('test', config, mockLogger);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Network error');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('callHooksAgent', () => {
    it('returns ok:false when hooks_token is empty', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: '',
      };

      const result = await callHooksAgent('test message', config);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('hooks_token not configured');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls fetch with correct payload including options', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: 'test-token-456',
      };

      const options: HooksAgentOptions = {
        name: 'TestAgent',
        agentId: 'agent-123',
        sessionKey: 'session-key-456',
        deliver: true,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await callHooksAgent('test message', config, options);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/hooks/agent',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token-456',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'test message',
            wakeMode: 'now',
            name: 'TestAgent',
            agentId: 'agent-123',
            sessionKey: 'session-key-456',
            deliver: true,
          }),
        },
      );
    });

    it('handles fetch errors gracefully', async () => {
      const config: WebhookConfig = {
        gateway_url: 'http://localhost:8000',
        hooks_token: 'test-token',
      };

      const mockLogger = { warn: vi.fn() };
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await callHooksAgent('test', config, undefined, mockLogger);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Connection timeout');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// webhook-bridge.ts tests
// ---------------------------------------------------------------------------
describe('webhook-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWebhookBridgeState();
    global.fetch = vi.fn();
  });

  describe('registerWebhookBridge', () => {
    it('registers a service with id omoc-webhook-bridge', () => {
      const mockApi = createMockApiAny();
      registerWebhookBridge(mockApi);

      expect(mockApi.registerService).toHaveBeenCalled();
      const serviceConfig = mockApi.registerService.mock.calls[0][0];
      expect(serviceConfig.id).toBe('omoc-webhook-bridge');
    });
  });

  describe('trackSubagentSpawn', () => {
    it('adds entry to tracking map', () => {
      const entry = {
        runId: 'run-123',
        childSessionKey: 'session-456',
        task: 'test task',
        spawnedAt: Date.now(),
      };

      trackSubagentSpawn(entry);

      const tracked = getTrackedSubagents();
      expect(tracked.has('run-123')).toBe(true);
      expect(tracked.get('run-123')).toEqual(entry);
    });
  });

  describe('clearSubagentTracking', () => {
    it('removes entry from tracking map', () => {
      const entry = {
        runId: 'run-789',
        childSessionKey: 'session-999',
        task: 'another task',
        spawnedAt: Date.now(),
      };

      trackSubagentSpawn(entry);
      expect(getTrackedSubagents().has('run-789')).toBe(true);

      clearSubagentTracking('run-789');
      expect(getTrackedSubagents().has('run-789')).toBe(false);
    });
  });

  describe('getTrackedSubagents', () => {
    it('returns current map', () => {
      const entry1 = {
        runId: 'run-1',
        childSessionKey: 'session-1',
        task: 'task 1',
        spawnedAt: Date.now(),
      };
      const entry2 = {
        runId: 'run-2',
        childSessionKey: 'session-2',
        task: 'task 2',
        spawnedAt: Date.now(),
      };

      trackSubagentSpawn(entry1);
      trackSubagentSpawn(entry2);

      const tracked = getTrackedSubagents();
      expect(tracked.size).toBe(2);
      expect(tracked.has('run-1')).toBe(true);
      expect(tracked.has('run-2')).toBe(true);
    });
  });

  describe('resetWebhookBridgeState', () => {
    it('clears all state', () => {
      const entry = {
        runId: 'run-reset',
        childSessionKey: 'session-reset',
        task: 'reset task',
        spawnedAt: Date.now(),
      };

      trackSubagentSpawn(entry);
      expect(getTrackedSubagents().size).toBe(1);

      resetWebhookBridgeState();
      expect(getTrackedSubagents().size).toBe(0);
    });
  });

  describe('service start behavior', () => {
    it('does nothing when webhook_bridge_enabled is false', async () => {
      const mockApi = createMockApiAny({
        config: createMockConfig({ webhook_bridge_enabled: false }),
      });

      registerWebhookBridge(mockApi);
      const service = getServiceHandler(mockApi);
      await service.start();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does nothing when hooks_token is empty', async () => {
      const mockApi = createMockApiAny({
        config: createMockConfig({
          webhook_bridge_enabled: true,
          hooks_token: '',
        }),
      });

      registerWebhookBridge(mockApi);
      const service = getServiceHandler(mockApi);
      await service.start();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('sets up interval when properly configured', async () => {
      const mockApi = createMockApiAny({
        config: createMockConfig({
          webhook_bridge_enabled: true,
          hooks_token: 'test-token',
          webhook_reminder_interval_ms: 60000,
        }),
      });

      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      registerWebhookBridge(mockApi);
      const service = getServiceHandler(mockApi);
      await service.start();

      expect(setIntervalSpy).toHaveBeenCalled();
      const callArgs = setIntervalSpy.mock.calls[0];
      expect(callArgs[1]).toBe(60000);

      resetWebhookBridgeState();
      setIntervalSpy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// subagent-tracker.ts tests
// ---------------------------------------------------------------------------
describe('subagent-tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWebhookBridgeState();
    global.fetch = vi.fn();
  });

  describe('registerSubagentTracker', () => {
    it('registers 2 hooks (tool_result_persist + message:received)', () => {
      const mockApi = createMockApiAny();
      registerSubagentTracker(mockApi);

      expect(mockApi.registerHook).toHaveBeenCalledTimes(2);

      const firstCall = mockApi.registerHook.mock.calls[0];
      expect(firstCall[0]).toBe('tool_result_persist');

      const secondCall = mockApi.registerHook.mock.calls[1];
      expect(secondCall[0]).toBe('message:received');
    });
  });

  describe('extractSpawnResult', () => {
    it('parses JSON spawn results correctly', () => {
      const jsonContent = JSON.stringify({
        status: 'accepted',
        runId: 'run-json-123',
        childSessionKey: 'session-json-456',
        task: 'json task',
      });

      const result = extractSpawnResult(jsonContent);

      expect(result).not.toBeNull();
      expect(result?.runId).toBe('run-json-123');
      expect(result?.childSessionKey).toBe('session-json-456');
      expect(result?.task).toBe('json task');
    });

    it('returns null for non-spawn content', () => {
      const nonSpawnContent = 'This is just regular text without spawn data';
      const result = extractSpawnResult(nonSpawnContent);
      expect(result).toBeNull();
    });

    it('parses regex-based spawn results when JSON parsing fails', () => {
      const textContent = 'runId: "run-regex-789" and childSessionKey: "session-regex-999"';
      const result = extractSpawnResult(textContent);

      expect(result).not.toBeNull();
      expect(result?.runId).toBe('run-regex-789');
      expect(result?.childSessionKey).toBe('session-regex-999');
    });
  });

  describe('tool_result_persist hook', () => {
    it('ignores non-sessions_spawn tools', () => {
      const mockApi = createMockApiAny();
      registerSubagentTracker(mockApi);

      const handler = getHookHandler(mockApi, 0);
      const payload = {
        tool: 'some_other_tool',
        content: 'some content',
      };

      const result = handler(payload);

      expect(result).toBeUndefined();
      expect(getTrackedSubagents().size).toBe(0);
    });

    it('tracks spawn results', () => {
      const mockApi = createMockApiAny();
      registerSubagentTracker(mockApi);

      const handler = getHookHandler(mockApi, 0);
      const spawnContent = JSON.stringify({
        status: 'accepted',
        runId: 'run-tracked-123',
        childSessionKey: 'session-tracked-456',
        task: 'tracked task',
      });

      const payload = {
        tool: 'sessions_spawn',
        content: spawnContent,
      };

      handler(payload);

      const tracked = getTrackedSubagents();
      expect(tracked.has('run-tracked-123')).toBe(true);
      expect(tracked.get('run-tracked-123')?.childSessionKey).toBe('session-tracked-456');
    });
  });

  describe('message:received hook', () => {
    it('clears tracking on announce detection', () => {
      const mockApi = createMockApiAny();
      registerSubagentTracker(mockApi);

      const toolHandler = getHookHandler(mockApi, 0);
      const messageHandler = getHookHandler(mockApi, 1);

      const spawnContent = JSON.stringify({
        status: 'accepted',
        runId: 'run-announce-123',
        childSessionKey: 'session-announce-456',
        task: 'announce task',
      });

      toolHandler({
        tool: 'sessions_spawn',
        content: spawnContent,
      });

      expect(getTrackedSubagents().has('run-announce-123')).toBe(true);

      const announceMessage = {
        content: 'Sub-agent runId: "run-announce-123" has completed',
      };

      messageHandler(announceMessage);

      expect(getTrackedSubagents().has('run-announce-123')).toBe(false);
    });

    it('ignores messages without announce keywords', () => {
      const mockApi = createMockApiAny();
      registerSubagentTracker(mockApi);

      const toolHandler = getHookHandler(mockApi, 0);
      const messageHandler = getHookHandler(mockApi, 1);

      const spawnContent = JSON.stringify({
        status: 'accepted',
        runId: 'run-ignore-123',
        childSessionKey: 'session-ignore-456',
        task: 'ignore task',
      });

      toolHandler({
        tool: 'sessions_spawn',
        content: spawnContent,
      });

      expect(getTrackedSubagents().has('run-ignore-123')).toBe(true);

      const regularMessage = {
        content: 'Just a regular message without announce keywords',
      };

      messageHandler(regularMessage);

      expect(getTrackedSubagents().has('run-ignore-123')).toBe(true);
    });
  });
});
