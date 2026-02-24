import { OmocPluginApi } from '../types.js';
import { getActivePersona, setActivePersona, resetPersonaState } from '../utils/persona-state.js';
import { resolvePersonaId, listPersonas, DEFAULT_PERSONA_ID } from '../agents/persona-prompts.js';

function getDisplayName(personaId: string): string {
  const persona = listPersonas().find((p) => p.id === personaId);
  return persona ? `${persona.emoji} ${persona.displayName}` : personaId;
}

export function registerPersonaCommands(api: OmocPluginApi) {
  api.registerCommand({
    name: 'omoc',
    description: 'OmOC mode — activate, switch, or list personas',
    acceptsArgs: true,
    handler: async (ctx: { args?: string }) => {
      api.logger.info(`[omoc] /omoc command received — raw ctx.args: ${JSON.stringify(ctx.args)}, ctx keys: ${JSON.stringify(Object.keys(ctx))}`);
      const args = (ctx.args ?? '').trim().toLowerCase();
      api.logger.info(`[omoc] Parsed args: "${args}" (length: ${args.length})`);

      if (!args) {
        const previousId = getActivePersona();
        setActivePersona(DEFAULT_PERSONA_ID);
        const name = getDisplayName(DEFAULT_PERSONA_ID);

        const switchNote =
          previousId && previousId !== DEFAULT_PERSONA_ID
            ? `\n\nSwitched from **${getDisplayName(previousId)}**.`
            : '';

        return {
          text: `# OmOC Mode: ON\n\nActive persona: **${name}**${switchNote}\n\nApplied immediately — your next message will use this persona.\n\nUse \`/omoc list\` to see available personas, or \`/omoc <name>\` to switch.`,
        };
      }

      if (args === 'off') {
        const wasActive = getActivePersona();
        const wasName = wasActive ? getDisplayName(wasActive) : null;
        resetPersonaState();
        return {
          text: wasName
            ? `# OmOC Mode: OFF\n\nPersona **${wasName}** deactivated. Applied immediately — your next message will use default behavior.`
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
            `Active: ${activeId ? `**${getDisplayName(activeId)}**` : '_none_'}`,
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

      const previousId = getActivePersona();
      setActivePersona(resolvedId);
      const displayName = getDisplayName(resolvedId);
      const switched = listPersonas().find((p) => p.id === resolvedId);

      const switchNote =
        previousId && previousId !== resolvedId
          ? `\n\nSwitched from **${getDisplayName(previousId)}**.`
          : '';

      return {
        text: `# Persona Switched\n\nActive persona: **${displayName}**${switchNote}\n\nApplied immediately — your next message will use the ${switched?.theme ?? 'persona'} prompt.`,
      };
    },
  });
}
