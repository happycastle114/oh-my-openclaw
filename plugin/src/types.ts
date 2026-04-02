// Oh-My-OpenClaw Plugin Types
// 完全使用 OpenClaw Plugin SDK 类型导入

// ============================================================================
// SDK 类型导入（完全使用新 SDK）
// ============================================================================

import type {
  OpenClawPluginApi as SDKOpenClawPluginApi,
  OpenClawConfig as SDKOpenClawConfig,
  PluginLogger as SDKPluginLogger,
  PluginRuntime as SDKPluginRuntime,
  PluginHookName,
  PluginHookHandlerMap,
  PluginHookBeforePromptBuildEvent,
  PluginHookBeforePromptBuildResult,
  PluginHookAgentEndEvent,
  PluginHookSessionStartEvent,
  PluginHookSessionEndEvent,
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookToolResultPersistEvent,
  PluginHookMessageReceivedEvent,
  PluginHookSubagentEndedEvent,
  InternalHookHandler,
  OpenClawPluginHookOptions,
  OpenClawPluginToolOptions,
  AnyAgentTool,
} from 'openclaw/plugin-sdk';

// Re-export SDK types
export type {
  SDKOpenClawPluginApi as OpenClawPluginApi,
  SDKOpenClawConfig as OpenClawConfig,
  SDKPluginLogger as PluginLogger,
  SDKPluginRuntime as PluginRuntime,
  PluginHookName,
  PluginHookHandlerMap,
  PluginHookBeforePromptBuildEvent,
  PluginHookBeforePromptBuildResult,
  PluginHookAgentEndEvent,
  PluginHookSessionStartEvent,
  PluginHookSessionEndEvent,
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookToolResultPersistEvent,
  PluginHookMessageReceivedEvent,
  PluginHookSubagentEndedEvent,
  InternalHookHandler,
  OpenClawPluginHookOptions,
  OpenClawPluginToolOptions,
  AnyAgentTool,
};

// Re-export constants
export { PLUGIN_ID, TOOL_PREFIX, ABSOLUTE_MAX_RALPH_ITERATIONS, LOG_PREFIX, READ_ONLY_DENY } from './constants.js';

// ============================================================================
// 项目特定类型（Oh-My-OpenClaw 专用）
// ============================================================================

/** PluginConfig */
export interface PluginConfig {
  max_ralph_iterations: number;
  todo_enforcer_enabled: boolean;
  todo_enforcer_cooldown_ms: number;
  todo_enforcer_max_failures: number;
  comment_checker_enabled: boolean;
  checkpoint_dir: string;
  model_routing?: Record<string, { model: string; alternatives?: string[] }>;
  webhook_bridge_enabled: boolean;
  gateway_url: string;
  hooks_token: string;
  webhook_reminder_interval_ms: number;
  webhook_subagent_stale_threshold_ms: number;
}

/** RalphLoopState */
export interface RalphLoopState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  taskFile: string;
  startedAt: string;
}

/** CheckpointData */
export interface CheckpointData {
  type: 'session-checkpoint';
  session_id: string;
  task: string;
  step: string;
  changed_files: string[];
  verification: {
    diagnostics: 'pass' | 'fail' | 'not-run';
    tests: 'pass' | 'fail' | 'not-run';
    build: 'pass' | 'fail' | 'not-run';
  };
  next_action: string;
  timestamp: string;
}

/** CommentViolation */
export interface CommentViolation {
  file: string;
  line: number;
  content: string;
  reason: string;
}

/** HookMeta */
export interface HookMeta {
  name?: string;
  description?: string;
  priority?: number;
}

/** ToolResult */
export interface ToolResult {
  content: Array<{ type: string; text: string }>;
}

/** ServiceContext */
export interface ServiceContext {
  config: SDKOpenClawConfig;
  workspaceDir?: string;
  stateDir: string;
  logger: SDKPluginLogger;
}

/** ServiceRegistration */
export interface ServiceRegistration {
  id: string;
  start: (ctx: ServiceContext) => void | Promise<void>;
  stop?: (ctx: ServiceContext) => void | Promise<void>;
}

// ============================================================================
// 配置辅助函数
// ============================================================================

export function getPluginConfig(api: SDKOpenClawPluginApi): PluginConfig {
  const defaults: PluginConfig = {
    max_ralph_iterations: 10,
    todo_enforcer_enabled: false,
    todo_enforcer_cooldown_ms: 2000,
    todo_enforcer_max_failures: 5,
    comment_checker_enabled: true,
    checkpoint_dir: api.workspaceDir ? `${api.workspaceDir}/checkpoints` : './checkpoints',
    webhook_bridge_enabled: false,
    gateway_url: process.env.OPENCLAW_GATEWAY_URL ?? 'http://127.0.0.1:18789',
    hooks_token: process.env.OPENCLAW_HOOKS_TOKEN ?? '',
    webhook_reminder_interval_ms: 300000,
    webhook_subagent_stale_threshold_ms: 600000,
  };

  const coreConfig = api.config as Partial<PluginConfig> | undefined;
  const pluginConfig = api.pluginConfig as Partial<PluginConfig> | undefined;

  const config = {
    ...defaults,
    ...coreConfig,
    ...pluginConfig,
  };

  // Clamp values to valid ranges
  config.max_ralph_iterations = Math.max(0, Math.min(config.max_ralph_iterations, 100));
  config.todo_enforcer_cooldown_ms = Math.max(0, config.todo_enforcer_cooldown_ms);
  config.todo_enforcer_max_failures = Math.max(0, config.todo_enforcer_max_failures);

  return config;
}
