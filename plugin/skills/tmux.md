---
name: tmux
description: Remote control of tmux sessions + multi-session orchestration. Control interactive CLI with send-keys/capture-pane and operate parallel sessions.
---

# tmux — Session Control and Parallel Orchestration

Standard patterns for controlling tmux from OpenClaw.
Covers everything from single session control to parallel multi-session operation of OpenCode/Gemini.

## Socket Rules

- OpenClaw default socket: `/tmp/openclaw-tmux-sockets/openclaw.sock`
- Do not assume default clawdbot path; prioritize OpenClaw socket
- Fallback rule: If `CLAWDBOT_TMUX_SOCKET_DIR` exists, use socket from that directory

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
if [ -n "${CLAWDBOT_TMUX_SOCKET_DIR:-}" ] && [ -S "$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock" ]; then
  SOCKET="$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock"
fi
```

## Quickstart (OpenClaw Socket)

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# List sessions
tmux -S "$SOCKET" list-sessions

# Check if opencode session is alive
tmux -S "$SOCKET" has-session -t opencode && echo READY || echo MISSING

# Check output
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

## Target Specification Rules

- Target format: `session:window.pane`
- Examples: `opencode:0.0`, `gemini:0.0`, `opencode-2:1.0`
- Specify up to pane when possible to avoid ambiguity with session name alone

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'pwd'
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## Safe Input Transmission

Principle: Send string with `send-keys -l`, then call `Enter` separately.

```bash
TARGET="opencode:0.0"
CMD='git status --short'

tmux -S "$SOCKET" send-keys -t "$TARGET" -l -- "$CMD"
sleep 0.1
tmux -S "$SOCKET" send-keys -t "$TARGET" Enter
```

## Output Collection Standard

Use the following command as the baseline for recent output:

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

- For long-running tasks, expand to `-S -500` or more
- Use `-J` to join wrapped lines for parsing stability

## Coding Agent Orchestration

Run multiple coding sessions in parallel and poll for completion.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Parallel instructions
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork fix auth bug'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork enhance payment module tests'
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Enter

# Completion polling
for i in $(seq 1 20); do
  echo "[poll:$i] opencode"
  tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -30
  echo "[poll:$i] opencode-2"
  tmux -S "$SOCKET" capture-pane -p -J -t opencode-2:0.0 -S -30
  sleep 15
done
```

Recommended operation approach:
- Start in parallel, collect results sequentially
- Polling interval: 10-30 seconds
- Proceed to next step after confirming completion signal (task summary/test results)

## Multi-Session Orchestration Pattern

### Session Naming

- Default: `opencode`, `gemini`
- Extended: `opencode-2`, `gemini-2`, `opencode-3`, `research`, `build`
- Rule: Name by role or project unit

### Parallel Scenarios

1) Two projects simultaneously
- `opencode`: Project A
- `opencode-2`: Project B

2) Coding + verification simultaneously
- `opencode`: Implementation/fixes
- `gemini`, `gemini-2`: Visual verification of results

3) Research + implementation + build
- `research` or `gemini`: Document/reference analysis
- `opencode`: Implementation
- `build`: Test/build monitoring

### Agent Selection Table (OpenCode)

| Task Type | Recommended Agent | Switch |
|-----------|----------------|------|
| Quick fixes/implementation | Sisyphus (default) | Default state |
| Complex autonomous implementation | Hephaestus | Tab 1x |
| Planning/strategy | Prometheus | Tab 2x |

## Operation Template

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Create sessions
tmux -S "$SOCKET" new -d -s opencode-2 -n main
tmux -S "$SOCKET" new -d -s gemini-2 -n main

# Send work
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork execute refactoring'
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Enter

# Capture results
tmux -S "$SOCKET" capture-pane -p -J -t opencode-2:0.0 -S -200
```

## Cleanup

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Kill single session
tmux -S "$SOCKET" kill-session -t opencode-2

# Kill all except default sessions (opencode, gemini)
for s in $(tmux -S "$SOCKET" list-sessions -F '#{session_name}' 2>/dev/null); do
  case "$s" in
    opencode|gemini) ;;
    *) tmux -S "$SOCKET" kill-session -t "$s" ;;
  esac
done
```

## Cautions

- Never mix Enter into command strings; always separate it
- For complex paths/quotes, execute via script file
- If pane capture alone is insufficient, combine with log file redirection
- As session count increases, memory usage grows rapidly; limit concurrency
