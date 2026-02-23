---
name: workflow-auto-rescue
description: Session recovery workflow with checkpointing, failure detection, and automatic restore using file-based checkpoints + memory_search.
---

# Auto-Rescue Workflow

Automatically recover sessions from failures/interruptions during long-running work.

## When to Use

- Long implementation/refactoring sessions
- Multi-step work (5+ steps)
- Debugging/build recovery work with high failure probability

## Core Mechanism

- **Checkpoint Saving**: Save key steps with `write` tool (`workspace/checkpoints/`)
- **Checkpoint Retrieval**: On recovery, use `read` tool + `memory_search` (OpenClaw native)
- **Auto Restore**: Restart from the most recent healthy state

> **Note**: OpenClaw's `group:memory` contains only `memory_search`/`memory_get`;
> `memory_store` does not exist. Storage must always be file-based (`write`).

## Checkpoint Schema

Save to `workspace/checkpoints/checkpoint-<timestamp>.json` in the following format:

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

1. Save checkpoint baseline when session starts (`write` → `workspace/checkpoints/`)
2. Update checkpoint each time todo phase changes
3. Pre-save before high-risk work (large edit/build/test)

### 2) Failure Detection

Trigger rescue on any of the following:

- Same error occurs 3 times consecutively
- Build/test fails repeatedly and progress is blocked
- Session interrupted (timeout/forced interrupt/agent stop)

### 3) Recovery Procedure

1. Use `read` tool to read most recent checkpoint file in `workspace/checkpoints/`
2. Select the point where most recent `verification` is healthy (pass)
3. Resume from that point's `next_action`
4. If same failure recurs, rollback to one checkpoint earlier

### 4) Post-Recovery

1. Save recovery success state as new checkpoint file (`write`)
2. Record failure cause/solution in `workspace/notepads/issues.md`
3. Continue remaining steps

## OpenClaw Tool Mapping

| Action            | Tool to Use     | Notes                                         |
| --------------- | --------------- | -------------------------------------------- |
| Save checkpoint | `write`         | `workspace/checkpoints/checkpoint-<ts>.json` |
| Read checkpoint | `read`          | Specify file path directly                          |
| Search past memory  | `memory_search` | OpenClaw `group:memory`                      |
| Retrieve specific memory  | `memory_get`    | Key-based                                     |
| Check file list | `exec` (ls)     | Scan checkpoint directory                     |

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
- Same failure loop is prevented
