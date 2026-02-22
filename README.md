<div align="center">

# Oh-My-OpenClaw (OmOC)

**Agent orchestration framework for [OpenClaw](https://openclaw.ai)**

*Ports the proven patterns from [Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode) into OpenClaw-native constructs.*

**Planning → Orchestration → Execution → Verification**

[English](#installation) | [한국어](#한국어-설치-가이드)

</div>

---

> **What is this?**
> OmO (Oh-My-OpenCode) revolutionized AI coding agents with structured orchestration — 3-layer planning, category-based model routing, and self-correcting execution loops.
>
> **Oh-My-OpenClaw** brings those patterns to [OpenClaw](https://openclaw.ai), an AI agent platform that connects to Discord, Telegram, and more. Now you get OmO-style orchestration *outside* the terminal — with messaging, memory, browser control, and multi-device access.

---

## ✨ Features

- **3-Layer Agent Architecture** — Planning (Prometheus/Metis/Momus) → Orchestration (Atlas) → Execution (Workers)
- **Category-Based Model Routing** — Auto-select the best model for each task type (quick/deep/ultrabrain/visual)
- **Configurable Models** — Swap models per category via `config/categories.json`
- **Ultrawork Mode** — One command (`/ultrawork`) for full planning → execution → verification
- **Wisdom Accumulation** — File-based notepad system for persistent knowledge across sessions
- **Todo Enforcer + Ralph Loop** — Self-correcting completion mechanism
- **Gemini CLI Integration** — Native multimodal analysis (PDF/images/video) via Gemini CLI tmux
- **OmO Delegation** — Route complex coding tasks to OpenCode (OmO) running in tmux
- **tmux Multi-Tool Orchestration** — Coordinate OpenCode + Gemini CLI + OpenClaw together

## 📋 Prerequisites

- [OpenClaw](https://openclaw.ai) installed and running (gateway mode)
- A messaging channel configured (Discord, Telegram, etc.)
- *(Optional)* [OpenCode](https://opencode.ai) for coding delegation
- *(Optional)* [Gemini CLI](https://ai.google.dev/) for multimodal analysis

## 🚀 Installation

### Option 1: Clone + Symlink (Recommended)

```bash
# Clone the repo
git clone https://github.com/happycastle114/oh-my-openclaw.git
cd oh-my-openclaw

# Symlink into OpenClaw workspace skills directory
ln -s "$(pwd)" ~/.openclaw/workspace/skills/oh-my-openclaw

# Initialize notepad structure
bash scripts/init-deep.sh
```

### Option 2: Direct Clone into Skills

```bash
# Clone directly into the skills folder
git clone https://github.com/happycastle114/oh-my-openclaw.git \
  ~/.openclaw/workspace/skills/oh-my-openclaw

# Initialize
bash ~/.openclaw/workspace/skills/oh-my-openclaw/scripts/init-deep.sh
```

### Option 3: Global Skill (Shared across all workspaces)

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git \
  ~/.openclaw/skills/oh-my-openclaw
```

### Verify Installation

After installing, the skill should appear in OpenClaw's available skills. Test by sending this to your OpenClaw agent:

> "Read the oh-my-openclaw skill and tell me what it does"

Your agent should find and describe the skill, confirming it's properly loaded.

## ⚙️ Configuration

All configuration lives in `config/categories.json`. Edit this file to customize models, tools, and behavior.

### Model Routing

Each category maps to a default model with alternatives you can swap in:

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

To change a category's model, simply edit the `"model"` field. The `"alternatives"` list shows other tested options.

### tmux Sessions

Configure OpenCode and Gemini CLI tmux sessions:

```json
{
  "tmux": {
    "socket": "/tmp/openclaw-tmux-sockets/openclaw.sock",
    "sessions": {
      "opencode": {
        "default_agent": "sisyphus",
        "agents": {
          "sisyphus": { "switch": "default" },
          "hephaestus": { "switch": "Tab x1" },
          "prometheus": { "switch": "Tab x2" }
        }
      },
      "gemini": {
        "default_model": "gemini-2.5-flash",
        "models": {
          "gemini-2.5-flash": { "speed": "fast" },
          "gemini-2.5-pro": { "speed": "medium" },
          "gemini-3.1-pro": { "speed": "slow" }
        }
      }
    }
  }
}
```

### Skill Triggers

Skills auto-activate based on keyword detection:

```json
{
  "skills": {
    "git-master": {
      "trigger": ["commit", "rebase", "squash", "blame"],
      "path": "skills/git-master.md"
    },
    "gemini-look-at": {
      "trigger": ["look at", "PDF", "screenshot", "diagram"],
      "path": "skills/gemini-look-at.md"
    }
  }
}
```

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                      OpenClaw Agent                       │
│                    (Main Orchestrator)                     │
├──────────┬───────────┬────────────────┬──────────────────┤
│  Discord │ Telegram  │    Browser     │  Node Devices    │
│  Channel │   Bot     │   Control      │  (Camera, etc.)  │
└────┬─────┴─────┬─────┴───���───┬────────┴──────┬───────────┘
     │           │             │               │
     ▼           ▼             ▼               ▼
┌─────────────────────────────────────────────────────────┐
│              oh-my-openclaw Skill Layer                   │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Layer 1: PLANNING                          │ │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │ Prometheus  │ │  Metis   │ │  Momus   │          │ │
│  │  │ (Planner)   │ │ (Gaps)   │ │ (Review) │          │ │
│  │  └─────┬──────┘ └────┬─────┘ └────┬─────┘          │ │
│  ├────────┼──────────���───┼────────────┼────────────────┤ │
│  │        ▼              ▼            ▼                 │ │
│  │           Layer 2: ORCHESTRATION                     │ │
│  │  ┌──────────────────────────────────────────┐       │ │
│  │  │              Atlas                        │       │ │
│  │  │   (Task Distribution + Verification)      │       │ │
│  │  └────┬────┬────┬────┬────┬────┬────────────┘       │ │
│  ├───────┼────┼────┼────┼────┼────┼─────────────────────┤ │
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

### Agent Roles

| Layer | Agent | Role | Category |
|-------|-------|------|----------|
| **Planning** | **Prometheus** | Strategic planner — interviews user, creates phased plans | ultrabrain |
| | **Metis** | Gap analyzer — identifies missing context before execution | deep |
| | **Momus** | Plan reviewer — critiques and finds blockers | deep |
| **Orchestration** | **Atlas** | Task distributor — breaks plans into units, verifies completion | ultrabrain |
| **Workers** | **Sisyphus-Junior** | Primary coder — quick implementations, bug fixes | quick |
| | **Hephaestus** | Deep worker — complex refactoring, architecture changes | deep |
| | **Oracle** | Architect/debugger — design decisions, root cause analysis | ultrabrain |
| | **Explore** | Search specialist — codebase exploration, pattern finding | quick |
| | **Librarian** | Documentation — docs, research, knowledge retrieval | quick |
| | **Multimodal Looker** | Visual analyst — screenshots, UI review, PDF quality check | visual-engineering |

### Category → Model Mapping

| Category | Default Model | Alternatives | Use Case |
|----------|--------------|-------------|----------|
| `quick` | Claude Sonnet 4.6 | GPT 5.3 Spark, Gemini 3 Flash | Simple fixes, searches |
| `deep` | Claude Opus 4.6 | GPT 5.3 Codex, Gemini 3.1 Pro | Complex refactoring |
| `ultrabrain` | GPT 5.3 Codex | Claude Opus 4.6, Gemini 3.1 Pro High | Architecture decisions |
| `visual-engineering` | Gemini 3.1 Pro | Claude Opus 4.6 | UI/UX, visual analysis |
| `multimodal` | Gemini 2.5 Flash | Gemini 3.1 Pro | PDF/image/video via CLI |

### Skills

| Skill | Trigger Keywords | Description |
|-------|-----------------|-------------|
| `git-master` | commit, rebase, squash, blame | Atomic commits, rebase surgery |
| `frontend-ui-ux` | UI, UX, frontend, design, CSS | Design-first UI development |
| `comment-checker` | comment check, AI slop | Anti-AI-slop code quality guard |
| `gemini-look-at` | look at, PDF, screenshot, diagram | Gemini CLI multimodal analysis |
| `steering-words` | ultrawork, search, analyze | Keyword detection, mode routing |
| `delegation-prompt` | delegate, sub-agent | 7-element delegation prompt guide |
| `multimodal-analysis` | multimodal, image analysis | Analysis pattern templates |

### Workflows

| Workflow | Command | Description |
|----------|---------|-------------|
| `ultrawork` | `/ultrawork` | Full planning → execution → verification loop |
| `plan` | `/plan` | Planning only (Prometheus + Momus) |
| `start-work` | `/start-work` | Execute an existing plan |
| `delegate-to-omo` | `/delegate-to-omo` | Route task to OpenCode tmux |
| `tmux-orchestration` | — | OpenCode + Gemini CLI coordination |
| `tool-patterns` | — | OmO tool → OpenClaw mapping reference |
| `auto-rescue` | — | Checkpoint + failure recovery |

## 📁 File Structure

```
oh-my-openclaw/
├── SKILL.md                    # Main skill definition (OpenClaw reads this)
├── README.md                   # This file
├── config/
│   └── categories.json         # Model routing, skills, tmux, tool restrictions
├── agents/                     # Agent profile definitions (10)
│   ├── prometheus.md           # Strategic planner
│   ├── metis.md                # Gap analyzer
│   ├── momus.md                # Plan reviewer
│   ├── atlas.md                # Task orchestrator
│   ├── sisyphus-junior.md      # Primary coder
│   ├── hephaestus.md           # Deep worker
│   ├── oracle.md               # Architect/debugger
│   ├── explore.md              # Search specialist
│   ├── librarian.md            # Documentation
│   └── multimodal-looker.md    # Visual analyst
├── skills/                     # Skill definitions (7)
│   ├── git-master.md
│   ├── frontend-ui-ux.md
│   ├── comment-checker.md
│   ├── gemini-look-at.md       # Gemini CLI multimodal
│   ├── steering-words.md
│   ├── delegation-prompt.md
│   └── multimodal-analysis.md
├── workflows/                  # Workflow definitions (7)
│   ├── ultrawork.md
│   ├── plan.md
│   ├── start-work.md
│   ├── delegate-to-omo.md
│   ├── tmux-orchestration.md   # Multi-tool coordination
│   ├── tool-patterns.md
│   └── auto-rescue.md
└── scripts/
├── plugin/                     # @omoc/plugin (TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── openclaw.plugin.json    # Plugin manifest
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts            # Entry point
│       ├── types.ts            # Shared interfaces
│       ├── hooks/              # 3 hooks
│       ├── tools/              # 3 tools
│       ├── commands/           # 6 slash commands
│       ├── services/           # Ralph loop service
│       ├── utils/              # Config, state, validation
│       └── __tests__/          # 37 unit tests
    ├── setup.sh                # One-command install
    └── init-deep.sh            # Generate AGENTS.md hierarchy
```

## 🔧 Usage

### Quick Task

```
User: Fix the type error in auth.ts
Agent: [Uses Sisyphus-Junior directly — category: quick]
```

### Complex Feature

```
User: /ultrawork Add user authentication with OAuth2
Agent: [Prometheus plans → Momus reviews → Atlas distributes → Workers execute → Verify]
```

### Research Task

```
User: /plan Research the best approach for real-time notifications
Agent: [Prometheus + Librarian + Oracle collaborate on research plan]
```

### Visual Analysis

```
User: Check this PDF layout
Agent: [Multimodal Looker via Gemini CLI → analyzes PDF → reports findings]
```

### Coding Delegation

```
User: Refactor the entire auth module
Agent: [Delegates to OpenCode via tmux → monitors progress → reports back]
```

## 🔄 OmO vs Oh-My-OpenClaw

| Aspect | OmO (Oh-My-OpenCode) | Oh-My-OpenClaw |
|--------|---------------------|----------------|
| **Platform** | OpenCode plugin (terminal) | OpenClaw skill (messaging + web) |
| **Format** | TypeScript runtime hooks | Markdown prompts + **TypeScript plugin** |
| **Agents** | 11 (TypeScript) | 10 (Markdown) |
| **Hooks** | 55+ runtime interceptors | 3 plugin hooks + workflow-based |
| **Tools** | 17 custom tools | 3 plugin tools + OpenClaw native tools |
| **Skills** | 4 built-in | 7 skill documents |
| **Channels** | Terminal only | Discord, Telegram, Web, etc. |
| **Memory** | Session-scoped | Graphiti knowledge graph |
| **Devices** | Local machine | Multi-node (phone, IoT, etc.) |

## 🔌 Plugin (`@omoc/plugin`)

Phase 2 of Oh-My-OpenClaw: a TypeScript plugin that enforces orchestration patterns at the code level via the OpenClaw Plugin API.

### Install

```bash
cd plugin
npm install
npm run build
```

### What it provides

| Type | Name | Description |
|------|------|-------------|
| Hook | `todo-enforcer` | Injects TODO continuation directive on `agent:bootstrap` |
| Hook | `comment-checker` | Detects AI slop comments on `tool_result_persist` (11 regex patterns) |
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
| Service | `ralph-loop` | Background loop with hard cap (100 iterations) |

### Scripts

```bash
npm run build      # Compile TypeScript
npm run typecheck  # Type-check without emit
npm run test       # Run vitest (37 tests)
```

### Publishing

CI/CD is configured via GitHub Actions. To publish:

```bash
git tag v0.1.0
git push origin v0.1.0  # Triggers .github/workflows/publish.yml
```

Requires `NPM_TOKEN` secret in GitHub repository settings.

## 🌱 Roadmap

~~Based on gap analysis (GPT 5.3 Codex + Gemini 3.1 Pro):~~

1. ~~🔴 **Agent Procedural Strictness** — Port OmO's mandatory checklists and defensive grammar~~
2. ~~🟡 **Quality Gate Workflow** — Auto-verify error rates and task completion per turn~~
3. ~~🟢 **Tool Pattern Templates** — `ast-grep`, `lsp` via `exec` wrapper patterns~~
4. ~~🔵 **Boulder-State Management** — File-based task tracking protocol~~

✅ All roadmap items addressed by `@omoc/plugin` (v0.1.0) — hooks enforce procedural strictness, comment-checker is the quality gate, tools provide pattern templates, and ralph-loop + checkpoint handle boulder-state management.

## 📜 Credits

- [Oh-My-OpenCode](https://github.com/code-yeongyu/oh-my-opencode) by [@code-yeongyu](https://github.com/code-yeongyu) — Original patterns and agent architecture
- [OpenClaw](https://openclaw.ai) — Agent platform providing the runtime

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

## License

Private — [@happycastle114](https://github.com/happycastle114)
