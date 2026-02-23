// Constants
export const ABSOLUTE_MAX_RALPH_ITERATIONS = 100;
export const TOOL_PREFIX = 'omoc_';
export const PLUGIN_ID = 'oh-my-openclaw';

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

// TodoItem interface
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
}

// CommentViolation interface
export interface CommentViolation {
  file: string;
  line: number;
  content: string;
  reason: string;
}

// DelegationParams interface
export interface DelegationParams {
  task: string;
  category: string;
  agentId?: string;
  skills?: string[];
  context?: string;
}

// CategoryConfig interface
export interface CategoryConfig {
  model: string;
  description: string;
  agents?: string[];
  alternatives?: string[];
  tool?: string;
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
  execute: (params: TParams) => Promise<ToolResult>;
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
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  registerHook: <TEvent>(event: string, handler: (event: TEvent) => TEvent | void | undefined, meta?: HookMeta) => void;
  registerTool: <TParams>(config: ToolRegistration<TParams>) => void;
  registerCommand: <TCtx = { args?: string }>(config: CommandRegistration<TCtx>) => void;
  registerService: (config: ServiceRegistration) => void;
  registerGatewayMethod: (name: string, handler: () => unknown) => void;
}
