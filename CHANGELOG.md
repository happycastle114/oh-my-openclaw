# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.5.0] - 2026-02-23

### Added
- Dynamic model routing via configurable `model_routing` in plugin config
- `/omoc-health` auto-reply command for plugin health checks
- `/omoc-config` auto-reply command with sensitive value masking
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
- 6 commands: ultrawork, plan, start-work, ralph-loop, ralph-stop, omoc-status
- Ralph Loop service with configurable iterations
- 10 agent personas with category-based routing
- 13 skill documents
