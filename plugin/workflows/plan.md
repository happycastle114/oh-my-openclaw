---
description: Strategic planning workflow - analyze requirements and create execution plan
---

# Plan Workflow

Strategic planning workflow that analyzes requirements and creates a structured execution plan before any implementation begins.

## Hard Boundary

- Planning role does not implement code.
- If execution is needed, plan MUST include OmO delegation steps using `omoc_delegate` and tmux orchestration (`opencode-controller`, `tmux`, `tmux-agents`).

## When to Use

- Starting a new feature or project
- Complex multi-step tasks
- When requirements are ambiguous and need clarification
- Before any `/ultrawork` or `/start_work` invocation

## Workflow Steps

### Phase 1: Context Gathering

1. **Read existing context**
   - Check workspace for existing plans: `workspace/plans/`
   - Check wisdom notepads: `workspace/notepads/`
   - Review any relevant AGENTS.md or project documentation

2. **Analyze the request**
   - What is the user asking for?
   - What are the explicit requirements?
   - What are the implicit requirements?
   - What constraints exist?

### Phase 2: Gap Analysis

3. **Identify unknowns**
   - What information is missing?
   - What assumptions are being made?
   - What dependencies exist?

4. **Ask clarifying questions** (if needed)
   - Only ask questions that materially affect the plan
   - Batch questions together, don't ask one at a time
   - Provide default assumptions if the user doesn't respond

### Phase 3: Plan Creation

5. **Create the execution plan**
   - Save to `workspace/plans/YYYY-MM-DD_<slug>.md`
   - Use the following structure:

```markdown
# Plan: <Title>

**Created**: YYYY-MM-DD HH:MM
**Status**: draft | approved | in-progress | completed
**Category**: quick | deep | ultrabrain | visual-engineering

## Goal
<One sentence description of what we're building>

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Tasks
### Task 1: <Name>
- **Category**: quick | deep
- **Agent**: sisyphus-junior | oracle | explore | librarian
- **Dependencies**: none | Task N
- **Description**: What needs to be done
- **Execution Mode**: `omoc-delegated` | `planning-only`
- **Acceptance Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2

### Task 2: <Name>
...

## Execution Order
1. Task 1 (no dependencies)
2. Task 2, Task 3 (parallel, depend on Task 1)
3. Task 4 (depends on Task 2 + Task 3)

## Risks
- Risk 1: mitigation strategy
- Risk 2: mitigation strategy

## Verification
- [ ] All acceptance criteria met
- [ ] Code builds without errors
- [ ] Tests pass (if applicable)
```

### Phase 4: Plan Review

6. **Self-review the plan**
   - Is every task actionable and specific?
   - Are dependencies correctly identified?
   - Is the execution order optimal (maximize parallelism)?
   - Are acceptance criteria measurable?

7. **Present plan to user**
   - Show the plan summary
   - Highlight any risks or assumptions
   - Ask for approval before proceeding

## Integration with Other Workflows

- After plan approval, use `/start_work` to begin execution
- Or use `/ultrawork` for fully automated execution without stops
- Plan files persist in `workspace/plans/` for future reference
- Implementation tasks must be executed through delegated OmO/tmux sessions, not direct planner execution

## Wisdom Integration

After planning, record any insights:
- New patterns discovered → `workspace/notepads/learnings.md`
- Key decisions made → `workspace/notepads/decisions.md`
- Potential issues identified → `workspace/notepads/issues.md`
