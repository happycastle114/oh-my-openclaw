---
name: opencode-controller
description: Control OpenCode sessions via tmux. Includes session management, model selection, agent switching (Plan/Build), and OmO delegation patterns.
---

# opencode-controller — OpenCode Session Control

OpenClaw is not a direct code executor, but an orchestrator that delegates work to OpenCode, collects results, and verifies them.

## Core Principles

- OpenClaw does not write code directly
- Coding tasks are delegated to the tmux `opencode` session
- OpenClaw is responsible for task decomposition, instruction, monitoring, and result verification

## Pre-flight Checklist

### 1) Provider/Model Selection

- Select OpenCode model based on task difficulty (quick/deep/ultrabrain)
- Prioritize high-performance models for high-difficulty tasks

### 2) Authentication Status

- OpenCode CLI provider authentication must be completed
- If authentication expires, re-login within the session and retry

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

OpenCode agent switching is performed via Tab.

| Agent | Purpose | Switch |
|----------|------|------|
| Sisyphus | Default implementation/fixes | Default state |
| Hephaestus | Deep implementation/refactoring | Tab 1x |
| Prometheus | Planning/strategy | Tab 2x |

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 1
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -20
```

## Model Selection Guide

- Quick fixes: Speed-first model
- Complex refactoring/design: Deep reasoning model
- Planning-only phase: Highest reasoning model first

Follow project standard routing (quick/deep/ultrabrain) at execution time.

## Plan -> Build Workflow

1) Establish plan with Prometheus
2) Approve/refine plan
3) Switch to Sisyphus or Hephaestus for implementation
4) Run tests/build/verification
5) OpenClaw collects results and reports final summary

```bash
# Plan phase
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'Plan: write scope/risk/verification strategy for auth module refactoring'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Build phase switch (e.g., return to Sisyphus for implementation)
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork implement based on above plan, complete through testing'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## OmO Delegation Pattern

### 1) Validate tmux Session

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode
```

### 2) Agent Selection Table

| Purpose | Agent | Switch |
|------|----------|------|
| Default execution | Sisyphus | Default |
| Deep implementation | Hephaestus | Tab 1x |
| Planning | Prometheus | Tab 2x |

### 3) Send Work (`send-keys -l` + separate Enter)

```bash
TASK='ultrawork fix payment failure bug. Include reproduction, root cause analysis, test addition, and regression prevention.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- "$TASK"
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

### 4) Work Templates

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

### 5) Progress Monitoring (`capture-pane`)

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

Recommendations:
- Check progress logs every 10-30 seconds
- Intervene immediately on signs of blockage (repeated identical output, prompt waiting)

### 6) Collect Results (`git status`/`git diff`)

```bash
git status
git diff --stat
git diff
```

OpenClaw summarizes changed files/test results/risks and reports to user.

### 7) Error Recovery

```bash
# Stop current operation
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape

# Resend fix instruction
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'First solve only the test failure cause from the previous step.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Restart session
tmux -S "$SOCKET" kill-session -t opencode
tmux -S "$SOCKET" new -d -s opencode -n main
```

## Operation Checklist

- Verify session alive → select agent → send work → monitor → collect results
- Always use `send-keys -l` + separate Enter
- Validate changes with `git status`/`git diff` before reporting results
