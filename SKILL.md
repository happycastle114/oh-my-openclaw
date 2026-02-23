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

Copy the sample config to enable agent-level tool restrictions:

```bash
cp config/openclaw.sample.json ~/.openclaw/openclaw.json
# Edit as needed for your setup
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

### `/delegate-to-omo` - Delegate to OpenCode tmux

For tasks that need deep codebase work (LSP, AST-Grep, build verification):

1. Verify opencode tmux session is running
2. Select appropriate OmO agent (Sisyphus/Hephaestus/Prometheus)
3. Send task via tmux send-keys
4. Monitor progress and collect results
5. Report back to user via messaging channel

### `tool-patterns` - OmO Tool Mapping Reference

1. Maps OmO `src/tools/*` patterns to OpenClaw-native tool usage
2. Standardizes planning/implementation/verification tool flow
3. Documents background task collection and cleanup rules

### `tmux-orchestration` - Multi-Tool tmux Orchestration

OpenCode(코딩) + Gemini CLI(멀티모달) + tmux(제어)를 연결:

1. OpenCode tmux 세션으로 코딩/빌드
2. Gemini CLI tmux 세션으로 시각적 검증 (PDF/스크린샷)
3. OpenClaw가 두 세션을 오케스트레이션하며 결과 수집/보고

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
| **gemini-look-at**  | look at, PDF, screenshot, diagram, visual | Gemini CLI 기반 멀티모달 분석. tmux gemini 세션으로 PDF/이미지/비디오 네이티브 분석.   |
| **web-search**      | web search, 웹 검색, exa, context7, grep.app | OmO 웹서치 패턴 통합. Exa/Context7/grep.app MCP + web_fetch + web-search-prime.       |

### Category + Skill Combos

| Combo              | Category           | Skills          | Effect                                                    |
| ------------------ | ------------------ | --------------- | --------------------------------------------------------- |
| **The Designer**   | visual-engineering | frontend-ui-ux  | Implements aesthetic UI with design-first approach        |
| **The Maintainer** | quick              | git-master      | Quick fixes with clean atomic commits                     |
| **The Reviewer**   | deep               | comment-checker | Deep code review with AI slop detection                   |
| **The Looker**     | visual-engineering | gemini-look-at  | Gemini CLI로 PDF/이미지/다이어그램 네이티브 멀티모달 분석 |
| **The Researcher** | quick              | web-search      | Exa/Context7/grep.app으로 웹 검색 + 코드 검색 + 문서 검색 |

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
    openclaw.sample.json # OpenClaw native agent config (tools.profile/allow/deny)
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
    delegate-to-omo.md  # Delegate to OpenCode tmux (OmO)
    tool-patterns.md    # OmO src/tools to OpenClaw usage pattern mapping
    tmux-orchestration.md # Multi-tool tmux orchestration (OpenCode + Gemini CLI)
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
