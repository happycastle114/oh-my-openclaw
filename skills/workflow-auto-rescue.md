---
name: workflow-auto-rescue
description: Session recovery workflow with checkpointing, failure detection, and automatic restore using file-based checkpoints + memory_search.
---

# Auto-Rescue Workflow

Automatically recover sessions after failure/interruption during long-running tasks.

## When to Use

- Long implementation/refactoring sessions
- Multi-step tasks (5+ steps)
- Debugging/build recovery tasks with high failure probability

## Core Mechanism

- **Checkpoint save**: Save file via `write` tool at major steps (`workspace/checkpoints/`)
- **Checkpoint lookup**: Use `read` tool + `memory_search` (OpenClaw native) for recovery
- **Auto-restore**: Restart from the most recent healthy state

> **Note**: OpenClaw's `group:memory` only has `memory_search`/`memory_get`.
> `memory_store` does not exist. Storage must be file-based (`write`).

## Checkpoint Schema

Save to `workspace/checkpoints/checkpoint-<timestamp>.json` in this format:

```json
{
  "type": "session-checkpoint",
  "session_id": "<id>",
  "task": "<current task>",
  "step": "<current step>",
  "changed_files": ["path/a", "path/b"],
  "verification": {
    "diagnostics": "pass|fail|not-run",
    "tests": "pass|fail|not-run",
    "build": "pass|fail|not-run"
  },
  "next_action": "<what to do next>",
  "timestamp": "<iso8601>"
}
```

## Workflow Steps

### 1) Start Monitoring

1. Save checkpoint baseline at session start (`write` → `workspace/checkpoints/`)
2. Update checkpoint at every step transition (based on todos)
3. Pre-save before potentially failing tasks (large edit/build/test)

### 2) Failure Detection

Trigger rescue if any of these occur:

- Same error 3 consecutive times
- Build/test continuously failing with no progress possible
- Session interruption (timeout/forced interrupt/agent stop)

### 3) Recovery Procedure

1. Read the most recent checkpoint file from `workspace/checkpoints/` via `read` tool
2. Select the latest checkpoint where `verification` is passing
3. Resume from that checkpoint's `next_action`
4. If same failure recurs, roll back to one checkpoint earlier

### 4) Post-Recovery

1. Save recovery success state as a new checkpoint file (`write`)
2. Record failure cause/resolution in `workspace/notepads/issues.md`
3. Continue with remaining steps

## OpenClaw Tool Mapping

| Action | Tool | Notes |
|--------|------|-------|
| Checkpoint save | `write` | `workspace/checkpoints/checkpoint-<ts>.json` |
| Checkpoint read | `read` | Direct file path |
| Search past context | `memory_search` | OpenClaw `group:memory` |
| Get specific memory | `memory_get` | key-based |
| List files | `exec` (ls) | Scan checkpoint directory |

## Example

```text
# Save
write({ path: "workspace/checkpoints/checkpoint-2026-02-22T13-00.json", content: "{ ... }" })

# Read on recovery
read({ path: "workspace/checkpoints/checkpoint-2026-02-22T13-00.json" })

# Search session memory for related context
memory_search({ query: "session-checkpoint auth refactor" })
```

## Completion Criteria

- Work actually resumes after recovery
- Latest checkpoint file is saved
- Same-failure loops are blocked
