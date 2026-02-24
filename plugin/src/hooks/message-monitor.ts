import { OmocPluginApi } from '../types.js';
import { LOG_PREFIX } from '../constants.js';

interface MessageContext {
  content?: string;
  channelId?: string;
}

const MAX_MESSAGE_COUNTS = 1000;
const messageCounts = new Map<string, number>();

/**
 * Registers the message monitor hook
 * Logs message events for audit purposes without modifying messages
 */
export function registerMessageMonitor(api: OmocPluginApi) {
  api.registerHook(
    'message:sent',
    (context: MessageContext) => {
      // Extract relevant info from event context
      const content = context?.content || '';
      const preview = content.substring(0, 100);
      const channelId = context?.channelId || 'unknown';
      const timestamp = new Date().toISOString();
      const currentCount = messageCounts.get(channelId) ?? 0;
      const nextCount = currentCount + 1;
      messageCounts.set(channelId, nextCount);

      // Enforce max size limit with LRU eviction
      if (messageCounts.size > MAX_MESSAGE_COUNTS) {
        const oldestKey = messageCounts.keys().next().value;
        if (oldestKey !== undefined) {
          messageCounts.delete(oldestKey);
        }
      }

       // Log the message event
       api.logger.info(`${LOG_PREFIX} Message sent:`, {
         preview,
         channelId,
         timestamp,
         messageCount: nextCount
       });

      // Return context unchanged to allow event propagation
      return context;
    },
    {
      name: 'oh-my-openclaw.message-monitor',
      description: 'Monitors message events for audit logging'
    }
  );

  api.registerHook(
    'message:received',
    (context: MessageContext) => {
       const content = context?.content || '';
       const preview = content.substring(0, 100);
       const channelId = context?.channelId || 'unknown';
       api.logger.info(`${LOG_PREFIX} Message received:`, { preview, channelId });
      return context;
    },
    {
      name: 'oh-my-openclaw.message-received-monitor',
      description: 'Monitors inbound message events for audit logging'
    }
  );
}

/**
 * Returns the current message count
 * Useful for status reporting
 */
export function getMessageCount(channelId?: string): number {
  if (channelId) {
    return messageCounts.get(channelId) ?? 0;
  }

  let total = 0;
  for (const count of messageCounts.values()) {
    total += count;
  }
  return total;
}
