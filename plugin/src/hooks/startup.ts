import { OmocPluginApi, PLUGIN_ID } from '../types.js';
import { VERSION } from '../version.js';

export function registerStartupHook(api: OmocPluginApi) {
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
