---
name: tmux-agents
description: Spawn and monitor coding agents (Claude Code, Codex, Gemini, Ollama) in tmux sessions.
---

# tmux-agents — Agent Spawn/Monitoring Guide

Patterns for spawning coding agents in tmux, checking status, and running parallel operations.

## Agent Types

| Type | Agent ID | Runtime | Characteristics |
|------|----------|---------|-----------------|
| cloud | `claude` | Remote API | High-quality reasoning, stable |
| cloud | `codex` | Remote API | Strong code generation/modification |
| cloud | `gemini` | Remote API | Strong multimodal/long context |
| local | `ollama-claude` | Local Ollama | Cost reduction, offline capable |
| local | `ollama-codex` | Local Ollama | Optimized for local code tasks |

## Quick Commands

Commands below follow the tmux-agents helper script interface.

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

# 6) Kill
tmux kill-session -t opencode-2
```

## Parallel Agent Pattern

```bash
# Parallel spawn example
./spawn.sh --agent codex --session opencode --cwd /repo/a
./spawn.sh --agent claude --session opencode-2 --cwd /repo/b
./spawn.sh --agent gemini --session gemini --cwd /repo/a

# Status check after parallel progress
./status.sh list
./check.sh --session opencode
./check.sh --session opencode-2
./check.sh --session gemini
```

Operational principles:
- Separate implementation sessions from verification sessions
- Check long tasks at 10-30 second intervals
- Collect results sequentially after completion

## Local vs Cloud Selection

| Situation | Recommended | Reason |
|-----------|-------------|--------|
| Quality over speed | cloud | Latest model quality/reasoning strength |
| Long repeated tasks | local | Cost reduction, no rate limits |
| Network restrictions | local | Offline/air-gapped compatibility |
| Multimodal analysis needed | cloud (gemini) | Image/PDF processing quality |
| Sensitive code processing | local | Minimize data exfiltration |

## Ollama Setup

```bash
# Check Ollama status
ollama list

# Download required models (example)
ollama pull qwen2.5-coder:14b
ollama pull llama3.1:8b

# Verify local response
curl http://127.0.0.1:11434/api/tags
```

Recommendations:
- Prepare one coding model + one general conversation model
- Limit concurrent executions considering RAM/VRAM limits

## Tips

- Always specify session targets as `session:window.pane` (`opencode-2:0.0`)
- Text input: `send-keys -l` followed by separate Enter
- Output check: use `capture-pane -p -J -S -200` as default
- Failed sessions: immediately recreate and re-send the same prompt

## Helper Script Scope

`spawn.sh`, `status.sh`, `check.sh` follow the helper script interface provided by the official `openclaw/skills/tmux-agents` package.
This document provides operational knowledge from the OpenClaw/OmO perspective, not script usage itself.
