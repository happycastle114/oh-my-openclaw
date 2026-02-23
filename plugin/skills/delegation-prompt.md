---
name: delegation-prompt
description: Sub-agent delegation guide using sessions_spawn. 7-element prompt template + token-efficient delegation patterns.
---

# Delegation Prompt + sessions_spawn Guide

The core concept of OmOC is **sub-agent utilization**. oh-my-openclaw uses OpenClaw's `sessions_spawn` to create real sub-agent sessions.

## Token Efficiency Principle (Primary Rule)

**The main session runs the most expensive model.** Every token of raw data injected into the main session costs disproportionately more than processing it in a sub-agent.

### The Token Efficiency Rule

> **Any task that would inject raw data (file contents, grep output, images, PDFs, logs) into the main session MUST be delegated to a sub-agent.** The main session should only receive condensed summaries.

This replaces the old "5-minute rule." The decision criterion is **not time** but **token cost**:

- Reading 3 files to find a pattern → **Delegate** (raw file content stays in sub-agent)
- Grepping across a codebase → **Delegate** (search results stay in sub-agent)
- Analyzing a PDF/image → **Delegate** (multimodal data stays in sub-agent)
- Making a yes/no decision from known context → **Direct** (no raw data needed)
- Writing a 2-line response to user → **Direct** (no raw data needed)

## sessions_spawn Usage

```
sessions_spawn(
  task="...",           # 7-element prompt (see below)
  mode="run",           # "run" (one-shot) | "session" (persistent)
  model="...",          # Category-based model (see table below)
  agentId="...",        # Specific agent (optional — omoc_prometheus, omoc_sisyphus, etc.)
  label="...",          # Identification label (optional)
  thread=true           # Deliver results via Discord thread (optional)
)
```

### Specifying Agents via agentId

When `agentId` is specified, the agent's persona/permissions/model are auto-applied:

| agentId | Role | Permissions |
|---------|------|-------------|
| `omoc_prometheus` | Strategic planning | read-only |
| `omoc_atlas` | Orchestration | full |
| `omoc_sisyphus` | Implementation worker | full |
| `omoc_hephaestus` | Deep implementation | full |
| `omoc_oracle` | Architecture consulting | read-only |
| `omoc_explore` | Codebase search | read-only |
| `omoc_librarian` | Documentation research | read-only |
| `omoc_metis` | Gap analysis | read-only |
| `omoc_momus` | Plan review | read-only |

When `agentId` is omitted, the default agent runs with the specified `model`.

## Category-to-Model Mapping

| Category | Model | Use Case |
|----------|-------|----------|
| quick | claude-sonnet-4-6 | Simple fixes, file search, grep, exploration |
| deep | claude-opus-4-6-thinking | Complex refactoring, analysis, autonomous work |
| ultrabrain | gpt-5.3-codex | Deep reasoning, architecture design |
| visual-engineering | gemini-3.1-pro | Frontend, UI/UX, design |
| writing | claude-sonnet-4-6 | Documentation, technical writing |

## Delegation Decision Criteria

### MUST Delegate (Token Efficiency)

- **Any file reading task** — raw file contents must NOT enter the main session
- **Codebase search/grep** — search results stay in sub-agent, return summary only
- **PDF/image/video analysis** — multimodal data stays in sub-agent
- **Multiple independent tasks** — parallel sub-agents for efficiency
- **Long-running tasks** — large refactoring, full codebase analysis
- **Tasks better suited to another model** — reasoning→gpt-5.3, visual→gemini
- **Implementation/modification/refactoring/testing/build tasks** — always delegate

### Direct Handling (No Spawn Needed)

- Pure explanation/summary/decision-making (no file changes, no raw data)
- Short responses to user confirmation questions
- Plan document writing itself (pre-execution phase)
- Decisions based on already-known context

### OmO Implementation Delegation (Mandatory)

- Tasks requiring code changes MUST be delegated via `opencode-controller` + `tmux` + `tmux-agents`.
- "Direct handling" during implementation is not an exception — it is **forbidden**.
- At minimum, create one execution session and collect/verify results.

## Compressed Output Format (Mandatory for Read-Only Agents)

All read-only sub-agents (explore, librarian, oracle, metis, momus) MUST return results in this compressed format. This ensures the main session receives only actionable summaries, not raw data.

```xml
<results>
<files>
- /absolute/path/to/file1.ts — [why relevant]
- /absolute/path/to/file2.ts — [why relevant]
</files>

<answer>
[Direct answer to the actual need — not just a file list]
[Address the underlying intent, not just the literal request]
</answer>

<next_steps>
[What to do with this information]
[Or: "Ready to proceed — no follow-up needed"]
</next_steps>
</results>
```

### Why This Format?

- **Caller gets actionable intelligence** without parsing verbose output
- **Token cost stays in the sub-agent** — raw grep/read output never reaches main session
- **No follow-up needed** — a good `<results>` block eliminates "but where exactly?" questions

## 7 Required Elements (Prompt Quality = Delegation Quality)

1. **TASK**: Clear, atomic task instruction
2. **EXPECTED OUTCOME**: Deliverables and success criteria
3. **REQUIRED SKILLS**: List of needed skills
4. **REQUIRED TOOLS**: Tool whitelist
5. **MUST DO**: Mandatory detailed requirements
6. **MUST NOT DO**: Prohibitions (scope expansion, file modification, etc.)
7. **CONTEXT**: Paths, constraints, existing patterns, downstream purpose

### Output Compression Directive (Add to MUST DO)

When delegating to read-only agents, always include:

```
MUST DO:
- Return results in <results><files><answer><next_steps> format
- Compress all findings into actionable summary — do NOT dump raw file contents
- Use absolute paths only
```

## Execution Examples

### Example 1: Code Analysis (deep, background)
```
sessions_spawn(
  task="""
  1) TASK: Analyze test coverage for /home/happycastle/Projects/my-app/src/
  2) EXPECTED OUTCOME: List of untested files + prioritized test writing plan
  3) REQUIRED SKILLS: none
  4) REQUIRED TOOLS: read, exec (jest --coverage)
  5) MUST DO: Include complexity and importance assessment for each file.
     Return results in <results><files><answer><next_steps> format.
  6) MUST NOT DO: Do not write test files directly
  7) CONTEXT: Jest + TypeScript project, src/utils/ is highest priority
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
  1) TASK: Research Next.js 15 Server Actions changes
  2) EXPECTED OUTCOME: Key changes summary + migration guide
  3) REQUIRED SKILLS: web-search
  4) REQUIRED TOOLS: web_fetch, exec (mcporter)
  5) MUST DO: Check both official docs and community feedback.
     Return results in <results><files><answer><next_steps> format.
  6) MUST NOT DO: Do not modify code
  7) CONTEXT: Currently using Next.js 14, evaluating upgrade
  """,
  mode="run",
  model="claude-sonnet-4-6",
  label="nextjs-migration-research"
)
```

### Example 3: Parallel Tasks (multiple spawns)
```
# 3 sub-agents running simultaneously
sessions_spawn(task="Refactor file A...", mode="run", model="claude-opus-4-6-thinking", label="refactor-a")
sessions_spawn(task="Refactor file B...", mode="run", model="claude-opus-4-6-thinking", label="refactor-b")
sessions_spawn(task="Write tests...", mode="run", model="claude-sonnet-4-6", label="write-tests")
```

## Relationship with omoc_delegate

`omoc_delegate` only handles category → model mapping. Actual sub-agent creation requires calling `sessions_spawn`.

**Correct flow:**
1. Use `omoc_delegate` to check category/model (optional)
2. Use `sessions_spawn` to create the actual sub-agent
3. Receive automatic completion notification (push-based)

**Never do this:**
- Do NOT poll `subagents list` in a loop — results arrive automatically
- Do NOT expect immediate results after spawn — execution is asynchronous

## Sub-Agent Routing Metadata

When choosing whether to delegate, use these heuristics:

### Explore Agent
- **Use when**: Multiple search angles needed, unfamiliar module structure, cross-layer pattern discovery
- **Avoid when**: You know exactly what to search, single keyword suffices, known file location

### Librarian Agent
- **Use when**: External library questions, "How do I use [X]?", unfamiliar packages, best practice lookups
- **Avoid when**: Internal code only, no external dependencies involved

### Oracle Agent
- **Use when**: Architecture tradeoff decisions, complex debugging after repeated failures, design review
- **Avoid when**: Simple implementation, no architectural implications

### Metis Agent
- **Use when**: Ambiguous task needs intent classification, risk of scope creep, pre-planning gap analysis
- **Avoid when**: Task is clear and well-defined, single-step with no ambiguity

### Momus Agent
- **Use when**: Plan needs executability review, catching critical blockers, verifying reference integrity
- **Avoid when**: Plan is simple enough to self-review, single-step task, already approved

## Quality Checklist

- [ ] Success criteria are measurable
- [ ] Input paths/scope are specified
- [ ] Prohibitions are unambiguous
- [ ] Retry/reporting method is defined on failure
- [ ] Appropriate category/model selected
- [ ] mode is correct (run=one-time, session=persistent)
- [ ] Read-only agents receive compression directive in MUST DO
- [ ] Token efficiency check: does this inject raw data into main session?

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
- **Injecting raw file contents into the main session instead of delegating**
- **Omitting compression directive for read-only agent delegations**
