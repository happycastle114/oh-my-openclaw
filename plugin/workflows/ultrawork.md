---
description: One-command full automation workflow. Analyzes task, creates plan, executes all steps, verifies results.
---

# Ultrawork Workflow

Complete automation workflow that takes a task from analysis to verified completion.

## Trigger
When the user invokes `/ultrawork [task description]` or ultrawork mode is activated.

## Prerequisites
- Task description must be clear and actionable
- Working directory must be a valid project

## Workflow Steps

### Phase 1: Analysis (Prometheus)
```
1. Read the task description carefully
2. Analyze the current codebase state
   - Run `git status` to check working tree
   - Read relevant files to understand context
   - Identify affected modules and dependencies
3. Create a structured plan with:
   - Clear task breakdown (numbered steps)
   - Dependencies between steps
   - Category assignment for each step (quick/deep/ultrabrain/visual-engineering)
   - Verification criteria for each step
4. Save plan to `workspace/plans/ultrawork-[timestamp].md`
```

### Phase 2: Execution (Atlas + Workers)
```
5. For each step in the plan:
   a. Mark step as in_progress in todo list
   b. Delegate coding execution to worker sessions:
      - sessions_spawn(task=..., agentId="omoc_sisyphus", model=..., label=...)
      - 전문 에이전트가 필요하면 agentId로 지정 (omoc_oracle, omoc_explore 등)
   c. 서브에이전트 완료 통지를 받으면 즉시:
      - 결과를 확인한다 (멈추지 않는다!)
      - 성공 기준과 대조 검증한다
      - 검증 통과 → 즉시 다음 step 진행
      - 검증 실패 → 재시도 (최대 3회)
   d. Record any learnings in wisdom notepad
   e. Mark step as completed
   f. If step fails after 3 retries:
      - Record issue and continue with next independent step

⚠️ CONTINUATION RULE (강제):
- 서브에이전트 완료 통지 = 행동 트리거. 절대 멈추지 않는다.
- 모든 step이 완료될 때까지 자동으로 다음 step을 진행한다.
- 사용자 확인이 필요한 경우는 plan에 명시된 경우만 해당한다.
```

### Phase 3: Verification
```
6. Run full verification:
   - Build check (if applicable): `npm run build`, `cargo build`, `go build`, etc.
   - Lint check (if applicable)
   - Test check (if applicable)
   - LSP diagnostics check
7. Fix any issues found during verification
8. Run verification again until clean
```

### Phase 4: Completion
```
9. Generate completion summary:
   - What was done
   - What was changed (files modified/created/deleted)
   - Any issues encountered and how they were resolved
   - Wisdom accumulated
10. Update wisdom notepads with final learnings
11. Mark all todos as completed
```

## Todo Enforcer Integration

During ultrawork execution, the following directive is active:

> You MUST use TodoWrite to track every task. Mark tasks in_progress when starting,
> completed when done. NEVER leave tasks unmarked. If you discover new subtasks,
> add them immediately. Do not stop until all tasks are completed.

## Error Handling

- **Build failures**: Fix immediately, re-verify
- **Test failures**: Fix the code, not the test (unless test is wrong)
- **Lint errors**: Auto-fix where possible, manual fix otherwise
- **Timeout**: Save progress, report partial completion with clear next steps

## Output

The workflow produces:
1. Completed task with all changes applied
2. Plan file in `workspace/plans/`
3. Updated wisdom notepads (if learnings occurred)
4. Completion summary in the conversation
