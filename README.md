# Oh-My-OpenClaw (OmOC)

Agent orchestration framework for OpenClaw. Ports the proven oh-my-opencode (OmO) patterns into OpenClaw-native constructs.

## What is this?

OmOC brings structured multi-agent orchestration to OpenClaw:

- **Prometheus** plans your work with strategic phased plans
- **Atlas** orchestrates task distribution and verification
- **Sisyphus-Junior** executes coding tasks efficiently
- **Oracle** handles architecture decisions and debugging
- **Librarian** manages documentation and research
- **Explore** searches codebases and finds patterns

## Quick Start

```bash
# 1. Initialize workspace notepads
./scripts/init-deep.sh

# 2. Symlink to your project
ln -s $(pwd) /path/to/your/project/.opencode/skills/oh-my-openclaw

# 3. Use in OpenClaw
# /ultrawork - Full automation (plan + execute + verify)
# /plan      - Create a strategic plan only
# /start-work - Execute an existing plan
```

## Category System

Tasks are routed to optimal models based on intent:

| Category | Model | Use Case |
|----------|-------|----------|
| `quick` | claude-sonnet-4-6 | Simple fixes, searches, small tasks |
| `deep` | claude-opus-4-6-thinking | Complex refactoring, analysis |
| `ultrabrain` | claude-opus-4-5-thinking | Architecture, planning, debugging |
| `visual-engineering` | claude-opus-4-6-thinking | UI/UX, frontend work |

## Wisdom Accumulation

Learnings persist across sessions via file-based notepads:

```
workspace/notepads/
  learnings.md    - Technical discoveries
  decisions.md    - Design decisions
  issues.md       - Known issues
  preferences.md  - User conventions
```

## Architecture

```
Layer 1 (Planning)     : Prometheus -> Metis -> Momus
Layer 2 (Orchestration): Atlas
Layer 3 (Workers)      : Sisyphus-Junior, Hephaestus, Oracle, Explore, Librarian
```

## License

Private - happycastle
