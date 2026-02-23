---
name: workflow-tool-patterns
description: Workflow that maps OmO src/tools patterns to reusable execution patterns in OpenClaw
---

# Tool Patterns Workflow (OmO → OpenClaw)

Based on OmO's `src/tools/` structure, standardize tool patterns that are practically usable in OpenClaw.

## Purpose

- Reduce tool selection mistakes
- Create repeatable execution routines
- Maintain consistent planning/execution/verification phases

## Pattern Mapping

> **Important**: All "OpenClaw tools" in the table below are actual tools that exist in the official OpenClaw tool inventory.

| OmO Tool Pattern          | Intent                 | OpenClaw Tool & Usage Pattern                                      |
| ------------------------- | -------------------- | ------------------------------------------------------------------ |
| `task/*` (todo-sync)      | Track task status       | File-based todo management: update `workspace/todos.md` with `write`          |
| `lsp/*` (goto/references) | Code exploration/verification       | Run linter/type checker with `exec` tool → verify with results                     |
| `interactive-bash`        | Long-running/interactive shell   | `exec`(`pty: true`) or tmux integration                                 |
| `bash`                    | One-shot command            | `exec`(sync), `exec`(`background: true`) → `process`(`poll`)       |
| `slashcommand`            | Command workflow execution | OpenClaw skills `/ultrawork`, `/plan`, `/start_work` (slash commands) |
| `session-manager`         | Session exploration/resumption       | `sessions_list`, `sessions_history`, `session_status`              |
| `skill-mcp`               | Skill-based tool invocation  | OpenClaw skill system (`read` → refer to SKILL.md)                      |
| `look-at`                 | Multimodal analysis        | `image` tool + Gemini CLI tmux integration                                |
| `background-task`         | Parallel work            | `exec`(`background: true`) → `process`(`poll`/`log`/`kill`)        |
| `file-read/write/edit`    | File manipulation            | `read`, `write`, `edit`, `apply_patch` (`group:fs`)                |
| `web-search`              | Web search              | `web_search`, `web_fetch` (`group:web`)                            |
| `memory`                  | Knowledge accumulation            | `memory_search`, `memory_get` (`group:memory`)                     |
| `delegation`              | Sub-agent delegation    | `sessions_spawn`(`task`, `agentId`, `model`)                       |

## OpenClaw Tool Groups Summary

| Group            | Included Tools                                        | Usage                         |
| ---------------- | ------------------------------------------------ | ---------------------------- |
| `group:fs`       | read, write, edit, apply_patch                   | General file manipulation               |
| `group:runtime`  | exec, bash, process                              | Command execution + background management  |
| `group:sessions` | sessions_list/history/send/spawn, session_status | Multi-agent                |
| `group:memory`   | memory_search, memory_get                        | Knowledge search (storage is file-based) |
| `group:web`      | web_search, web_fetch                            | Web search/fetch                 |
| `group:ui`       | browser, canvas                                  | Browser/UI                  |

## Execution Procedure

### 1) Planning Phase

1. For complex tasks, create `workspace/todos.md` with `write`
2. Prioritize exploration with `exec` + grep/find
3. For external dependencies, use `web_search`/`web_fetch` or pair with librarian agent

### 2) Implementation Phase

1. Before changes, assess impact with `read` + `exec`(grep)
2. Make modifications in small units with `edit`/`apply_patch`
3. When needed, delegate to specialist agents with `sessions_spawn`

### 3) Verification Phase

1. Run linter/type checker with `exec`
2. Run related tests/build with `exec`
3. On failure, perform root-cause `edit` then re-verify

### 4) Parallel Work Management

1. Run independent exploration/research in parallel with `exec`(`background: true`)
2. Collect results with `process`(`poll`/`log`)
3. Clean up with `process`(`kill`) before final response

## Prohibitions/Cautions

- Do not change code without implementation request
- Do not report completion without verification
- Use `exec`(`pty: true`) for long-running TUI work
- Do not confirm API/patterns by manual estimation (research/evidence required)

## Checklist

- [ ] Todo status is reflected in real-time in `workspace/todos.md`
- [ ] Used tools exist in OpenClaw official tool inventory
- [ ] Evidence of test/build verification with `exec` after changes
- [ ] Background tasks cleaned up with `process`(`kill`)
