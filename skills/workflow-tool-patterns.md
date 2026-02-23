---
name: workflow-tool-patterns
description: Maps OmO src/tools patterns into reusable execution patterns for OpenClaw
---

# Tool Patterns Workflow (OmO → OpenClaw)

Standardizes tool usage patterns in OpenClaw based on OmO's `src/tools/` structure.

## Purpose

- Reduce tool selection mistakes
- Create repeatable execution routines
- Maintain consistency across planning/execution/verification phases

## Pattern Mapping

> **Important**: All "OpenClaw tools" in the table below are actual tools in the OpenClaw official tool inventory.

| OmO Tool Pattern | Intent | OpenClaw Tool & Usage Pattern |
|------------------|--------|-------------------------------|
| `task/*` (todo-sync) | Task state tracking | File-based todo management: `write` to update `workspace/todos.md` |
| `lsp/*` (goto/references) | Code exploration/verification | `exec` tool to run linters/typecheckers → verify with results |
| `interactive-bash` | Long-running/interactive shell | `exec`(`pty: true`) or tmux integration |
| `bash` | One-shot command | `exec`(sync), `exec`(`background: true`) → `process`(`poll`) |
| `slashcommand` | Trigger command workflows | OpenClaw skills `/ultrawork`, `/plan`, `/start_work` (slash commands) |
| `session-manager` | Session browse/resume | `sessions_list`, `sessions_history`, `session_status` |
| `skill-mcp` | Skill-based tool calls | OpenClaw skill system (`read` → SKILL.md reference) |
| `look-at` | Multimodal analysis | `image` tool + Gemini CLI tmux integration |
| `background-task` | Parallel tasks | `exec`(`background: true`) → `process`(`poll`/`log`/`kill`) |
| `file-read/write/edit` | File manipulation | `read`, `write`, `edit`, `apply_patch` (`group:fs`) |
| `web-search` | Web search | `web_search`, `web_fetch` (`group:web`) |
| `memory` | Knowledge accumulation | `memory_search`, `memory_get` (`group:memory`) |
| `delegation` | Sub-agent delegation | `sessions_spawn`(`task`, `agentId`, `model`) |

## OpenClaw Tool Groups

| Group | Included Tools | Usage |
|-------|---------------|-------|
| `group:fs` | read, write, edit, apply_patch | All file manipulation |
| `group:runtime` | exec, bash, process | Command execution + background management |
| `group:sessions` | sessions_list/history/send/spawn, session_status | Multi-agent |
| `group:memory` | memory_search, memory_get | Knowledge search (storage is file-based) |
| `group:web` | web_search, web_fetch | Web search/fetch |
| `group:ui` | browser, canvas | Browser/UI |

## Execution Procedure

### 1) Planning Phase

1. For complex tasks, create `workspace/todos.md` with `write`
2. Use `exec` + grep/find for exploration
3. For external dependencies, use `web_search`/`web_fetch` or librarian agent in parallel

### 2) Implementation Phase

1. Use `read` + `exec`(grep) to assess impact before changes
2. Make small-unit `edit`/`apply_patch` modifications
3. Delegate to specialized agents via `sessions_spawn` when needed

### 3) Verification Phase

1. Run linters/typecheckers with `exec`
2. Run relevant tests/builds with `exec`
3. On failure, apply cause-based `edit` and re-verify

### 4) Parallel Task Management

1. Run independent exploration/research with `exec`(`background: true`)
2. Collect results with `process`(`poll`/`log`)
3. Clean up with `process`(`kill`) before final response

## Prohibited / Caution

- Do not change code when implementation was not requested
- Do not report completion without verification
- Use `exec`(`pty: true`) for long-running TUI tasks
- Do not confirm APIs/patterns by guessing — search/evidence required

## Checklist

- [ ] Todo state reflected in real-time in `workspace/todos.md`
- [ ] All tools used exist in OpenClaw's official tool inventory
- [ ] Evidence from `exec` test/build after changes
- [ ] Background tasks cleaned up with `process`(`kill`)
