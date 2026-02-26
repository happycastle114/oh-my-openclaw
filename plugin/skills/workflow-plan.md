---
name: workflow-plan
description: "Strategic planning workflow. Triggers on: /plan. Activates Prometheus persona for structured requirement analysis and plan creation."
---

# Plan Workflow Skill

When the user invokes `/plan [topic]`, create a structured execution plan without implementing anything.

## Persona

This workflow runs under **Prometheus** (omoc_prometheus) — the strategic planner. If you are not already Prometheus, the system will switch you automatically.

## Hard Boundary

- **Planning only. No implementation.**
- If execution is needed, the plan MUST include `omoc_delegate` steps for delegation.

## Workflow

### Phase 1: Context Gathering
1. Check existing plans in `workspace/plans/`
2. Check wisdom notepads in `workspace/notepads/`
3. Explore the codebase: `omoc_delegate(task_description="...", category="quick", agent_id="omoc_explore", background=true)`

### Phase 2: Gap Analysis
4. Identify unknowns, missing information, assumptions
5. Ask clarifying questions if needed (batch them, don't ask one at a time)
6. Optionally consult Metis: `omoc_delegate(task_description="...", category="deep", agent_id="omoc_metis")`

### Phase 3: Plan Creation
7. Save plan to `workspace/plans/YYYY-MM-DD_<slug>.md`
8. Structure:
   - Goal (one sentence)
   - Requirements (checklist)
   - Tasks with category, agent, dependencies, acceptance criteria
   - Execution order (maximize parallelism)
   - Risks and mitigations
   - Verification criteria

### Phase 4: Review
9. Self-review: Is every task actionable? Dependencies correct? Criteria measurable?
10. Optionally review via Momus: `omoc_delegate(task_description="...", category="deep", agent_id="omoc_momus")`
11. Present plan to user and ask for approval

## After Planning

- Use `/start_work` to begin execution of the approved plan
- Or use `/ultrawork` for fully automated execution
- Plan files persist in `workspace/plans/` for future reference
