---
name: opencode-controller
description: Control OpenCode sessions via ACP (Agent Client Protocol). Includes session management, model selection, and OmO delegation patterns.
---

# opencode-controller — OpenCode Session Control (ACP)

OpenClaw is not a direct code executor, but an orchestrator that delegates work to OpenCode via ACP, collects results, and verifies them.

## Core Principles

- OpenClaw does not write code directly
- Coding tasks are delegated to OpenCode via ACP sessions (`runtime: "acp"`, `agentId: "opencode"`)
- OpenClaw is responsible for task decomposition, instruction, monitoring, and result verification

## Pre-flight Checklist

### 1) ACP Backend Check

Verify ACP is enabled and the opencode harness is available:

```text
/acp doctor
```

If ACP backend is not configured, install it:

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

### 2) OpenCode Authentication

- OpenCode CLI provider authentication must be completed
- If authentication expires, re-authenticate and retry

### 3) ACP Session Status

```text
/acp status
/acp sessions
```

## OmO Delegation Pattern

### 1) One-Shot Delegation (Default)

For single tasks that run to completion:

```json
sessions_spawn({
  "task": "ultrawork fix payment failure bug. Include reproduction, root cause analysis, test addition, and regression prevention.",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run"
})
```

- `sessions_spawn` returns immediately with `{ status: "accepted", runId, childSessionKey }`
- OpenCode works autonomously on the task
- On completion, result is announced back to the requester chat channel
- Use `/subagents info <id>` or `/subagents log <id>` to inspect details

### 2) Persistent Session (Thread-Bound)

For multi-turn interactive work in a thread:

```json
sessions_spawn({
  "task": "Set up for auth module refactoring. Start by analyzing the current structure.",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "session",
  "thread": true
})
```

- Thread binding routes follow-up messages to the same OpenCode session
- Use `/acp steer <instruction>` to nudge without replacing context
- Use `/unfocus` to detach from the thread when done

### 3) Model Override (Use Sparingly)

Override only when you need a specific model. By default, OpenCode uses its own configured model — leave `model` empty to use that default.

```json
sessions_spawn({
  "task": "Plan: write scope/risk/verification strategy for auth module refactoring",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run",
  "model": "claude-opus-4-6-thinking"
})
```

### 4) OpenCode Agent Mode Selection

OpenCode has internal agents (Build, Plan, custom agents from `.opencode/agents/`). Select which agent handles the task via ACP session mode switching:

```json
// Use Plan agent (read-only, restricted tools) for planning tasks
sessions_spawn({
  "task": "Analyze the auth module structure and propose refactoring strategy",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run"
})
// After session creation, switch mode: setSessionMode("plan")
```

**How it works:**
- ACP session creation returns available `modes` (primary agents only — not subagents, not hidden)
- Call `setSessionMode(modeId)` to switch the active OpenCode agent
- Default mode is OpenCode's configured primary agent (usually "build")
- Available modes: `build` (full tools), `plan` (restricted), plus any custom primary agents

### 5) Subagent Invocation via @mention

OpenCode subagents (Explore, custom subagents from `.opencode/agents/`) are invoked via `@mention` in the task text:

```json
sessions_spawn({
  "task": "@explore find all authentication-related files and report their structure",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run"
})
```

**Note:** Subagents are NOT available as session modes. They are invoked within the agent's conversation via `@agentname` prefix.

## Model Selection Guide

- **Default behavior**: Leave `model` empty — OpenCode uses its own configured model
- Quick fixes: Speed-first model (only override if OpenCode default is too slow)
- Complex refactoring/design: Deep reasoning model
- Planning-only phase: Use `opencode_agent: "plan"` mode instead of model override

Follow project standard routing (quick/deep/ultrabrain) at execution time.

## Work Templates

Feature implementation:
```text
ultrawork implement [feature].
Requirements:
- [requirement 1]
- [requirement 2]
Follow patterns in [reference file] and perform testing.
```

Bug fix:
```text
ultrawork fix [bug description].
Reproduction path: [steps]
Error: [message]
Expected behavior: [expected]
```

Refactoring:
```text
ultrawork refactor [module].
Goals:
- [goal 1]
- [goal 2]
Constraints:
- No public API changes
- Existing tests must pass
```

Research + implementation:
```text
Read [/path/to/research.md] first,
then ultrawork implement [feature] based on research findings.
```

## Progress Monitoring

### Check Active Sessions

```text
/acp sessions
/subagents list
```

### Inspect Session Output

```text
/subagents log <id>
/subagents info <id>
```

### Steer Active Session

Nudge a running session without replacing context:

```text
/acp steer focus on the failing test case first
```

### Session History

After completion, review the full transcript:

```text
/subagents log <id> 50
```

## Parallel Delegation

Run multiple OpenCode sessions in parallel:

```json
// Session 1: Fix auth bug
sessions_spawn({
  "task": "ultrawork fix auth bug in src/auth/login.ts",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run",
  "label": "auth-fix"
})

// Session 2: Enhance payment tests
sessions_spawn({
  "task": "ultrawork enhance payment module tests",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run",
  "label": "payment-tests"
})
```

- Each session runs independently with its own context
- Results announce back separately on completion
- Use `/subagents list` to monitor all active sessions
- Concurrency is governed by `agents.defaults.subagents.maxConcurrent` (default: 8)

## Collect Results

After announce arrives:

```bash
git status
git diff --stat
git diff
```

OpenClaw summarizes changed files, test results, and risks before reporting to user.

## Error Recovery

```text
# Cancel in-flight session
/acp cancel <session-key>

# Close and unbind thread
/acp close

# Kill specific sub-agent
/subagents kill <id>

# Retry with new session
sessions_spawn({
  "task": "First solve only the test failure cause from the previous step.",
  "runtime": "acp",
  "agentId": "opencode",
  "mode": "run"
})
```

## Session Lifecycle

| Action | Command |
|--------|---------|
| Spawn one-shot | `sessions_spawn` with `mode: "run"` |
| Spawn persistent | `sessions_spawn` with `mode: "session"`, `thread: true` |
| Check status | `/acp status`, `/subagents list` |
| Inspect output | `/subagents log <id>`, `/subagents info <id>` |
| Steer mid-run | `/acp steer <instruction>` |
| Cancel turn | `/acp cancel` |
| Close session | `/acp close` |
| Kill sub-agent | `/subagents kill <id>` |

## Operation Checklist

- Verify ACP health (`/acp doctor`) -> delegate via `sessions_spawn` -> monitor (`/subagents list`) -> collect results (`git diff`) -> report
- Always use `runtime: "acp"` and `agentId: "opencode"` for OmO delegation
- `model` is override-only — leave empty to use OpenCode's own configured default
- Use `opencode_agent` to select OpenCode's internal agent mode (build, plan, custom)
- Use `@agentname` prefix in task text to invoke OpenCode subagents
- Use `label` parameter for easy identification of parallel sessions
- Validate changes with `git status`/`git diff` before reporting results
