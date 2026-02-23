import { OmocPluginApi } from '../types.js';
import { getActivePersona, setActivePersona, resetPersonaState } from '../utils/persona-state.js';
import { resolvePersonaId, listPersonas, DEFAULT_PERSONA_ID } from '../agents/persona-prompts.js';

export function registerPersonaCommands(api: OmocPluginApi) {
  api.registerCommand({
    name: 'omoc',
    description: 'OmOC mode — activate, switch, or list personas',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      const args = (ctx.args ?? '').trim().toLowerCase();

      if (!args) {
        setActivePersona(DEFAULT_PERSONA_ID);
        const personas = listPersonas();
        const defaultPersona = personas.find((p) => p.id === DEFAULT_PERSONA_ID);
        const name = defaultPersona
          ? `${defaultPersona.emoji} ${defaultPersona.displayName}`
          : DEFAULT_PERSONA_ID;

        return {
          text: `# OmOC Mode: ON\n\nActive persona: **${name}**\n\nThe persona prompt will be injected into all new agent sessions.\n\nUse \`/omoc list\` to see available personas, or \`/omoc <name>\` to switch.`,
        };
      }

      if (args === 'off') {
        const wasActive = getActivePersona();
        resetPersonaState();
        return {
          text: wasActive
            ? `# OmOC Mode: OFF\n\nPersona **${wasActive}** deactivated. Agent sessions will use default behavior.`
            : '# OmOC Mode: OFF\n\nNo persona was active.',
        };
      }

      if (args === 'list') {
        const personas = listPersonas();
        const activeId = getActivePersona();
        const lines = personas.map((p) => {
          const active = p.id === activeId ? ' ← active' : '';
          return `| ${p.emoji} | \`${p.shortName}\` | ${p.displayName} | ${p.theme} |${active}`;
        });

        return {
          text: [
            '# OmOC Personas',
            '',
            `Active: ${activeId ? `**${activeId}**` : '_none_'}`,
            '',
            '| | Command | Name | Role |',
            '|---|---------|------|------|',
            ...lines,
            '',
            'Usage: `/omoc <command>` — e.g., `/omoc prometheus`',
          ].join('\n'),
        };
      }

      const resolvedId = resolvePersonaId(args);
      if (!resolvedId) {
        const personas = listPersonas();
        const available = personas.map((p) => `\`${p.shortName}\``).join(', ');
        return {
          text: `# Unknown Persona: "${args}"\n\nAvailable personas: ${available}\n\nUse \`/omoc list\` for details.`,
        };
      }

      setActivePersona(resolvedId);
      const personas = listPersonas();
      const switched = personas.find((p) => p.id === resolvedId);
      const displayName = switched
        ? `${switched.emoji} ${switched.displayName}`
        : resolvedId;

      return {
        text: `# Persona Switched\n\nActive persona: **${displayName}**\n\nThe ${switched?.theme ?? 'persona'} prompt will be injected into all new agent sessions.`,
      };
    },
  });
}
