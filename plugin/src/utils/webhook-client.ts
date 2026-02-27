import { LOG_PREFIX } from '../constants.js';

export interface WebhookConfig {
  gateway_url: string;
  hooks_token: string;
}

export interface HooksAgentOptions {
  name?: string;
  agentId?: string;
  sessionKey?: string;
  deliver?: boolean;
}

export interface WebhookResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function callHooksWake(
  text: string,
  config: WebhookConfig,
  logger?: { warn: (...args: unknown[]) => void },
): Promise<WebhookResult> {
  if (!config.hooks_token) {
    return { ok: false, error: 'hooks_token not configured' };
  }

  try {
    const res = await fetch(`${config.gateway_url}/hooks/wake`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.hooks_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, mode: 'now' }),
    });

    return { ok: res.ok, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger?.warn(`${LOG_PREFIX} hooks/wake failed: ${msg}`);
    return { ok: false, error: msg };
  }
}

export async function callHooksAgent(
  message: string,
  config: WebhookConfig,
  options?: HooksAgentOptions,
  logger?: { warn: (...args: unknown[]) => void },
): Promise<WebhookResult> {
  if (!config.hooks_token) {
    return { ok: false, error: 'hooks_token not configured' };
  }

  try {
    const payload: Record<string, unknown> = {
      message,
      wakeMode: 'now',
      ...options,
    };

    const res = await fetch(`${config.gateway_url}/hooks/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.hooks_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { ok: res.ok, status: res.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger?.warn(`${LOG_PREFIX} hooks/agent failed: ${msg}`);
    return { ok: false, error: msg };
  }
}
