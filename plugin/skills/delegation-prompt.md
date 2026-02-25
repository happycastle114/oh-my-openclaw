---
name: delegation-prompt
description: Sub-agent delegation guide using omoc_delegate. 7-element prompt template + token-efficient delegation patterns.
---

# Delegation Prompt Guide

The core concept of OmOC is **sub-agent utilization**. All sub-agent delegation **MUST** go through the `omoc_delegate` tool, which handles both model routing AND agent selection automatically.

> **⛔ NEVER call `sessions_spawn` directly.** Always use `omoc_delegate`. It selects the right agent persona for the task category and returns the exact `sessions_spawn` call you need to execute.

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

## omoc_delegate Usage

```
omoc_delegate(
  task_description="7-element prompt (see below)",
  category="deep",           # Category determines both model AND agent
  agent_id="omoc_oracle",    # Override auto-selected agent (optional)
  skills=["git-master"],     # Skills to load (optional)
  background=false            # Run in background (optional)
)
```

`omoc_delegate` returns a `sessions_spawn` instruction with the correct `model` and `agentId` pre-filled. **Execute the returned instruction immediately.**

### Category → Agent Auto-Selection

Each category automatically selects the best-fit agent. You can override with `agent_id` if needed.

| Category | Default Agent | Model | Use Case |
|----------|--------------|-------|----------|
| quick | `omoc_sisyphus` | claude-sonnet-4-6 | Simple fixes, search, grep |
| deep | `omoc_hephaestus` | claude-opus-4-6-thinking | Complex refactoring, analysis |
| ultrabrain | `omoc_oracle` | gpt-5.3-codex | Architecture, deep reasoning |
| visual-engineering | `omoc_frontend` | gemini-3.1-pro | Frontend, UI/UX, design |
| multimodal | `omoc_looker` | gemini-3-flash | PDF, image, video analysis |
| artistry | `omoc_hephaestus` | claude-opus-4-6-thinking | Creative complex problems |
| unspecified-low | `omoc_sisyphus` | claude-sonnet-4-6 | General low-effort tasks |
| unspecified-high | `omoc_hephaestus` | claude-opus-4-6-thinking | General high-effort tasks |
| writing | `omoc_sisyphus` | claude-sonnet-4-6 | Documentation, prose |

### Available Agents

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
| `omoc_looker` | Multimodal visual analysis | read-only |
| `omoc_frontend` | Visual engineering | full |

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

### Example 1: Code Analysis (deep)
```
omoc_delegate(
  task_description="""
  1) TASK: Analyze test coverage for /home/happycastle/Projects/my-app/src/
  2) EXPECTED OUTCOME: List of untested files + prioritized test writing plan
  3) REQUIRED SKILLS: none
  4) REQUIRED TOOLS: read, exec (jest --coverage)
  5) MUST DO: Include complexity and importance assessment for each file.
     Return results in <results><files><answer><next_steps> format.
  6) MUST NOT DO: Do not write test files directly
  7) CONTEXT: Jest + TypeScript project, src/utils/ is highest priority
  """,
  category="deep"
)
# → omoc_delegate auto-selects omoc_hephaestus + claude-opus-4-6-thinking
# → Execute the returned sessions_spawn instruction immediately
```

### Example 2: Web Research (quick)
```
omoc_delegate(
  task_description="""
  1) TASK: Research Next.js 15 Server Actions changes
  2) EXPECTED OUTCOME: Key changes summary + migration guide
  3) REQUIRED SKILLS: web-search
  4) REQUIRED TOOLS: web_fetch, exec (mcporter)
  5) MUST DO: Check both official docs and community feedback.
     Return results in <results><files><answer><next_steps> format.
  6) MUST NOT DO: Do not modify code
  7) CONTEXT: Currently using Next.js 14, evaluating upgrade
  """,
  category="quick",
  agent_id="omoc_librarian",
  skills=["web-search"]
)
# → Uses omoc_librarian (overrides default omoc_sisyphus for research tasks)
```

### Example 3: Parallel Tasks (multiple delegates)
```
# 3 sub-agents running simultaneously
omoc_delegate(task_description="Refactor file A...", category="deep", background=true)
omoc_delegate(task_description="Refactor file B...", category="deep", background=true)
omoc_delegate(task_description="Write tests...", category="quick", background=true)
# → Each gets the right agent: omoc_hephaestus for deep, omoc_sisyphus for quick
```

## Mandatory Delegation Flow

**⛔ NEVER call `sessions_spawn` directly. ALWAYS use `omoc_delegate` first.**

`omoc_delegate` handles category → model mapping AND category → agent selection. It returns a ready-to-execute `sessions_spawn` instruction.

**Correct flow:**
1. Call `omoc_delegate` with category + task description → **MANDATORY**
2. Execute the returned `sessions_spawn` instruction immediately
3. Receive automatic completion notification (push-based)

**Never do this:**
- ⛔ Do NOT call `sessions_spawn` directly — agent selection will be skipped
- ⛔ Do NOT poll `subagents list` in a loop — results arrive automatically
- ⛔ Do NOT expect immediate results after spawn — execution is asynchronous

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

- ⛔ **Calling `sessions_spawn` directly** — bypasses agent selection, use `omoc_delegate`
- Vague instructions like "roughly", "as you see fit"
- Unlimited tool allowance
- Large requests without context
- Delegation without expected deliverables
- Poll loop to wait for results after spawn
- Handling all tasks directly (underutilizing sub-agents)
- Code modification without delegation for implementation work
- **Stopping after completion notification (most common failure pattern)**
- **Injecting raw file contents into the main session instead of delegating**
- **Omitting compression directive for read-only agent delegations**
