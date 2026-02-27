// Re-export constants from constants.ts for backward compatibility
export { PLUGIN_ID, TOOL_PREFIX, ABSOLUTE_MAX_RALPH_ITERATIONS, LOG_PREFIX, READ_ONLY_DENY } from './constants.js';

// PluginConfig interface
export interface PluginConfig {
  max_ralph_iterations: number;
  todo_enforcer_enabled: boolean;
  todo_enforcer_cooldown_ms: number;
  todo_enforcer_max_failures: number;
  comment_checker_enabled: boolean;
  notepad_dir: string;
  plans_dir: string;
  checkpoint_dir: string;
  tmux_socket: string;
  model_routing?: Partial<Record<string, { model: string; alternatives?: string[] }>>;
  // Webhook bridge configuration
  webhook_bridge_enabled: boolean;
  gateway_url: string;
  hooks_token: string;
  webhook_reminder_interval_ms: number;
  webhook_subagent_stale_threshold_ms: number;
}

// RalphLoopState interface
export interface RalphLoopState {
  active: boolean;
  iteration: number;
  maxIterations: number;
  taskFile: string;
  startedAt: string;
}

// CheckpointData interface
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

// CommentViolation interface
export interface CommentViolation {
  file: string;
  line: number;
  content: string;
  reason: string;
}

// Hook/Tool/Command/Service registration types
export interface HookMeta {
  name: string;
  description?: string;
}

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
}

export interface ToolRegistration<TParams = unknown> {
  name: string;
  description: string;
  parameters: unknown;
  execute: (toolCallId: string, params: TParams, options?: unknown, callback?: unknown) => Promise<ToolResult>;
  optional?: boolean;
}

export interface CommandRegistration<TCtx = { args?: string }> {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  handler: (ctx: TCtx) => { text: string } | Promise<{ text: string }>;
}

export interface ServiceRegistration {
  id: string;
  name: string;
  description?: string;
  start?: () => Promise<void>;
  stop?: () => Promise<void>;
}

// OmocPluginApi interface
export interface OmocPluginApi {
  pluginConfig?: PluginConfig;
  config: PluginConfig;
  workspaceDir?: string;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  runtime: {
    system: {
      enqueueSystemEvent: (text: string, options: { sessionKey: string; contextKey?: string | null }) => void;
    };
  };
  registerHook: <TEvent>(event: string, handler: (event: TEvent) => TEvent | void | undefined, meta?: HookMeta) => void;
  registerTool: <TParams>(config: ToolRegistration<TParams>) => void;
  registerCommand: <TCtx = { args?: string }>(config: CommandRegistration<TCtx>) => void;
  registerService: (config: ServiceRegistration) => void;
  registerGatewayMethod: (name: string, handler: () => unknown) => void;
  registerCli: (registrar: (ctx: { program: unknown; config: unknown; workspaceDir?: string; logger: OmocPluginApi['logger'] }) => void | Promise<void>, opts?: { commands?: string[] }) => void;
  on: <TEvent = unknown, TResult = unknown>(
    hookName: string,
    handler: (event: TEvent, ctx: TypedHookContext) => TResult | Promise<TResult> | void,
    opts?: { priority?: number }
  ) => void;
}

// Typed hook context provided by OpenClaw hookRunner to api.on() handlers
export interface TypedHookContext {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  workspaceDir?: string;
  messageProvider?: unknown;
}

// Result shape for before_prompt_build / before_agent_start hooks
export interface BeforePromptBuildResult {
  systemPrompt?: string;
  prependContext?: string;
}

// Event shape for before_prompt_build / before_agent_start hooks
// OpenClaw passes the current system prompt text so plugins can read/modify it
// without parsing the messages array (see attempt.ts resolvePromptBuildHookResult).
export interface BeforePromptBuildEvent {
  prompt?: string;
  messages?: unknown[];
  systemPrompt?: string;
}
