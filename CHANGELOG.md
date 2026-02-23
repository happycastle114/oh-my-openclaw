# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.0] - 2026-02-23

### Added
- Synced all 13 skills to root `skills/` directory (was 8, now 13 — full parity with `plugin/skills/`)
- `opencode-controller` skill: tmux-based OpenCode/OmO delegation (session management, agent switching, task templates, monitoring, error recovery)
- `tmux` skill: multi-session orchestration (parallel coding, verification, polling patterns)
- `tmux-agents` skill: agent spawning/monitoring (Claude, Codex, Gemini, Ollama in tmux)
- `workflow-auto-rescue` skill: checkpoint-based session recovery
- `workflow-tool-patterns` skill: OmO→OpenClaw tool mapping reference

### Changed
- All agent configs inherit full skill set (including tmux/OmO delegation) via OpenClaw's `skills` allowlist behavior (omit = load all)

## [0.6.2] - 2026-02-23

### Fixed
- Config parser: replaced hand-rolled regex with `json5` package (matches OpenClaw's own parser)
- Fixes "Bad control character in string literal" error when parsing user configs

## [0.6.1] - 2026-02-23

### Fixed
- CLI invocation: `command('setup')` → `command('omoc-setup')` so `openclaw omoc-setup` works correctly
- Deleted obsolete `config/openclaw.sample.json` (replaced by `omoc-setup` CLI)
- Updated all docs referencing deleted sample config (9 occurrences across 5 files)
- Fixed `/start-work` → `/start_work` in `cli.ts` and `setup.sh`
- Fixed workflow path reference in `docs/reference/features.md`
- Synced root `skills/` with `plugin/skills/` (gemini-look-at, web-search were diverged)

## [0.6.0] - 2026-02-23

### Added
- 11 agent configs as OpenClaw `AgentConfig` definitions in `agent-configs.ts`
- `omoc-setup` CLI command: injects agent configs into user's `openclaw.json5` via `registerCli`
- `omoc_frontend` agent — frontend-focused visual engineering specialist (OmOC-only, not in OmO)
- 40 new tests for agent configs and CLI setup (120 total)

### Changed
- Multimodal Looker: switched from permissive deny-list to read-only allowlist (matching OmO)
- Atlas: downgraded from `openai/o3` to `anthropic/claude-sonnet-4-6` (cheap orchestrator tier, matching OmO)
- Sisyphus-Junior: upgraded from `anthropic/claude-sonnet-4-6` to `anthropic/claude-opus-4-6` (primary worker tier, matching OmO)
- Sisyphus-Junior: tool profile changed from `coding` to `full`
- `OmocPluginApi` type extended with `registerCli` field

### Fixed
- Agent model tier mismatches with OmO (Atlas was too expensive, Sisyphus was too cheap)
- Looker tool access was too permissive compared to OmO's read-only allowlist

## [0.5.1] - 2026-02-23

### Fixed
- Gemini API `const` schema error: replaced `Type.Literal` with `Type.Unsafe` + `enum` in checkpoint tool
- Telegram "Command not found": renamed hyphenated commands to underscores for Telegram compatibility (`start-work` → `start_work`, etc.)
- Commands with arguments silently failing: added `acceptsArgs: true` to commands that accept arguments
- Plugin config ignored: `getConfig()` now reads from `api.pluginConfig` (plugin-specific) instead of `api.config` (global)

### Changed
- All command names now use underscores instead of hyphens for cross-platform compatibility
- `CommandRegistration` type now includes optional `acceptsArgs` field
- `OmocPluginApi` type now includes optional `pluginConfig` field

## [0.5.0] - 2026-02-23

### Added
- Dynamic model routing via configurable `model_routing` in plugin config
- `/omoc_health` auto-reply command for plugin health checks
- `/omoc_config` auto-reply command with sensitive value masking
- `message:received` hook for inbound message audit logging
- `gateway:startup` hook for plugin activation logging
- Configurable `tmux_socket` path in plugin config
- Complete configSchema uiHints for OpenClaw Control UI
- Concurrency guard for `omoc_look_at` tool
- Task description validation in `omoc_delegate`
- Fallback model suggestions in delegation instructions

### Changed
- `readState` returns `StateResult<T>` discriminated union instead of `T | null`
- `OmocPluginApi` types: all `any` replaced with generics and `unknown`
- Message monitor uses per-channel `Map` counting instead of global counter
- Workflow commands use async `fs.readFile` instead of `readFileSync`
- CLI `run()` supports `throwOnError` for fail-fast behavior
- Checkpoint tool uses proper TypeBox union and typed params
- Version unified via `src/version.ts` reading from `package.json`
- Categories deduplicated into `src/constants.ts`

### Fixed
- Version hardcoded in multiple locations (now single source of truth)
- Todo enforcer missing cooldown timer and failure tracking
- Empty catch blocks in look-at.ts now log warnings
- Temp file name collision in look-at.ts (UUID instead of Date.now())
- Ralph loop state loading uses structured errors
- README conflated workflow commands with reference skills

### Not Implemented (Investigated)
- Lobster integration — agent-facing tool, not plugin-accessible
- Memory system — no plugin API for knowledge graph writes
- Boot.md generation — race condition with gateway initialization
- llm-task in todo-enforcer — no LLM invocation from plugin context
- Cron job registration — gateway config only, no programmatic API

## [0.4.0] - 2026-02-10

### Added
- Initial TypeScript plugin release
- 3 hooks: todo-enforcer, comment-checker, message-monitor
- 3 tools: omoc_delegate, omoc_look_at, omoc_checkpoint
- 6 commands: ultrawork, plan, start_work, ralph_loop, ralph_stop, omoc_status
- Ralph Loop service with configurable iterations
- 10 agent personas with category-based routing
- 13 skill documents
