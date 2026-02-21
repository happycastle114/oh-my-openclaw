---
description: Delegate complex coding tasks to OmO (OpenCode) running in tmux. Use when tasks need deep codebase work, multi-file refactoring, or sustained autonomous execution.
---

# Delegate to OmO (OpenCode tmux)

Workflow for delegating large coding tasks from OpenClaw to oh-my-opencode running in the `opencode` tmux session.

## When to Use

- Complex multi-file coding tasks
- Deep codebase refactoring
- Tasks requiring LSP, AST-Grep, or build verification
- Sustained autonomous execution (ultrawork/ralph loop)
- Tasks that benefit from OmO's Prometheus planning + Atlas orchestration

## Prerequisites

- OpenCode tmux session (`opencode`) must be running
- oh-my-opencode plugin must be installed in OpenCode
- tmux socket at `/tmp/openclaw-tmux-sockets/openclaw.sock`

## Workflow Steps

### Step 1: Verify OmO Session
```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode 2>&1 && echo "READY" || echo "NOT RUNNING"
```

If not running, restart:
```bash
tmux -S "$SOCKET" kill-session -t opencode 2>/dev/null
tmux -S "$SOCKET" new -d -s opencode -n main
tmux -S "$SOCKET" send-keys -t opencode 'export NODE_OPTIONS="--max-old-space-size=8192" && cd /home/happycastle/Projects/<project> && opencode' Enter
```

### Step 2: Select Agent Mode

Choose the right OmO agent for the task:

| Task Type | Agent | How to Switch |
|-----------|-------|---------------|
| Quick implementation | **Sisyphus** (default) | Already active |
| Deep autonomous work | **Hephaestus** | Press Tab once |
| Strategic planning | **Prometheus** | Press Tab twice |

```bash
# Switch to Prometheus for planning
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 1
# Check current agent
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -5
```

### Step 3: Send Task

**Important**: Always use `send-keys -l` for text, then separate `Enter`:

```bash
# Send the task description
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork [task description here]'
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

For complex tasks, write a task file first:
```bash
# Write task to file
cat > /tmp/omo-task.md << 'EOF'
# Task: [Title]

## Description
[Detailed description]

## Requirements
- [Requirement 1]
- [Requirement 2]

## Constraints
- [Constraint 1]

## Expected Output
- [What should be produced]
EOF

# Send to OmO
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'Read /tmp/omo-task.md and execute the task described. ultrawork'
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

### Step 4: Monitor Progress

```bash
# Check latest output (last 50 lines)
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -50

# Check if still working (look for thinking indicators)
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -10
```

### Step 5: Collect Results

After OmO completes:
```bash
# Check what files were changed
cd /home/happycastle/Projects/<project>
git status
git diff --stat

# Read completion summary from OmO output
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -100
```

## Task Templates

### Feature Implementation
```
ultrawork Add [feature] to [module].
Requirements:
- [Specific requirement 1]
- [Specific requirement 2]
Follow existing patterns in [reference file].
Run tests after implementation.
```

### Bug Fix
```
ultrawork Fix [bug description].
Error: [error message]
File: [affected file]
Expected behavior: [what should happen]
```

### Refactoring
```
ultrawork Refactor [module/component].
Goals:
- [Goal 1]
- [Goal 2]
Constraints:
- Do NOT change public API
- All existing tests must pass
```

### Research + Implementation
```
Read /path/to/research.md for context.
ultrawork Implement [feature] based on the research findings.
```

## Error Recovery

If OmO gets stuck:
```bash
# Interrupt current operation
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape
sleep 1

# Send correction
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- '[correction or new instruction]'
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

If OmO session crashes:
```bash
# Restart session
tmux -S "$SOCKET" kill-session -t opencode
tmux -S "$SOCKET" new -d -s opencode -n main
tmux -S "$SOCKET" send-keys -t opencode 'export NODE_OPTIONS="--max-old-space-size=8192" && cd /home/happycastle/Projects/<project> && opencode' Enter
```

## Integration with OpenClaw

When OpenClaw receives a complex coding task:
1. OpenClaw agent reads the task and prepares a clear description
2. Writes task file if complex (with context, requirements, constraints)
3. Delegates to OmO via tmux
4. Monitors progress periodically
5. Reports results back to the user via messaging channel
