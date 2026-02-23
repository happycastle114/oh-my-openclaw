---
name: tmux-agents
description: Spawn and monitor coding agents (Claude Code, Codex, Gemini, Ollama) in tmux sessions.
---

# tmux-agents — Agent Spawn/Monitoring Guide

Collection of execution patterns for launching coding agents inside tmux, checking their status, and operating them in parallel.

## Agent Types

| Category | Agent ID | Execution Location | Characteristics |
|----------|----------|-------------------|-----------------|
| cloud | `claude` | Remote API | High-quality reasoning, stable |
| cloud | `codex` | Remote API | Strong code generation/modification |
| cloud | `gemini` | Remote API | Multimodal/long context strength |
| local | `ollama-claude` | Local Ollama | Cost reduction, offline capable |
| local | `ollama-codex` | Local Ollama | Optimized for local coding tasks |

## Quick Command Reference

The following commands are based on the tmux-agents helper script interface.

```bash
# 1) Spawn
./spawn.sh --agent codex --session opencode-2 --cwd /path/to/project

# 2) List
./status.sh list

# 3) Health check
./check.sh --session opencode-2

# 4) Attach
tmux attach -t opencode-2

# 5) Send instruction (safe input)
tmux send-keys -t opencode-2:0.0 -l -- 'Fix failing tests in auth module'
tmux send-keys -t opencode-2:0.0 Enter

# 6) Terminate
tmux kill-session -t opencode-2
```

## Parallel Agent Pattern

```bash
# Parallel spawn example
./spawn.sh --agent codex --session opencode --cwd /repo/a
./spawn.sh --agent claude --session opencode-2 --cwd /repo/b
./spawn.sh --agent gemini --session gemini --cwd /repo/a

# Check status after parallel execution
./status.sh list
./check.sh --session opencode
./check.sh --session opencode-2
./check.sh --session gemini
```

Operating principles:
- Separate implementation sessions from verification sessions
- For long-running tasks, check status periodically at 10-30 second intervals
- Collect results sequentially per session after completion

## Local vs Cloud Selection Criteria

| Situation | Recommended | Reason |
|-----------|------------|--------|
| Quality over speed | cloud | Latest model quality/reasoning strength |
| Long-running repetitive tasks | local | Cost reduction, no call limits |
| External network constraints | local | Offline/closed network support |
| Multimodal analysis needed | cloud(gemini) | Image/PDF processing quality |
| Sensitive code local processing | local | Minimize external data transmission |

## Ollama Setup

```bash
# Verify Ollama is running
ollama list

# Download required models (example)
ollama pull qwen2.5-coder:14b
ollama pull llama3.1:8b

# Verify local response
curl http://127.0.0.1:11434/api/tags
```

Recommendations:
- Prepare one coding model + one general conversation model
- Limit concurrent execution based on RAM/VRAM constraints

## Tips

- Always fix session target as `session:window.pane` (e.g., `opencode-2:0.0`)
- Separate text input with `send-keys -l` followed by Enter
- Use `capture-pane -p -J -S -200` as default for output verification
- Immediately recreate failed sessions and reinject the same prompt

## Helper Script Scope

`spawn.sh`, `status.sh`, `check.sh` follow the official helper script interface provided by the `openclaw/skills/tmux-agents` package.
This document provides operational knowledge from an OpenClaw/OmO perspective, not the script usage itself.
