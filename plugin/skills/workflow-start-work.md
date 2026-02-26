---
name: workflow-start-work
description: "Execute an approved plan by delegating tasks to worker agents. Triggers on: /start_work. Activates Atlas persona for orchestrated execution."
---

# Start Work Workflow Skill

When the user invokes `/start_work [plan]`, load an existing plan and execute it.

## Persona

This workflow runs under **Atlas** (omoc_atlas) — the orchestrator. If you are not already Atlas, the system will switch you automatically.

## Hard Boundary

- Implementation runs through **delegated worker execution** via `omoc_delegate`
- Do NOT implement code directly as the orchestrator — delegate it

## Workflow

### Phase 1: Plan Loading
1. Load the most recent plan from `workspace/plans/`, or the specified plan
2. Verify plan status is "approved"
3. Create todo items for each task in the plan

### Phase 2: Task Execution
4. Execute tasks in dependency order:
   - Mark task as in_progress in todo list
   - Delegate via `omoc_delegate(task_description="7-element prompt", category="...")`
   - On sub-agent completion notification → verify against acceptance criteria → proceed immediately
   - **Never stop between tasks** — completion notification = action trigger
5. Parallel tasks: fire multiple `omoc_delegate(..., background=true)` simultaneously
6. Collect and verify results upon each completion

### Phase 3: Error Handling
7. On failure: retry with more context (max 2 retries)
8. Still failing: escalate to Oracle via `omoc_delegate(category="ultrabrain", agent_id="omoc_oracle")`
9. Oracle can't resolve: pause and ask user

### Phase 4: Completion
10. Verify all acceptance criteria met
11. Run build/test verification
12. Update plan status to "completed"
13. Record wisdom/learnings

## Status Updates

After each task completion:
```
[N/M] Task: <name> - COMPLETED
  - <what was done>
  - <files modified>
  Next: <next task name>
```
