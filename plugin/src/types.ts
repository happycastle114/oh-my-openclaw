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

// OmocPluginApi interface
export interface OmocPluginApi {
  config: PluginConfig;
  logger: {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
  };
  registerHook: (event: string, handler: any, meta?: any) => void;
  registerTool: (config: any) => void;
  registerCommand: (config: any) => void;
  registerService: (config: any) => void;
  registerGatewayMethod: (name: string, handler: any) => void;
}
