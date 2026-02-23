<div align="center">

# Oh-My-OpenClaw (OmOC)

![GitHub release](https://img.shields.io/github/v/release/happycastle114/oh-my-openclaw)
![npm](https://img.shields.io/npm/v/@happycastle/oh-my-openclaw)
![license](https://img.shields.io/github/license/happycastle114/oh-my-openclaw)

**Install. Type `/ultrawork`. Done.**

Agent orchestration for [OpenClaw](https://openclaw.ai) — brought to you by the patterns that made [OmO](https://github.com/code-yeongyu/oh-my-opencode) unstoppable.

[English](#installation) | [한국어](#한국어-설치-가이드)

</div>

---

## Skip This README
For the impatient:

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

Or the manual way:

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git
ln -s "$(pwd)/oh-my-openclaw" ~/.openclaw/workspace/skills/oh-my-openclaw
bash oh-my-openclaw/scripts/init-deep.sh
```
Now open your messaging channel and type `/ultrawork`. You're done.

---

## What is This?

OmO-style multi-agent orchestration for OpenClaw. Your AI agent gets 10 specialized personas, category-based model routing, and self-correcting execution loops — all through Discord, Telegram, or any messaging channel OpenClaw supports.

---

## Features

| Feature | What It Does |
|---------|-------------|
| **3-Layer Architecture** | Planning → Orchestration → Execution → Verification. No shortcuts. |
| **Category Routing** | Auto-selects the best model per task — quick, deep, ultrabrain, or visual. |
| **Ultrawork Mode** | One command. Full planning-to-verification pipeline. `/ultrawork` and walk away. |
| **Ralph Loop** | Self-correcting execution. Never stops halfway. Hard cap at 100 iterations. |
| **Todo Enforcer** | Forces task completion. No "I'm done" lies. Every step tracked. |
| **Comment Checker** | 11 regex patterns detect and kill AI slop comments on sight. |
| **Gemini CLI** | Native multimodal — PDF, images, video analysis via tmux integration. |
| **OmO Delegation** | Route coding tasks to OpenCode running in tmux. Full OmO power. |
| **Checkpoints** | Save/load execution state. Crash recovery. Pick up where you left off. |
| **10 Agents** | Specialized team: planners, workers, reviewers. Each with a job. |
| **8 Skills** | git-master, frontend-ui-ux, comment-checker, multimodal, and more. |
| **3 Workflow Commands** | `/ultrawork`, `/plan`, `/start-work` — executable pipelines. |
| **4 Reference Skills** | delegate-to-omo, tmux-orchestration, tool-patterns, auto-rescue — guidance docs. |

---

## Agent Personas

These aren't generic "assistant" prompts. Each agent has a personality and a mandate.

| Agent | Personality |
|-------|------------|
| **Atlas** | The conductor. Doesn't play instruments. Ensures perfect harmony. |
| **Prometheus** | The interviewer. Won't let you start until you know what you want. |
| **Sisyphus-Junior** | The workhorse. Focused. Disciplined. Doesn't stop until done. |
| **Oracle** | The architect. Read-only. Expensive. Worth every token. |
| **Hephaestus** | The craftsman. Give him a hard problem, come back in an hour. |
| **Metis** | The gap-finder. Spots what everyone else missed. |
| **Momus** | The critic. Your plan has holes — Momus will find them. |
| **Explore** | The scout. Knows where everything is in the codebase. |
| **Librarian** | The researcher. Docs, knowledge, context — on demand. |
| **Multimodal Looker** | The eye. Screenshots, PDFs, UI reviews — sees what text can't. |

---

## Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running (gateway mode)
- A messaging channel configured (Discord, Telegram, etc.)
- *(Optional)* [OpenCode](https://opencode.ai) — for coding delegation
- *(Optional)* [Gemini CLI](https://ai.google.dev/) — for multimodal analysis

## Installation
### Option 1: Official Plugin Install (Recommended)

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

One command. Skills, hooks, tools — all registered automatically.

### Option 2: Clone + Symlink

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git
cd oh-my-openclaw
ln -s "$(pwd)" ~/.openclaw/workspace/skills/oh-my-openclaw
bash scripts/init-deep.sh
```

### Option 3: Direct Clone into Skills

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git \
  ~/.openclaw/workspace/skills/oh-my-openclaw
bash ~/.openclaw/workspace/skills/oh-my-openclaw/scripts/init-deep.sh
```

### Option 4: Global Skill

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git \
  ~/.openclaw/skills/oh-my-openclaw
```

### Verify

Send this to your OpenClaw agent:

> "Read the oh-my-openclaw skill and tell me what it does"

If it responds with a description, you're good.

---

## Configuration

Everything lives in `config/categories.json`. One file. All the knobs.

### Model Routing

Each category maps to a model. Swap anytime:

```json
{
  "categories": {
    "quick": {
      "model": "claude-sonnet-4-6",
      "alternatives": ["gpt-5.3-codex-spark", "gemini-3-flash"]
    },
    "deep": {
      "model": "claude-opus-4-6-thinking",
      "alternatives": ["gpt-5.3-codex", "gemini-3.1-pro"]
    },
    "ultrabrain": {
      "model": "gpt-5.3-codex",
      "alternatives": ["claude-opus-4-6-thinking"]
    },
    "visual-engineering": {
      "model": "gemini-3.1-pro",
      "alternatives": ["claude-opus-4-6-thinking"]
    }
  }
}
```

Edit the `"model"` field. Done. `"alternatives"` shows what else works.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      OpenClaw Agent                       │
│                    (Main Orchestrator)                     │
├──────────┬───────────┬────────────────┬──────────────────┤
│  Discord │ Telegram  │    Browser     │  Node Devices    │
│  Channel │   Bot     │   Control      │  (Camera, etc.)  │
└────┬─────┴─────┬─────┴────────┬───────┴──────┬───────────┘
     │           │              │              │
     ▼           ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              oh-my-openclaw Skill Layer                   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Layer 1: PLANNING                          │ │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │ Prometheus  │ │  Metis   │ │  Momus   │          │ │
│  │  │ (Planner)   │ │ (Gaps)   │ │ (Review) │          │ │
│  │  └─────┬──────┘ └────┬─────┘ └────┬─────┘          │ │
│  ├────────┼─────────────┼────────────┼─────────────────┤ │
│  │        ▼             ▼            ▼                  │ │
│  │           Layer 2: ORCHESTRATION                     │ │
│  │  ┌──────────────────────────────────────────┐       │ │
│  │  │              Atlas                        │       │ │
│  │  │   (Task Distribution + Verification)      │       │ │
│  │  └────┬────┬────┬────┬────┬────┬────────────┘       │ │
│  ├───────┼────┼────┼────┼────┼────┼────────────────────┤ │
│  │       ▼    ▼    ▼    ▼    ▼    ▼                     │ │
│  │           Layer 3: WORKERS                           │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │ │
│  │  │Sissy │ │Hepha │ │Oracle│ │Explo │ │Librarian │ │ │
│  │  │Junior│ │estus │ │      │ │re    │ │          │ │ │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────────┘ │ │
│  │                    ┌──────────────┐                  │ │
│  │                    │ Multimodal   │                  │ │
│  │                    │ Looker       │                  │ │
│  │                    └──────────────┘                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │  tmux: opencode  │    │  tmux: gemini               │  │
│  │  (OmO Coding)    │    │  (Multimodal Analysis)      │  │
│  └─────────────────┘    └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Category → Model Mapping

| Category | Default Model | Alternatives | Use Case |
|----------|--------------|-------------|----------|
| `quick` | Claude Sonnet 4.6 | GPT 5.3 Spark, Gemini 3 Flash | Simple fixes, searches |
| `deep` | Claude Opus 4.6 | GPT 5.3 Codex, Gemini 3.1 Pro | Complex refactoring |
| `ultrabrain` | GPT 5.3 Codex | Claude Opus 4.6, Gemini 3.1 Pro High | Architecture decisions |
| `visual-engineering` | Gemini 3.1 Pro | Claude Opus 4.6 | UI/UX, visual analysis |
| `multimodal` | Gemini 2.5 Flash | Gemini 3.1 Pro | PDF/image/video via CLI |

### Agent Roles

| Layer | Agent | Role | Category |
|-------|-------|------|----------|
| **Planning** | **Prometheus** | Strategic planner — interviews, creates phased plans | ultrabrain |
| | **Metis** | Gap analyzer — finds missing context before execution | deep |
| | **Momus** | Plan reviewer — critiques and surfaces blockers | deep |
| **Orchestration** | **Atlas** | Task distributor — breaks plans into units, verifies | ultrabrain |
| **Workers** | **Sisyphus-Junior** | Primary coder — quick implementations, bug fixes | quick |
| | **Hephaestus** | Deep worker — complex refactoring, architecture | deep |
| | **Oracle** | Architect — design decisions, root cause analysis | ultrabrain |
| | **Explore** | Search specialist — codebase exploration | quick |
| | **Librarian** | Docs and research — knowledge retrieval | quick |
| | **Multimodal Looker** | Visual analyst — screenshots, UI, PDF review | visual-engineering |

### Skills

| Skill | Triggers | Description |
|-------|----------|-------------|
| `git-master` | commit, rebase, squash, blame | Atomic commits, rebase surgery |
| `frontend-ui-ux` | UI, UX, frontend, design, CSS | Design-first UI development |
| `comment-checker` | comment check, AI slop | Anti-AI-slop quality guard |
| `gemini-look-at` | look at, PDF, screenshot | Gemini CLI multimodal analysis |
| `steering-words` | ultrawork, search, analyze | Keyword detection, mode routing |
| `delegation-prompt` | delegate, sub-agent | 7-element delegation prompt guide |
| `multimodal-analysis` | multimodal, image analysis | Analysis pattern templates |
| `web-search` | web search, 웹 검색, exa, context7 | OmO websearch MCP 통합 (Exa + Context7 + grep.app) |

### Workflow Commands

| Workflow | Command | What Happens |
|----------|---------|-------------|
| `ultrawork` | `/ultrawork` | Full planning → execution → verification |
| `plan` | `/plan` | Planning only (Prometheus + Momus) |
| `start-work` | `/start-work` | Execute an existing plan |

### Reference Skills

These are guidance documents, not executable commands. They inform agent behavior.

| Skill | Purpose |
|-------|---------|
| `delegate-to-omo` | How to route coding tasks to OpenCode in tmux |
| `tmux-orchestration` | Patterns for coordinating OpenCode + Gemini CLI sessions |
| `tool-patterns` | OmO tool → OpenClaw tool mapping reference |
| `auto-rescue` | Checkpoint + failure recovery patterns |

---

## OmO vs Oh-My-OpenClaw

Same DNA. Different runtime.

| Aspect | OmO (Oh-My-OpenCode) | Oh-My-OpenClaw |
|--------|---------------------|----------------|
| **Platform** | OpenCode plugin (terminal) | OpenClaw skill (messaging + web) |
| **Format** | TypeScript runtime hooks | Markdown prompts + **TypeScript plugin** |
| **Agents** | 11 (TypeScript) | 10 (Markdown) |
| **Hooks** | 55+ runtime interceptors | 3 plugin hooks + workflow-based |
| **Tools** | 17 custom tools | 3 plugin tools + OpenClaw native |
| **Skills** | 4 built-in | 7 skill documents |
| **Channels** | Terminal only | Discord, Telegram, Web, etc. |
| **Memory** | Session-scoped | Graphiti knowledge graph |
| **Devices** | Local machine | Multi-node (phone, IoT, etc.) |

---

## Plugin (`@happycastle/oh-my-openclaw`)

The TypeScript plugin. Enforces orchestration patterns at the code level via the OpenClaw Plugin API.

### Install

```bash
cd plugin
npm install && npm run build
```

### What It Provides

| Type | Name | Description |
|------|------|-------------|
| Hook | `todo-enforcer` | Injects TODO continuation on `agent:bootstrap` |
| Hook | `comment-checker` | 11 regex patterns kill AI slop on `tool_result_persist` |
| Hook | `message-monitor` | Audit logging + message counter on `message:sent` |
| Tool | `omoc_delegate` | Category-based task delegation with model routing |
| Tool | `omoc_look_at` | Multimodal analysis via Gemini CLI + tmux |
| Tool | `omoc_checkpoint` | Save/load/list execution checkpoints |
| Command | `/ultrawork` | Full planning → execution → verification |
| Command | `/plan` | Planning workflow |
| Command | `/start-work` | Execute existing plan |
| Command | `/ralph-loop` | Start self-correcting execution loop |
| Command | `/ralph-stop` | Stop ralph loop |
| Command | `/omoc-status` | Plugin status summary |
| Service | `ralph-loop` | Background loop — hard cap at 100 iterations |

### Scripts

```bash
npm run build      # Compile TypeScript
npm run typecheck  # Type-check without emit
npm run test       # Run vitest (37 tests)
```

### Publish

```bash
git tag v0.1.0
git push origin v0.1.0  # Triggers .github/workflows/publish.yml
```

Requires `NPM_TOKEN` secret in GitHub repo settings.

---

## Documentation

| Document | What's Inside |
|----------|--------------|
| [Overview](docs/guide/overview.md) | Big picture — what OmOC is and why |
| [Installation](docs/guide/installation.md) | Step-by-step setup guide |
| [Orchestration](docs/guide/orchestration.md) | How the 3-layer system works |
| [Features Reference](docs/reference/features.md) | Every feature, explained |
| [Configuration](docs/reference/configuration.md) | All config options |
| [Similarity Analysis](docs/SIMILARITY.md) | OmO → OmOC port analysis |

---

## Credits

- [Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode) by [@code-yeongyu](https://github.com/code-yeongyu) — The original. The patterns. The philosophy.
- [OpenClaw](https://openclaw.ai) — The runtime that makes messaging-channel orchestration possible.

---

## 한국어 설치 가이드

### 설치

```bash
# 1. 레포 클론
git clone https://github.com/happycastle114/oh-my-openclaw.git

# 2. OpenClaw 워크스페이스 스킬로 심링크
ln -s "$(pwd)/oh-my-openclaw" ~/.openclaw/workspace/skills/oh-my-openclaw

# 3. 초기화
bash oh-my-openclaw/scripts/init-deep.sh
```

### 모델 변경

`config/categories.json`에서 각 카테고리의 `model` 필드를 수정:

```json
{
  "quick": { "model": "여기를 원하는 모델로 변경" },
  "deep": { "model": "여기를 원하는 모델로 변경" }
}
```

### 사용법

OpenClaw에 연결된 채널(Discord, Telegram 등)에서:

- `/ultrawork 기능 설명` — 자동 계획 + 실행 + 검증
- `/plan 기능 설명` — 계획만 생성
- `/start-work` — 기존 계획 기반 실행

---

## License

Private — [@happycastle114](https://github.com/happycastle114)
