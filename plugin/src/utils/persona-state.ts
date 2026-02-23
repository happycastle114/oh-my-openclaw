let activePersonaId: string | null = null;

export function setActivePersona(id: string | null): void {
  activePersonaId = id;
}

export function getActivePersona(): string | null {
  return activePersonaId;
}

export function resetPersonaState(): void {
  activePersonaId = null;
}
