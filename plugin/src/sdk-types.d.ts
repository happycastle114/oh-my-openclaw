// SDK 类型声明 - 帮助 TypeScript 解析 openclaw/plugin-sdk 模块
// 这个文件是必需的，因为 SDK 的类型导出路径比较复杂

declare module 'openclaw/plugin-sdk' {
  // 核心 API 类型
  export type { OpenClawPluginApi } from './src/plugins/types.js';
  export type { OpenClawConfig } from './src/config/config.js';
  export type { PluginLogger } from './src/plugins/types.js';
  export type { PluginRuntime } from './src/plugins/runtime/types.js';
  
  // Hook 相关类型
  export type { InternalHookHandler } from './src/hooks/types.js';
  export type { OpenClawPluginHookOptions } from './src/plugins/types.js';
  export type { OpenClawPluginToolOptions } from './src/plugins/types.js';
  export type { AnyAgentTool } from './src/plugins/types.js';
  
  // Hook 事件和结果类型
  export type { PluginHookName } from './src/hooks/types.js';
  export type { PluginHookHandlerMap } from './src/hooks/types.js';
  export type { PluginHookBeforePromptBuildEvent, PluginHookBeforePromptBuildResult } from './src/hooks/types.js';
  export type { PluginHookAgentEndEvent } from './src/hooks/types.js';
  export type { PluginHookSessionStartEvent, PluginHookSessionEndEvent } from './src/hooks/types.js';
  export type { PluginHookBeforeToolCallEvent, PluginHookBeforeToolCallResult } from './src/hooks/types.js';
  export type { PluginHookToolResultPersistEvent } from './src/hooks/types.js';
  export type { PluginHookMessageReceivedEvent } from './src/hooks/types.js';
  export type { PluginHookSubagentEndedEvent } from './src/hooks/types.js';
}
