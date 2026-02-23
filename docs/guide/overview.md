# Overview

**Multi-agent orchestration for OpenClaw — structured, verified, relentless.**

---

## What is Oh-My-OpenClaw?

Oh-My-OpenClaw (OhMyClaw) is a multi-agent orchestration framework built for [OpenClaw](https://openclaw.dev).

It ports the battle-tested OmO (Oh-My-OpenCode) agent patterns into the OpenClaw ecosystem — bringing structured planning, layered execution, and mandatory verification to every task.

OpenClaw is not just another AI assistant. It supports:

- **Discord** — slash commands, thread-based workflows
- **Telegram** — bot integration, inline queries
- **Web** — browser-based chat interface
- **Browser control** — Playwright-powered automation
- **Multi-device** — synchronized sessions across clients

OhMyClaw gives all of that a backbone. Without structure, multi-platform AI is just noise.

---

## The Problem

AI agents fail in predictable ways.

**Cognitive drift.** Without a plan, agents wander. Each response forgets the last. Work accumulates without direction.

**Incomplete work.** Tasks start. Tasks don't finish. No one checks.

**No verification.** Code gets written. Builds don't run. Diagnostics go unchecked. Bugs ship.

**Context overload.** Long sessions bloat. The model loses the thread. Quality degrades.

These aren't model problems. They're architecture problems. And architecture can be fixed.

---

## The Solution: 3-Layer Architecture

OhMyClaw enforces a strict three-layer execution model. Every task flows through all three layers.

### Layer 1: Planning

Planning agents think before acting. They decompose, scope, and structure work.

| Agent | Role |
|-------|------|
| **Prometheus** | Strategic planner. Breaks goals into executable plans. |
| **Metis** | Tactical analyst. Validates plans, identifies risks. |
| **Momus** | Critic. Challenges assumptions. Prevents overconfidence. |

No task reaches execution without passing through planning.

### Layer 2: Orchestration

One agent coordinates everything.

| Agent | Role |
|-------|------|
| **Atlas** | Orchestrator. Dispatches workers, tracks progress, enforces completion. |

Atlas holds the plan. Atlas verifies the output. Atlas does not do the work itself.

### Layer 3: Workers

Workers execute. Each is specialized. None is general-purpose.

| Agent | Specialty |
|-------|-----------|
| **Sisyphus-Junior** | General execution. Moderate-effort tasks. The workhorse. |
| **Hephaestus** | Build systems, tooling, infrastructure. |
| **Oracle** | Research, analysis, knowledge retrieval. |
| **Explore** | Codebase exploration, file discovery, structure mapping. |
| **Librarian** | Documentation, session history, knowledge management. |
| **Multimodal Looker** | Image analysis, PDF extraction, visual interpretation. |

Workers report back to Atlas. Atlas verifies. The loop closes.

---

## How It Works

The `/ultrawork` command triggers the full orchestration pipeline.

**Step 1 — Decompose.**
Prometheus receives the goal. It produces a structured plan: phases, tasks, success criteria.

**Step 2 — Validate.**
Metis reviews the plan. Momus challenges it. Gaps get filled before execution starts.

**Step 3 — Dispatch.**
Atlas receives the validated plan. It selects the right worker for each task and dispatches in order.

**Step 4 — Execute.**
Workers run their tasks. Each worker follows its category discipline: todos, verification, diagnostics.

**Step 5 — Verify.**
After each task, Atlas checks:
- LSP diagnostics clean?
- Build passing?
- Todos completed?

**Step 6 — Iterate.**
Failed verification triggers re-execution, not abandonment. The loop runs until the work is done.

**Step 7 — Report.**
Atlas produces a completion summary. What was done. What was verified. What remains.

No step is optional. No verification is skipped.

---

## Key Differences from OmO

OhMyClaw is a port of OmO patterns, not a copy. The platform changes everything.

| Dimension | OmO (OpenCode) | OhMyClaw (OpenClaw) |
|-----------|---------------|---------------------|
| **Platform** | CLI / terminal | Discord, Telegram, Web, multi-device |
| **Format** | Markdown agents + skills | TypeScript plugin (5 hooks, 3 tools, 8 commands, 1 service) |
| **Channels** | Single session | Multi-channel, multi-client |
| **Multimodal** | Text + file analysis | Text + images + browser control + PDFs |
| **Memory** | Session-scoped | Cross-session via Librarian agent |

The agent names are the same. The discipline is the same. The execution environment is entirely different.

OhMyClaw adapts the patterns — it does not blindly copy them.

---

## Quick Start
Get running in two steps.

**1. Install the plugin.**

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

**2. Start working.**

Open your OpenClaw client (Discord, Telegram, or Web) and run:

```
/ultrawork Your task description here
```

The orchestration pipeline starts immediately. Prometheus plans. Atlas dispatches. Workers execute.

---

## Plugin Structure

OhMyClaw ships as a single TypeScript plugin: `@happycastle/oh-my-openclaw@0.5.0`

The plugin registers:

- **5 hooks** — lifecycle integration with OpenClaw events (`agent:bootstrap`, `tool_result_persist`, `message:sent`, `message:received`, `gateway:startup`)
- **3 tools** — utilities available to all agents
- **8 commands** — workflow, ralph_loop, status, health, and config commands
- **1 service** — background orchestration service

10 markdown agent definitions and 13 skill docs ship alongside the plugin. 7 workflow templates cover the most common task patterns.

---

## Further Reading

- [Installation](./installation.md) — detailed setup, configuration, environment variables
- [Orchestration](./orchestration.md) — deep dive into Atlas, the dispatch loop, and verification
- [Features Reference](../reference/features.md) — complete list of commands, tools, hooks, and agents
- [Similarity to OmO](../SIMILARITY.md) — what was ported, what was adapted, what was left behind
