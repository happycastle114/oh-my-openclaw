import { OmocPluginApi, ToolResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';

/**
 * Wraps a registration function in try/catch with logging.
 * Logs success with category and name, logs errors with full error object.
 *
 * @param api - OmocPluginApi instance
 * @param name - Name of the component being registered (e.g., 'Todo Enforcer')
 * @param category - Category for logging (e.g., 'hook', 'tool', 'command')
 * @param fn - Registration function to execute
 */
export function safeRegister(
  api: OmocPluginApi,
  name: string,
  category: string,
  fn: () => void,
): void {
  try {
     fn();
   } catch (err) {
     api.logger.error(`${LOG_PREFIX} Failed to register ${category} ${name}:`, err);
   }
}

/**
 * Creates a standard tool response envelope with text content.
 *
 * @param text - The text content to return
 * @returns ToolResult with text wrapped in content array
 */
export function toolResponse(text: string): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Creates an error-formatted tool response.
 * Prefixes the message with "Error: " and wraps in standard envelope.
 *
 * @param message - The error message
 * @returns ToolResult with error-prefixed text
 */
export function toolError(message: string): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
  };
}
