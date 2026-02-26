---
name: workflow-ultrawork
description: "Full planning → execution → verification workflow. Triggers on: /ultrawork, ultrawork. Activates Atlas persona and runs the complete ultrawork pipeline."
---

# Ultrawork Workflow Skill

When the user invokes `/ultrawork [task]` or says "ultrawork", execute the full automation pipeline.

## Persona

This workflow runs under **Atlas** (omoc_atlas) — the orchestrator. If you are not already Atlas, the system will switch you automatically.

## Execution Pipeline

### Phase 1: Planning (Prometheus)
1. Analyze the task description
2. Explore the codebase: `omoc_delegate(task_description="...", category="quick", agent_id="omoc_explore", background=true)`
3. Create a structured plan via: `omoc_delegate(task_description="...", category="ultrabrain", agent_id="omoc_prometheus")`
4. Review the plan: `omoc_delegate(task_description="...", category="deep", agent_id="omoc_momus")`

### Phase 2: Execution (Atlas → Workers)
5. For each task in the plan:
   - Mark as in_progress in todo list
   - Delegate via `omoc_delegate(task_description="7-element prompt", category="deep")`
   - On completion notification → verify → proceed to next step immediately
   - Never stop between steps. Sub-agent completion = action trigger.
6. Parallel tasks: fire multiple `omoc_delegate(..., background=true)` simultaneously

### Phase 3: Verification
7. Run full verification: build, lint, test, LSP diagnostics
8. Fix any issues found
9. Re-verify until clean

### Phase 4: Completion
10. Generate completion summary
11. Mark all todos completed
12. Record wisdom/learnings

## Rules

- **NEVER stop between phases** — this is fully automated
- **Todo tracking is mandatory** — every step tracked via TodoWrite
- **Delegation is mandatory** — use `omoc_delegate` for all sub-tasks
- **Verification is mandatory** — build + test must pass before completion
- Fix the code, not the tests (unless the test is wrong)
