import { ToolResult } from '../types.js';

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
