import type { OpenClawPluginApi } from '../types.js';
import { PLUGIN_ID } from '../types.js';
import { VERSION } from '../version.js';

export function registerStartupHook(api: OpenClawPluginApi) {
  api.registerHook(
    'gateway:startup',
    () => {
      api.logger.info(`[${PLUGIN_ID}] Gateway started — plugin v${VERSION} active`);
      return undefined;
    },
    {
      name: 'oh-my-openclaw.gateway-startup',
      description: 'Logs plugin activation on gateway startup'
    }
  );
}
