---
description: Start execution from an approved plan - delegate tasks to worker agents
---

# Start Work Workflow

Execute an approved plan by delegating tasks to appropriate worker agents, tracking progress, and verifying completion.

## Hard Boundary

- Implementation must run through delegated worker execution.
- Prefer OmO/OpenCode tmux orchestration for coding work (`opencode-controller`, `tmux`, `tmux-agents`).
- Do not complete coding phases via direct inline implementation by the orchestrator.

## Prerequisites

- An approved plan exists in `workspace/plans/`
- Plan status is "approved" or "in-progress"

## Workflow Steps

### Phase 1: Plan Loading

1. **Load the plan**
   - Read the most recent plan from `workspace/plans/`
   - Or specify a plan: `/start_work <plan-file>`
   - Verify plan status is "approved"
   - Update plan status to "in-progress"

2. **Initialize tracking**
   - Create todo items for each task in the plan
   - Set up wisdom notepads if not already present

### Phase 2: Task Execution

3. **Execute tasks in dependency order**

   For each task (respecting execution order from plan):

   a. **Mark task as in-progress** in todo list

   b. **Select the right agent** based on task category:
   
   | Category | Agent | Model |
   |----------|-------|-------|
   | quick | sisyphus-junior | claude-sonnet-4-6 |
   | deep | sisyphus-junior | claude-opus-4-6-thinking |
   | ultrabrain | oracle | claude-opus-4-5-thinking |
   | visual-engineering | sisyphus-junior | claude-opus-4-6-thinking |

   c. **Delegate the task** via `omoc_delegate`:
   ```
   omoc_delegate(
     task_description="7-element prompt (TASK/OUTCOME/SKILLS/TOOLS/MUST DO/MUST NOT/CONTEXT)",
     category="deep"  # auto-selects agent + model
   )
   # → Execute the returned sessions_spawn instruction immediately
   ```

   c-1. **Mandatory execution path for coding tasks**
   - Use `omoc_delegate` for all delegation — it selects the right agent automatically
   - For implementation-heavy tasks, route to OmO via tmux orchestration stack
   - Require execution evidence (changed files, test/build outputs) before marking done

   d. **Sub-agent completion notification → act immediately** (Mandatory)
   - When completion notification is received, check results immediately
   - Verify against acceptance criteria
   - Do NOT stop — proceed to next task immediately

   e. **Mark task as completed** in todo list

   f. **Record wisdom** if any insights were gained

4. **Handle parallel tasks**
   - Tasks with no mutual dependencies can run in parallel
   - Use multiple `omoc_delegate` calls simultaneously (with `background=true`)
   - Collect and verify results immediately upon each completion notification
   - After all parallel tasks complete, start dependent tasks immediately

### Phase 3: Error Handling

5. **On task failure**
   - Record the error in `workspace/notepads/issues.md`
   - Attempt retry with more context (max 2 retries)
   - If still failing, escalate to oracle agent for debugging
   - If oracle can't resolve, pause and ask user

6. **On blocking dependency**
   - Skip blocked tasks, continue with independent tasks
   - Return to blocked tasks when dependency resolves

### Phase 4: Completion

7. **Verify all tasks**
   - Check all acceptance criteria are met
   - Run build/test verification if applicable
   - Review overall coherence of changes

8. **Update plan status**
   - Mark plan as "completed"
   - Record completion time
   - Summarize what was accomplished

9. **Final wisdom capture**
   - Record learnings in `workspace/notepads/learnings.md`
   - Record any decisions in `workspace/notepads/decisions.md`
   - Note any remaining issues in `workspace/notepads/issues.md`

## Status Update Format

After each task completion, output:

```
[N/M] Task: <name> - COMPLETED
  - <what was done>
  - <files modified>
  Next: <next task name>
```

## Integration

- Plans come from `/plan` workflow
- `/ultrawork` combines `/plan` + `/start_work` automatically
- Wisdom notepads persist across sessions for future reference
