---
name: opencode-controller
description: Controls the OpenCode session in tmux. Includes session management, model selection, agent switching (Plan/Build), and OmO delegation patterns.
---

# opencode-controller — OpenCode Session Control

OpenClaw is not a code executor — it delegates work to OpenCode and collects/verifies results as an orchestrator.

## Core Principles

- OpenClaw does not write code directly
- Coding tasks are delegated to the tmux `opencode` session
- OpenClaw handles task decomposition, instruction, monitoring, and result verification

## Pre-flight Check

### 1) Provider/Model Selection

- Select OpenCode model based on task difficulty (quick/deep/ultrabrain)
- High-difficulty tasks should prefer high-performance models

### 2) Authentication State

- OpenCode CLI provider authentication must be completed
- If auth expires, re-login within the session and retry

### 3) tmux Session Check

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode
```

## Session Management

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Create session
tmux -S "$SOCKET" new -d -s opencode -n main

# Session status
tmux -S "$SOCKET" list-sessions

# Check session output
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

## Agent Control

OpenCode agent switching is Tab-based.

| Agent | Purpose | Switch |
|-------|---------|--------|
| Sisyphus | Default implementation/fixes | Default state |
| Hephaestus | Deep implementation/refactoring | Tab x1 |
| Prometheus | Planning/strategy | Tab x2 |

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 1
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -20
```

## Model Selection Guide

- Quick fixes: speed-priority model
- Complex refactoring/design: deep reasoning model
- Planning-only phase: highest reasoning model preferred

Follow the project standard routing (quick/deep/ultrabrain) at execution time.

## Plan → Build Workflow

1) Create plan with Prometheus
2) Approve/refine the plan
3) Switch to Sisyphus or Hephaestus for implementation
4) Run tests/build/verification
5) OpenClaw collects results and delivers final report

```bash
# Plan phase
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'Plan: auth module refactoring scope/risk/verification strategy'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Build phase (switch back to Sisyphus for implementation)
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork implement based on the plan above, complete with tests'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## OmO Delegation Pattern

### 1) tmux Session Verification

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode
```

### 2) Agent Selection

| Purpose | Agent | Switch |
|---------|-------|--------|
| Default execution | Sisyphus | Default |
| Deep implementation | Hephaestus | Tab x1 |
| Planning | Prometheus | Tab x2 |

### 3) Task Sending (`send-keys -l` + separate Enter)

```bash
TASK='ultrawork fix payment failure bug. Include reproduction, root cause analysis, test addition, regression prevention.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- "$TASK"
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

### 4) Task Templates

Feature implementation:
```text
ultrawork implement [feature].
Requirements:
- [requirement 1]
- [requirement 2]
Follow existing [reference file] patterns and run tests.
```

Bug fix:
```text
ultrawork fix [bug description].
Reproduction: [steps]
Error: [message]
Expected: [expected behavior]
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
ultrawork implement [feature] based on research findings.
```

### 5) Progress Monitoring (`capture-pane`)

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

Recommendations:
- Check progress logs at 10-30 second intervals
- Intervene immediately on stall signs (repeated output, prompt waiting)

### 6) Result Collection (`git status`/`git diff`)

```bash
git status
git diff --stat
git diff
```

OpenClaw summarizes changed files/test results/risks and delivers to the user.

### 7) Error Recovery

```bash
# Stop current operation
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape

# Resend corrected instruction
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'Resolve only the test failure from the previous step first.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Session restart
tmux -S "$SOCKET" kill-session -t opencode
tmux -S "$SOCKET" new -d -s opencode -n main
```

## Operations Checklist

- Session alive check → agent selection → task send → monitoring → result collection
- Always use `send-keys -l` + separate Enter
- Verify changes with `git status`/`git diff` before reporting results
