---
name: delegation-prompt
description: Sub-agent delegation guide based on sessions_spawn. 7-element prompt + sessions_spawn calling pattern.
---

# Delegation Prompt + sessions_spawn Guide

The core concept of OmO is **leveraging sub-agents**. In oh-my-openclaw, we use OpenClaw's `sessions_spawn` to create actual sub-agents.

## sessions_spawn Usage

```
sessions_spawn(
  task="...",           # 7-element prompt (see below)
  mode="run",           # "run" (one-time) | "session" (persistent)
  model="...",          # Model by category (see table below)
  agentId="...",        # Specify specific agent (optional — omoc_prometheus, omoc_sisyphus, etc.)
  label="...",          # Identification label (optional)
  thread=true           # Deliver results via Discord thread (optional)
)
```

### Designate Specialist Agents with agentId

When you specify `agentId`, that agent's persona/permissions/model are automatically applied:

| agentId | Role | Permissions |
|---------|------|-------------|
| `omoc_prometheus` | Strategic planning | read-only (no code modification) |
| `omoc_atlas` | Orchestration | read-only (no code modification) |
| `omoc_sisyphus` | Implementation worker | full (code modification allowed) |
| `omoc_hephaestus` | Deep implementation | full (code modification allowed) |
| `omoc_oracle` | Architecture consulting | read-only |
| `omoc_explore` | Code exploration | read-only |
| `omoc_librarian` | Documentation research | read-only |
| `omoc_metis` | Gap analysis | read-only |
| `omoc_momus` | Plan review | read-only |

When `agentId` is omitted, the default agent runs according to the `model`.

## Category-Based Model Mapping

| Category | Model | Use Case |
|----------|-------|----------|
| quick | claude-sonnet-4-6 | Simple edits, file exploration, search |
| deep | claude-opus-4-6-thinking | Complex refactoring, analysis, autonomous work |
| ultrabrain | gpt-5.3-codex | Deep reasoning, architecture design |
| visual-engineering | gemini-3.1-pro | Frontend, UI/UX, design |
| writing | claude-sonnet-4-6 | Documentation, technical writing |

## Delegation Decision Criteria

Basic principle: **Implementation/modification/refactoring/testing/build-related tasks fundamentally require sessions_spawn delegation**.

### When to Use sessions_spawn (Sub-agents)
- **Parallelizable independent tasks** (validating multiple files, exploring multiple repos)
- **Time-consuming tasks** (large-scale refactoring, full codebase analysis)
- **Tasks better suited to different models** (reasoning→gpt-5.3, visual→gemini)
- **Asynchronous execution with background=true, then receive results**

### When to Handle Directly (No spawn needed)
- Pure explanation/summary/decision-making only (no file changes)
- Short responses to user confirmation questions
- Plan document creation itself (pre-implementation stage)

### OmO Implementation Delegation (Mandatory)

- Tasks requiring code changes are delegated via `opencode-controller` + `tmux` + `tmux-agents` path.
- "Direct handling" in the implementation phase is not an exception — it's **forbidden**.
- Create at least 1 execution session and collect/verify results.

## 7 Required Elements (Prompt Quality = Delegation Quality)

1. **TASK**: Clearly instruct a single atomic task
2. **EXPECTED OUTCOME**: Specify deliverables and success criteria
3. **REQUIRED SKILLS**: List required skills
4. **REQUIRED TOOLS**: Whitelist available tools
5. **MUST DO**: Detailed requirements that must be performed
6. **MUST NOT DO**: Prohibitions (scope expansion, file modification bans, etc.)
7. **CONTEXT**: Paths, constraints, existing patterns, downstream purposes

## Execution Examples

### Example 1: Code Analysis (deep, background)
```
sessions_spawn(
  task="""
  1) TASK: Analyze test coverage in /home/happycastle/Projects/my-app/src/ directory
  2) EXPECTED OUTCOME: List of files without tests + prioritized test writing plan
  3) REQUIRED SKILLS: none
  4) REQUIRED TOOLS: read, exec (jest --coverage)
  5) MUST DO: Include complexity and importance assessment for each file
  6) MUST NOT DO: Do not write test files directly
  7) CONTEXT: Jest + TypeScript project, src/utils/ is most critical
  """,
  mode="run",
  model="claude-opus-4-6-thinking",
  label="test-coverage-analysis"
)
```

### Example 2: Web Research (quick, background)
```
sessions_spawn(
  task="""
  1) TASK: Investigate Next.js 15 Server Actions changes
  2) EXPECTED OUTCOME: Summary of major changes + migration guide
  3) REQUIRED SKILLS: web-search
  4) REQUIRED TOOLS: web_fetch, exec (mcporter)
  5) MUST DO: Check both official docs and community feedback
  6) MUST NOT DO: Do not modify code
  7) CONTEXT: Currently using Next.js 14, considering upgrade
  """,
  mode="run",
  model="claude-sonnet-4-6",
  label="nextjs-migration-research"
)
```

### Example 3: Parallel Tasks (Multiple spawns simultaneously)
```
# Execute 3 sub-agents simultaneously
sessions_spawn(task="Refactor file A...", mode="run", model="claude-opus-4-6-thinking", label="refactor-a")
sessions_spawn(task="Refactor file B...", mode="run", model="claude-opus-4-6-thinking", label="refactor-b")
sessions_spawn(task="Write tests...", mode="run", model="claude-sonnet-4-6", label="write-tests")
```

## Relationship with omoc_delegate

The `omoc_delegate` tool only provides category → model mapping. Actual sub-agent creation must always call `sessions_spawn`.

**Correct flow:**
1. Use `omoc_delegate` to confirm category/model (optional)
2. Create actual sub-agent with `sessions_spawn`
3. Receive automatic notification on completion (push-based)

**Never do:**
- Poll `subagents list` in a loop — results come back automatically
- Expect results immediately after spawn — execution is asynchronous

## Quality Checklist

- [ ] Success criteria are measurable
- [ ] Input paths/scope are specified
- [ ] Prohibitions are unambiguous
- [ ] Retry/reporting method is defined on failure
- [ ] Appropriate category/model selected
- [ ] mode is correct (run=one-time, session=persistent)

## Mandatory Actions After Sub-Agent Completion

Sub-agent completion notification ("✅ Subagent finished") is **not FYI — it's an action trigger**.

### When you receive completion notification, you must:

1. **Verify results** — Immediately read the results produced by the sub-agent
2. **Check against success criteria** — Compare and verify against EXPECTED OUTCOME specified during delegation
3. **Execute next step** — Immediately proceed to next phase/step upon verification pass
4. **Retry on failure** — On verification failure, retry with same agent (max 3 times) or escalate
5. **Never stop** — Never stop until all phases are complete

### Prohibitions:

- ❌ Receive completion notification and stop without action
- ❌ Report "completed" and fail to verify results
- ❌ Wait for user confirmation when next phase exists (auto-proceed is default)
- ❌ Ignore sub-agent results and redo work directly

### For Parallel Sub-Agents:

- Collect results for each completion notification
- When all parallel agents complete, immediately start dependent phase
- When only some complete, proceed with independent next tasks first

## Anti-Patterns

- Vague instructions like "roughly", "as you see fit"
- Unlimited tool allowance
- Large requests without context
- Delegation without expected deliverables
- Poll loop to wait for results after spawn
- Handling all tasks directly (underutilizing sub-agents)
- Code modification without sessions_spawn for implementation work
- **Stopping after completion notification (most common failure pattern)**
