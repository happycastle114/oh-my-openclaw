import { OmocPluginApi } from '../types.js';

// Module-level state for tracking messages
let messageCount = 0;

/**
 * Registers the message monitor hook
 * Logs message events for audit purposes without modifying messages
 */
export function registerMessageMonitor(api: OmocPluginApi) {
  api.registerHook(
    'message:sent',
    (context: any) => {
      // Extract relevant info from event context
      const content = context?.content || '';
      const preview = content.substring(0, 100);
      const channelId = context?.channelId || 'unknown';
      const timestamp = new Date().toISOString();

      // Log the message event
      api.logger.info('[omoc] Message sent:', {
        preview,
        channelId,
        timestamp,
        messageCount: messageCount + 1
      });

      // Increment message counter
      messageCount++;

      // Return undefined to not modify the message
      return undefined;
    },
    {
      name: 'oh-my-openclaw.message-monitor',
      description: 'Monitors message events for audit logging'
    }
  );
}

/**
 * Returns the current message count
 * Useful for status reporting
 */
export function getMessageCount(): number {
  return messageCount;
}
