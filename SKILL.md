---
name: oh-my-openclaw
description: Agent orchestration framework for OpenClaw - ports oh-my-opencode patterns (Prometheus planner, Atlas orchestrator, Sisyphus executor) into OpenClaw-native constructs with category-based model routing, wisdom accumulation, and automated task completion loops.
---

# Oh-My-OpenClaw (OmOC)

> Agent orchestration skill that brings structured planning, execution, and knowledge accumulation to OpenClaw.

## Overview

Oh-My-OpenClaw ports the proven patterns from oh-my-opencode into OpenClaw-native constructs:

- **3-Layer Agent Architecture**: Planning (Prometheus/Metis/Momus) -> Orchestration (Atlas) -> Execution (Sisyphus-Junior/Hephaestus/Oracle/Explore/Librarian)
- **Native Multi-Agent**: Uses OpenClaw `sessions_spawn` for real sub-agent sessions (not just role-switching)
- **Category System**: Intent-based model routing (quick/deep/ultrabrain/visual-engineering)
- **Wisdom Accumulation**: File-based notepad system for persistent learnings across sessions
- **Ultrawork Mode**: One-command full automation from planning to verified completion
- **Todo Enforcer**: System prompt injection ensuring forced task completion
- **Tool Restriction**: Native OpenClaw `agents.list[].tools.profile/allow/deny` for per-agent access control

## Installation

### Option 1: Workspace Skill (Recommended)

```bash
# Symlink into your OpenClaw workspace skills directory
# Workspace skills are per-agent and have highest precedence
ln -s "$(pwd)" <workspace>/skills/oh-my-openclaw
```

### Option 2: Shared Skill (All Agents)

```bash
# Available to all agents on this machine
# Second precedence after workspace skills
ln -s "$(pwd)" ~/.openclaw/skills/oh-my-openclaw
```

### Option 3: Extra Dirs (via config)

Add to `~/.openclaw/openclaw.json`:

```json
{ "skills": { "load": { "extraDirs": ["/path/to/oh-my-openclaw"] } } }
```

### Option 4: Clone from GitHub

```bash
gh repo clone happycastle114/oh-my-openclaw ~/.openclaw/skills/oh-my-openclaw
```

### Agent Tool Restrictions

Inject agent configs into your OpenClaw config for sub-agent spawning:

```bash
openclaw omoc-setup
# Use --force to overwrite existing, --dry-run to preview
```

### Verify Installation

The skill should appear in OpenClaw's available skills list. Test by asking:

> "Read the oh-my-openclaw skill and tell me what it does"

## Trigger

This skill activates when:

- User invokes `/ultrawork`, `/plan`, or `/start_work` commands
- User requests complex multi-step task planning
- User asks for agent orchestration or delegation

## Architecture

### Layer 1: Planning

| Agent          | Role                                                       | Model Category |
| -------------- | ---------------------------------------------------------- | -------------- |
| **Prometheus** | Strategic planner - interviews user, creates phased plans  | ultrabrain     |
| **Metis**      | Gap analyzer - identifies missing context before execution | deep           |
| **Momus**      | Plan reviewer - critiques and improves plans               | deep           |

### Layer 2: Orchestration

| Agent     | Role                                                                       | Model Category |
| --------- | -------------------------------------------------------------------------- | -------------- |
| **Atlas** | Task distributor - breaks plan into delegatable units, verifies completion | ultrabrain     |

### Layer 3: Workers

| Agent                 | Role                                                           | Model Category     |
| --------------------- | -------------------------------------------------------------- | ------------------ |
| **Sisyphus-Junior**   | Primary coder - implements features, fixes bugs                | quick              |
| **Hephaestus**        | Deep worker - complex refactoring, architecture changes        | deep               |
| **Oracle**            | Architect/debugger - design decisions, root cause analysis     | ultrabrain         |
| **Explore**           | Search specialist - codebase exploration, pattern finding      | quick              |
| **Librarian**         | Documentation specialist - docs, research, knowledge retrieval | quick              |
| **Multimodal Looker** | Visual analyst - screenshots, UI review, PDF quality check     | visual-engineering |

### Category-to-Model Mapping

Categories map user intent to optimal model selection:

```json
{
  "quick": "claude-sonnet-4-6",
  "deep": "claude-opus-4-6-thinking",
  "ultrabrain": "gpt-5.3-codex",
  "visual-engineering": "claude-opus-4-6-thinking"
}
```

## Workflows

### `/ultrawork` - Full Automation Loop

1. Prometheus creates a strategic plan via user interview
2. Momus reviews and critiques the plan
3. Atlas breaks plan into executable tasks
4. Workers execute tasks with Todo tracking
5. Atlas verifies completion of each task
6. Loop continues until all tasks are done

### `/plan` - Planning Only

1. Prometheus interviews user about the task
2. Creates a phased plan saved to `workspace/plans/`
3. Momus reviews the plan
4. Returns refined plan for user approval

### `/start_work` - Execute Existing Plan

1. Reads plan from `workspace/plans/`
2. Atlas distributes tasks to appropriate workers
3. Workers execute with Todo tracking
4. Verification loop until completion

### tmux/OmO Delegation (Skills)

Coding delegation and multi-session orchestration are handled by dedicated skills (loaded automatically):

| Skill | Purpose |
|-------|---------|
| `opencode-controller` | Delegate to OpenCode/OmO via tmux (session mgmt, agent switching, task templates) |
| `tmux` | Multi-session tmux orchestration (parallel coding + verification) |
| `tmux-agents` | Spawn/monitor coding agents (Claude, Codex, Gemini, Ollama) in tmux |
| `workflow-tool-patterns` | OmO tool → OpenClaw tool mapping reference |
| `workflow-auto-rescue` | Checkpoint-based failure recovery |

## Wisdom Accumulation

The notepad system persists learnings across sessions:

```
workspace/notepads/
  learnings.md    - Technical discoveries and patterns
  decisions.md    - Architecture and design decisions made
  issues.md       - Known issues and workarounds
  preferences.md  - User preferences and conventions
```

### How It Works

- Workers automatically append discoveries to relevant notepads
- Planning agents read notepads before creating plans
- Notepads survive across sessions (file-based persistence)
- Each entry is timestamped and tagged with source context

## Todo Enforcer

System prompt injection that ensures task completion:

```
[SYSTEM DIRECTIVE: OH-MY-OPENCLAW - TODO CONTINUATION]
You MUST continue working on incomplete todos.
- Do NOT stop until all tasks are marked complete
- Do NOT ask for permission to continue
- Mark each task complete immediately when finished
- If blocked, document the blocker and move to next task
```

## Ralph Loop

Self-referential completion mechanism:

1. After completing a task batch, agent reviews remaining todos
2. If incomplete items exist, agent continues without user intervention
3. Loop terminates only when all todos are complete or explicitly cancelled
4. Maximum iterations configurable (default: 10)

## Built-in Skills

Skills inject specialized knowledge and workflows into agents. Load them via `load_skills` when delegating tasks.

| Skill               | Trigger Keywords                          | Description                                                                            |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| **git-master**      | commit, rebase, squash, blame             | Atomic commits, rebase surgery, history archaeology. Auto-detects commit style.        |
| **frontend-ui-ux**  | UI, UX, frontend, design, CSS             | Designer-turned-developer. Bold aesthetics, distinctive typography, cohesive palettes. |
| **comment-checker** | comment check, AI slop, code quality      | Anti-AI-slop guard. Removes obvious comments, keeps WHY comments.                      |
| **gemini-look-at**  | look at, PDF, screenshot, diagram, visual | Gemini CLI multimodal analysis. Native PDF/image/video analysis via tmux gemini session. |
| **web-search**      | web search, exa, context7, grep.app | OmO web search pattern integration. Exa/Context7/grep.app MCP + web_fetch + web-search-prime. |

### Category + Skill Combos

| Combo              | Category           | Skills          | Effect                                                    |
| ------------------ | ------------------ | --------------- | --------------------------------------------------------- |
| **The Designer**   | visual-engineering | frontend-ui-ux  | Implements aesthetic UI with design-first approach        |
| **The Maintainer** | quick              | git-master      | Quick fixes with clean atomic commits                     |
| **The Reviewer**   | deep               | comment-checker | Deep code review with AI slop detection                   |
| **The Looker**     | visual-engineering | gemini-look-at  | Native multimodal analysis of PDF/image/diagram via Gemini CLI |
| **The Researcher** | quick              | web-search      | Web search + code search + docs search via Exa/Context7/grep.app |

## Quick Setup

Run the setup script to install as an OpenClaw skill + initialize notepad structure:

```bash
bash /home/happycastle/Projects/oh-my-openclaw/scripts/setup.sh
```

## File Structure

```
oh-my-openclaw/
  SKILL.md              # This file - main skill instructions
  README.md             # Project documentation
  config/
    categories.json     # Category-to-model mapping + tool restrictions + skill triggers
  agents/
    prometheus.md       # Strategic planner agent profile
    metis.md            # Pre-planning consultant (intent classification + anti-slop directives)
    momus.md            # Practical plan reviewer (critical blocker checks)
    atlas.md            # Task orchestrator agent profile
    sisyphus-junior.md  # Primary worker agent profile
    hephaestus.md       # Autonomous deep worker for complex execution
    oracle.md           # Architect/debugger agent profile
    librarian.md        # Documentation specialist agent profile
    explore.md          # Search specialist agent profile
    multimodal-looker.md # Visual analysis agent profile
  skills/
    git-master.md       # Git expert skill (commits, rebase, history)
    frontend-ui-ux.md   # Design-first UI development skill
    comment-checker.md  # Anti-AI-slop code quality skill
    gemini-look-at.md   # Gemini CLI multimodal analysis (PDF/image/video)
    web-search.md       # Web search integration (Exa/Context7/grep.app MCP)
  workflows/
    ultrawork.md        # Full automation workflow
    plan.md             # Planning-only workflow
    start-work.md       # Execute existing plan workflow
  scripts/
    setup.sh            # One-command install + notepad initialization
    init-deep.sh        # Generate hierarchical AGENTS.md files
```

## Usage Examples

### Quick Task

```
User: Fix the type error in auth.ts
Agent: [Uses Sisyphus-Junior directly - category: quick]
```

### Complex Feature

```
User: /ultrawork Add user authentication with OAuth2
Agent: [Prometheus plans -> Momus reviews -> Atlas distributes -> Workers execute]
```

### Research Task

```
User: /plan Research the best approach for real-time notifications
Agent: [Prometheus + Librarian + Oracle collaborate on research plan]
```
