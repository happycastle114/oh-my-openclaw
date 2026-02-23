---
name: tmux
description: tmux session remote control + multi-session orchestration. Control interactive CLIs via send-keys/capture-pane and run parallel sessions.
---

# tmux — Session Control and Parallel Orchestration

Standard patterns for controlling tmux from OpenClaw.
Covers single session control through OpenCode/Gemini multi-session parallel operation.

## Socket Rules

- OpenClaw default socket: `/tmp/openclaw-tmux-sockets/openclaw.sock`
- Do not assume default clawdbot paths; use OpenClaw socket first
- Fallback: if `CLAWDBOT_TMUX_SOCKET_DIR` is set, use socket from that directory

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
if [ -n "${CLAWDBOT_TMUX_SOCKET_DIR:-}" ] && [ -S "$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock" ]; then
  SOCKET="$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock"
fi
```

## Quickstart (OpenClaw socket)

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
- Specify pane when possible to avoid ambiguity

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'pwd'
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## Safe Input Sending

Principle: Send string with `send-keys -l`, then call `Enter` separately.

```bash
TARGET="opencode:0.0"
CMD='git status --short'

tmux -S "$SOCKET" send-keys -t "$TARGET" -l -- "$CMD"
sleep 0.1
tmux -S "$SOCKET" send-keys -t "$TARGET" Enter
```

## Output Collection Standard

Use this command for recent output:

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

- For long tasks, extend to `-S -500` or more
- `-J` joins wrapped lines for parsing stability

## Coding Agent Orchestration

Run multiple coding sessions in parallel and poll for completion.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Parallel instructions
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork fix auth bug'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork improve payment module tests'
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

Recommended practices:
- Start in parallel, collect results sequentially
- Polling interval: 10-30 seconds
- Proceed to next step after confirming completion signal (task summary/test results)

## Multi-Session Orchestration Patterns

### Session Naming

- Default: `opencode`, `gemini`
- Extended: `opencode-2`, `gemini-2`, `opencode-3`, `research`, `build`
- Convention: name by role or project

### Parallel Scenarios

1) Two projects simultaneously
- `opencode`: Project A
- `opencode-2`: Project B

2) Coding + verification simultaneously
- `opencode`: Implementation/modification
- `gemini`, `gemini-2`: Visual verification of output

3) Research + implementation + build
- `research` or `gemini`: Documentation/reference analysis
- `opencode`: Implementation
- `build`: Test/build monitoring

### Agent Selection (OpenCode)

| Task Nature | Recommended Agent | Switch |
|-------------|-------------------|--------|
| Quick fix/implementation | Sisyphus (default) | Default state |
| Complex autonomous implementation | Hephaestus | Tab x1 |
| Planning/strategy | Prometheus | Tab x2 |

## Operations Template

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Create sessions
tmux -S "$SOCKET" new -d -s opencode-2 -n main
tmux -S "$SOCKET" new -d -s gemini-2 -n main

# Send task
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork run refactoring'
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

## Important Notes

- Never mix Enter into the command string — always separate
- For commands with complex paths/quotes, execute via script file
- If pane capture is insufficient, use log file redirection as well
- Memory usage increases significantly with more sessions — limit concurrency
