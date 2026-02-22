# Installation

This guide walks you through installing Oh-My-OpenClaw and getting your AI agent orchestration environment up and running.

---

## Prerequisites

Before installing Oh-My-OpenClaw, ensure the following are in place:

### Required

- **OpenClaw** — The core agent runtime must be installed and accessible in your `PATH`.
  - Verify with: `openclaw --version`
- **Messaging channel** — A configured channel for agent communication (e.g., a Slack workspace, Discord server, or compatible messaging backend).
  - Oh-My-OpenClaw routes agent messages through this channel.

### Optional (Recommended)

- **[OpenCode](https://github.com/sst/opencode)** — AI coding assistant used by several built-in skills.
  - Install: `npm install -g opencode` or follow the OpenCode docs.
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** — Required for Gemini-backed agent tasks.
  - Install: `npm install -g @google/gemini-cli`
- **[tmux](https://github.com/tmux/tmux)** — Required for persistent agent sessions and background task management.
  - macOS: `brew install tmux`
  - Ubuntu/Debian: `sudo apt install tmux`
  - Verify: `tmux -V`

---

## Quick Install
The fastest path to a working installation:

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

That's it. The plugin registers skills, hooks, and tools automatically. Restart the gateway and you're done.

If you prefer manual setup or want to contribute:

```bash
git clone https://github.com/happycastle114/oh-my-openclaw.git ~/.oh-my-openclaw
ln -s ~/.oh-my-openclaw ~/.openclaw/workspace/skills/oh-my-openclaw
bash ~/.oh-my-openclaw/scripts/init-deep.sh
```

---

## Installation Methods

Choose the method that best fits your workflow.

### Option 1: Clone + Symlink (Recommended)

Best for contributors or users who want to stay up to date with the latest changes.

```bash
# Clone to a stable location
git clone https://github.com/happycastle114/oh-my-openclaw.git ~/.oh-my-openclaw

# Symlink skills into OpenClaw's skill directory
ln -s ~/.oh-my-openclaw/skills ~/.openclaw/skills

# Symlink the plugin config (optional, for plugin features)
ln -s ~/.oh-my-openclaw/plugin ~/.openclaw/plugin/oh-my-openclaw

# Initialize
bash ~/.oh-my-openclaw/scripts/init-deep.sh
```

**Updating:**
```bash
cd ~/.oh-my-openclaw && git pull
```

---

### Option 2: Direct Clone

Best for users who want a self-contained installation without symlinks.

```bash
# Clone directly into OpenClaw's skills directory
git clone https://github.com/happycastle114/oh-my-openclaw.git ~/.openclaw/skills/oh-my-openclaw

# Run initialization
bash ~/.openclaw/skills/oh-my-openclaw/scripts/init-deep.sh
```

> **Note:** With this method, updating requires running `git pull` inside `~/.openclaw/skills/oh-my-openclaw`.

---

### Option 3: Global Skill

Best for users who want Oh-My-OpenClaw available system-wide across multiple projects.

```bash
# Clone to a global location
git clone https://github.com/happycastle114/oh-my-openclaw.git /usr/local/share/oh-my-openclaw

# Add to OpenClaw's global skill path
echo 'export OPENCLAW_SKILL_PATH="/usr/local/share/oh-my-openclaw/skills:$OPENCLAW_SKILL_PATH"' >> ~/.bashrc
source ~/.bashrc

# Initialize
bash /usr/local/share/oh-my-openclaw/scripts/init-deep.sh
```

For Zsh users, replace `~/.bashrc` with `~/.zshrc`.

---

## Plugin Installation
Oh-My-OpenClaw ships as an npm plugin (`@happycastle/oh-my-openclaw`) with full `openclaw.plugin.json` manifest support.

### Via OpenClaw CLI (Recommended)

```bash
openclaw plugins install @happycastle/oh-my-openclaw
```

This installs the plugin, registers all hooks/tools/commands, and loads bundled skills automatically.

### Via Local Link (Development)

```bash
cd path/to/oh-my-openclaw/plugin
npm install && npm run build
openclaw plugins install -l .
```

### Verify

```bash
openclaw plugins list
# Should show: oh-my-openclaw (enabled)
```

> **Tip:** After installation, restart the OpenClaw gateway for changes to take effect.

---

## tmux Setup

Oh-My-OpenClaw uses tmux for persistent agent sessions. Agents run inside a dedicated tmux server so they survive terminal disconnections and can be managed independently.

### Socket Location

All Oh-My-OpenClaw tmux sessions use a shared socket:

```
/tmp/openclaw-tmux-sockets/openclaw.sock
```

### Creating the Socket Directory

```bash
mkdir -p /tmp/openclaw-tmux-sockets
```

> **Note:** `/tmp` is cleared on reboot. Add this `mkdir` command to your shell profile or a startup script if you need it to persist across reboots.

### Starting the tmux Server

```bash
tmux -S /tmp/openclaw-tmux-sockets/openclaw.sock new-session -d -s openclaw
```

### Creating Agent Sessions

Each agent can run in its own named tmux window or session:

```bash
# Create a new window for a specific agent
tmux -S /tmp/openclaw-tmux-sockets/openclaw.sock new-window -t openclaw -n my-agent

# List all active sessions
tmux -S /tmp/openclaw-tmux-sockets/openclaw.sock list-sessions

# Attach to the main session
tmux -S /tmp/openclaw-tmux-sockets/openclaw.sock attach -t openclaw
```

### Detaching Without Stopping Agents

Press `Ctrl+B`, then `D` to detach from a tmux session while leaving agents running in the background.

---

## Verify Installation

### 1. Send a Message to an Agent

With OpenClaw running, send a test message through your configured messaging channel:

```
@openclaw ping
```

The agent should respond with a confirmation message. If it does not respond within 30 seconds, check the OpenClaw logs and ensure your messaging channel is correctly configured.

### 2. Run the Test Suite

```bash
cd ~/.oh-my-openclaw/plugin
npm run test
```

**Expected output:**

```
Test Suites: X passed
Tests:       37 passed, 37 total
```

All 37 tests must pass for a healthy installation. If any tests fail, review the error output and ensure:
- All dependencies are installed (`npm install`)
- The plugin was built successfully (`npm run build`)
- Your Node.js version meets the minimum requirement (Node 18+)

### 3. Check the Plugin Load

```bash
openclaw status
```

Look for `oh-my-openclaw` listed under loaded plugins. If it is missing, verify the plugin path and rebuild if necessary.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Agent does not respond | Messaging channel misconfigured | Re-check channel credentials in OpenClaw config |
| `npm run build` fails | Missing Node.js or wrong version | Install Node 18+ via `nvm` or your package manager |
| tmux socket not found | `/tmp` was cleared or directory missing | Run `mkdir -p /tmp/openclaw-tmux-sockets` |
| Tests fail | Stale build artifacts | Run `npm run build` then `npm run test` again |
| Skills not found | Symlink broken or path not set | Re-run the symlink step or check `OPENCLAW_SKILL_PATH` |

---

## Next Steps

- **[Overview](./overview.md)** — Understand the Oh-My-OpenClaw architecture and core concepts.
- **[Orchestration](./orchestration.md)** — Learn how to coordinate multiple agents and build multi-step workflows.
