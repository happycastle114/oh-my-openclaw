# Features Reference

Complete reference for every feature in Oh-My-OpenClaw (`@happycastle/oh-my-openclaw@0.5.0`).

This document covers agents, plugin hooks, plugin tools, commands, services, skills, workflows, the category system, and tmux integration.

---

## Agents

Oh-My-OpenClaw defines 10 specialized agents organized into a 3-layer architecture: **Planning**, **Orchestration**, and **Workers**.

### Agent Summary Table

| Agent | Layer | Category | Role | Tool Restrictions |
|-------|-------|----------|------|-------------------|
| **Prometheus** | Planning | `ultrabrain` | Strategic planner — interviews user, creates phased plans, assigns categories | `allow`: read, write, exec, memory_search, memory_get, web_search, web_fetch, session_status |
| **Metis** | Planning | `deep` | Pre-planning consultant — classifies intent, exposes ambiguity, prevents scope inflation | `deny`: write, edit, apply_patch, sessions_spawn |
| **Momus** | Planning | `deep` | Plan reviewer — checks executability, blocks only on critical issues | `deny`: write, edit, apply_patch, sessions_spawn |
| **Atlas** | Orchestration | `ultrabrain` | Task distributor — breaks plans into units, spawns agents, verifies completion | `profile`: coding; `subagents.allowAgents`: `["*"]` |
| **Sisyphus-Junior** | Workers | `quick` | Primary coder — quick implementations, bug fixes, focused execution | `profile`: coding; `subagents.allowAgents`: explore, librarian, oracle |
| **Hephaestus** | Workers | `deep` | Deep autonomous worker — complex refactoring, architecture changes, end-to-end completion | `profile`: full; `subagents.allowAgents`: explore, librarian, oracle |
| **Oracle** | Workers | `ultrabrain` | Architect and debugger — design decisions, root cause analysis, read-only advisory | `deny`: write, edit, apply_patch, sessions_spawn |
| **Explore** | Workers | `quick` | Search specialist — codebase exploration, file discovery, pattern matching | `deny`: write, edit, apply_patch, sessions_spawn |
| **Librarian** | Workers | `quick` | Documentation specialist — docs search, API references, knowledge synthesis | `deny`: write, edit, apply_patch, sessions_spawn |
| **Multimodal Looker** | Workers | `visual-engineering` | Visual analyst — screenshots, UI review, PDF quality check, diagram analysis | `allow`: read, image, group:ui, exec |

### Agent Details

#### Prometheus (ultrabrain)

Strategic planner that analyzes complex tasks, creates structured plans, and determines optimal delegation strategy.

**Core Responsibilities:**
- Task analysis: parse explicit and implicit requirements
- Plan creation: structured, phased plans with milestones
- Agent selection: assign specialized agents to subtasks
- Category assignment: route each subtask to the correct category
- Risk assessment: identify blockers and mitigation strategies

**Planning Framework:** Understanding → Decomposition → Delegation Plan

**Tool Access:** Read + write (plans only) + exec + memory + web search. Cannot spawn sub-agents directly.

#### Metis (deep)

Pre-planning consultant used before execution planning to increase plan quality.

**Core Responsibilities:**
- Classify true task intent (refactoring, build, fix, research+act)
- Expose ambiguity and missing constraints
- Prevent AI-slop (scope inflation, premature abstraction, vague QA)
- Produce executable directives for planners/executors

**Hard Boundary:** Consultant only, not an implementer. Does not propose broad rewrites without necessity. Does not output vague "verify manually" acceptance criteria.

**Tool Access:** Read-only. Denied: write, edit, apply_patch, sessions_spawn.

#### Momus (deep)

Strict-but-practical plan review specialist.

**Core Responsibilities:**
- Determine whether a capable engineer can execute the plan without getting blocked
- Default toward approval when uncertainty is minor
- Reject only when execution would likely fail or stall
- Focus on critical path, not cosmetic improvements

**Review Philosophy:** Catch execution blockers, not style issues. Requires exactly one plan document target.

**Tool Access:** Read-only. Denied: write, edit, apply_patch, sessions_spawn.

#### Atlas (ultrabrain)

Orchestration agent that coordinates multi-agent workflows.

**Core Responsibilities:**
- Plan execution: take a Prometheus plan and execute phase by phase
- Agent coordination: spawn and manage specialized agents for each subtask
- Progress tracking: monitor completion status and update todo lists
- Quality gate: verify each phase's output before proceeding
- Error recovery: handle failures gracefully and re-delegate when needed

**Execution Protocol:** Load Plan → Execute Phases → Pre-check → Spawn Agent → Monitor → Verify → Next Phase

**Tool Access:** Full coding profile. Can spawn any agent (`allowAgents: ["*"]`).

#### Sisyphus-Junior (quick)

Dedicated worker agent for code implementation tasks.

**Core Responsibilities:**
- Code implementation, bug fixing, test running
- Read task specification completely before writing any code
- Implement incrementally in small, verifiable steps
- Verify work: run tests, check builds, validate output

**Philosophy:** Push the boulder uphill relentlessly. Each task gets completed fully before moving on.

**Tool Access:** Full coding profile. Can spawn explore, librarian, oracle as sub-agents.

#### Hephaestus (deep)

Autonomous deep worker for complex implementation and refactoring.

**Core Responsibilities:**
- End-to-end completion in one run whenever possible
- Intent extraction first: classify as refactor, build, fix, or research+act
- Verify with evidence, never guess
- Ship fully working outcomes, not partial progress

**Operating Contract:** Senior staff-level implementation agent. If wording is indirect but implies an expected fix, treats it as action intent.

**Tool Access:** Full access profile. Can spawn explore, librarian, oracle as sub-agents.

#### Oracle (ultrabrain)

Architectural advisor and debugging specialist.

**Core Responsibilities:**
- Architecture analysis: map structure, identify patterns, find risks, recommend improvements
- Debugging protocol: reproduce → isolate → analyze → hypothesize → verify → fix
- Deep analysis, pattern recognition, root cause identification

**Philosophy:** See the forest AND the trees. Understand both the big picture and the details.

**Tool Access:** Read-only. Denied: write, edit, apply_patch, sessions_spawn.

#### Explore (quick)

Search and discovery specialist.

**Core Responsibilities:**
- File discovery: find files by name, pattern, or content
- Symbol search: locate function definitions, class declarations, variable usages
- Pattern matching: regex, AST-grep, or text search
- Architecture mapping: module dependencies and project structure
- Change tracking: recent modifications and their scope

**Search Priority:** Glob → Grep → AST-grep → LSP symbols → Read

**Tool Access:** Read-only. Denied: write, edit, apply_patch, sessions_spawn.

#### Librarian (quick)

Documentation and knowledge specialist.

**Core Responsibilities:**
- Documentation search: find relevant docs, READMEs, inline documentation
- API reference: look up function signatures, parameters, return types
- Knowledge synthesis: combine multiple sources into clear, actionable summaries
- Pattern recognition: identify common patterns and conventions

**Search Protocol:** Scope Assessment → Systematic Search → Synthesis

**Tool Access:** Read-only. Allowed: read, exec, web_search, web_fetch, memory_search, memory_get, sessions_list, sessions_history, session_status.

#### Multimodal Looker (visual-engineering)

Visual analysis specialist.

**Core Responsibilities:**
- UI/UX review: analyze screenshots and mockups for design quality and accessibility
- Visual verification: compare implemented UI against design specs
- PDF analysis: layout, formatting, and content quality
- Diagram review: architecture diagrams, flowcharts, technical illustrations
- Screenshot debugging: examine error screenshots to identify visual bugs

**Integration:** Leverages OpenClaw browser tool for screenshots and Gemini CLI via tmux for multimodal analysis.

**Tool Access:** Restricted. Allowed: read, image, group:ui, exec, session_status.

---

## Plugin Hooks

The plugin registers 5 hooks that intercept specific events in the agent lifecycle.

### 1. todo-enforcer

| Property | Value |
|----------|-------|
| **Hook Event** | `agent:bootstrap` |
| **Internal Name** | `oh-my-openclaw.todo-enforcer` |
| **Purpose** | Injects a TODO continuation directive into the agent's bootstrap files |
| **Configurable** | Yes |

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `todo_enforcer_enabled` | `boolean` | `true` | Enable/disable the hook |
| `todo_enforcer_cooldown_ms` | `number` | `2000` | Cooldown in ms before injecting continuation prompt |
| `todo_enforcer_max_failures` | `number` | `5` | Max consecutive failures before extended pause |

**Injected Directive:**

```
[SYSTEM DIRECTIVE: OH-MY-OPENCLAW - TODO CONTINUATION]
You MUST continue working on incomplete todos.
- Do NOT stop until all tasks are marked complete
- Do NOT ask for permission to continue
- Mark each task complete immediately when finished
- If blocked, document the blocker and move to next task
```

**Mechanism:** On `agent:bootstrap`, if enabled, the hook pushes a synthetic bootstrap file (`omoc://todo-enforcer`) containing the continuation directive into `event.context.bootstrapFiles`. This ensures every agent session starts with the instruction to complete all pending todos.

### 2. comment-checker

| Property | Value |
|----------|-------|
| **Hook Event** | `tool_result_persist` |
| **Internal Name** | `oh-my-openclaw.comment-checker` |
| **Purpose** | Detects AI-generated "slop" comments in code output |
| **Configurable** | Yes (`comment_checker_enabled`, default: `true`) |

**11 Regex Detection Patterns:**

| # | Pattern | Detects |
|---|---------|---------|
| 1 | `^\s*\/\/\s*Import\s` | `// Import ...` comments |
| 2 | `^\s*\/\/\s*Define\s` | `// Define ...` comments |
| 3 | `^\s*\/\/\s*Return\s` | `// Return ...` comments |
| 4 | `^\s*\/\/\s*Export\s` | `// Export ...` comments |
| 5 | `^\s*\/\/\s*Set\s.*\sto\s` | `// Set X to Y` comments |
| 6 | `^\s*\/\/\s*Loop\s` | `// Loop ...` comments |
| 7 | `^\s*\/\/\s*Initialize\s` | `// Initialize ...` comments |
| 8 | `^\s*\/\/\s*Create\s(a\|an\|the\|new)\s` | `// Create a/an/the/new ...` comments |
| 9 | `^\s*\/\/\s*This\s(function\|method\|class\|module\|component)\s` | `// This function/method/class handles ...` comments |
| 10 | `^\s*\/\/\s*Handle\s(the\|an?)?\s?(error\|exception\|response\|request\|event)` | `// Handle the error/response ...` comments |
| 11 | `^\s*\/\/\s*Check\s(if\|whether)\s` | `// Check if/whether ...` comments |

**Behavior:**
- Skips non-code files (`.md`, `.json`, `.yaml`, `.yml`, `.txt`)
- Extracts file hint from payload (`file`, `filename`, or `path` fields)
- If violations are found, appends a warning summary to the tool result content
- Returns `undefined` (no modification) when no violations detected

**Output Format:**
```
---
[OMOC Comment Checker] Found N AI slop comment(s):
  - Line X: "content" -> AI slop: obvious/narrating comment

Consider removing these obvious/narrating comments to keep code clean.
```

### 3. message-monitor

| Property | Value |
|----------|-------|
| **Hook Event** | `message:sent` |
| **Internal Name** | `oh-my-openclaw.message-monitor` |
| **Purpose** | Audit logging and message counting |
| **Configurable** | No |

**Behavior:**
- Logs every outgoing message with preview (first 100 chars), channel ID, timestamp, and running count
- Maintains a per-channel `Map` counter keyed by channel ID
- Returns `undefined` (never modifies messages)
- Counter value is exposed via `getMessageCount()` and used by `/omoc-status`

### 4. message-received-monitor

| Property | Value |
|----------|-------|
| **Hook Event** | `message:received` |
| **Internal Name** | `oh-my-openclaw.message-received-monitor` |
| **Purpose** | Inbound message audit logging |
| **Configurable** | No |

**Behavior:**
- Logs inbound channel ID, sender info, and timestamp for incoming messages
- Returns `undefined` (never modifies inbound payload)

### 5. gateway-startup

| Property | Value |
|----------|-------|
| **Hook Event** | `gateway:startup` |
| **Internal Name** | `oh-my-openclaw.gateway-startup` |
| **Purpose** | Plugin activation logging |
| **Configurable** | No |

**Behavior:**
- Emits a startup log when the plugin is activated by the gateway
- Returns `undefined` (observability-only hook)

---

## Plugin Tools

The plugin registers 3 custom tools, all prefixed with `omoc_`.

### 1. omoc_delegate

| Property | Value |
|----------|-------|
| **Full Name** | `omoc_delegate` |
| **Description** | Delegate a task to a sub-agent with category-based model routing |
| **Optional** | Yes |

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_description` | `string` | Yes | What the sub-agent should do |
| `category` | `string` | Yes | Task category for model routing |
| `skills` | `string[]` | No | Skill names to load |
| `background` | `boolean` | No | Run in background (default: `false`) |

**Category-to-Model Routing:**

| Category | Model |
|----------|-------|
| `quick` | `claude-sonnet-4-6` |
| `deep` | `claude-opus-4-6-thinking` |
| `ultrabrain` | `gpt-5.3-codex` |
| `visual-engineering` | `gemini-3.1-pro` |
| `multimodal` | `gemini-2.5-flash` |
| `artistry` | `claude-opus-4-6-thinking` |
| `unspecified-low` | `claude-sonnet-4-6` |
| `unspecified-high` | `claude-opus-4-6-thinking` |
| `writing` | `claude-sonnet-4-6` |

**Behavior:**
- Validates the category against the 9 valid categories
- Returns an error with valid categories list if invalid
- Returns a delegation instruction JSON with action, task, category, model, skills, and background flag
- Does not directly spawn agents; returns structured instructions for the runtime to execute

### 2. omoc_look_at

| Property | Value |
|----------|-------|
| **Full Name** | `omoc_look_at` |
| **Description** | Analyze files (PDF, images, video) using Gemini CLI via tmux |
| **Optional** | Yes |

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file_path` | `string` | Yes | — | Path to the file to analyze |
| `goal` | `string` | Yes | — | What to analyze or look for |
| `model` | `string` | No | `gemini-2.5-flash` | Gemini model to use |

**tmux Configuration:**

| Setting | Value |
|---------|-------|
| Socket path | `/tmp/openclaw-tmux-sockets/openclaw.sock` |
| Session target | `gemini:0.0` |
| Timeout | 60,000 ms (60 seconds) |

**Mechanism:**
1. Constructs a Gemini CLI command: `gemini -m <model> --prompt '<goal>' -f '<file_path>' -o text > <tempfile> 2>&1`
2. Sends the command to the `gemini:0.0` tmux pane via `tmux -S <socket> send-keys`
3. Polls the temp file (`/tmp/omoc-look-at-<timestamp>.md`) every 2 seconds for up to 60 seconds
4. Returns the file content once output is detected, or a timeout error
5. Cleans up temp files on success or failure

**Shell Safety:** Arguments are escaped via single-quote escaping (`'\\''`).

### 3. omoc_checkpoint

| Property | Value |
|----------|-------|
| **Full Name** | `omoc_checkpoint` |
| **Description** | Save, load, or list session checkpoints for crash recovery |
| **Optional** | Yes |

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `"save" \| "load" \| "list"` | Yes | Checkpoint operation |
| `task` | `string` | No | Current task name (for save) |
| `step` | `string` | No | Current step name (for save) |
| `changed_files` | `string[]` | No | Files modified since last checkpoint |
| `next_action` | `string` | No | What to do after restore |

**Storage:** JSON files in `workspace/checkpoints/` (configurable via `checkpoint_dir`).

**Checkpoint Data Structure:**
```json
{
  "type": "session-checkpoint",
  "session_id": "checkpoint-<timestamp>",
  "task": "<task>",
  "step": "<step>",
  "changed_files": ["..."],
  "verification": {
    "diagnostics": "pass | fail | not-run",
    "tests": "pass | fail | not-run",
    "build": "pass | fail | not-run"
  },
  "next_action": "<next_action>",
  "timestamp": "<ISO 8601>"
}
```

**Actions:**

| Action | Behavior |
|--------|----------|
| `save` | Creates a new checkpoint file (`checkpoint-<timestamp>.json`) with current state |
| `load` | Reads and returns the most recent checkpoint (sorted reverse by filename) |
| `list` | Returns all checkpoints with timestamp, task, and step summaries |

---

## Commands

The plugin registers 8 slash commands across three modules.

### Workflow Commands

#### /ultrawork

| Property | Value |
|----------|-------|
| **Name** | `ultrawork` |
| **Description** | Full planning -> execution -> verification workflow |
| **Arguments** | Task description (free text) |

**Behavior:** Reads the `workflows/ultrawork.md` workflow definition and returns it with the task description. Triggers the full 3-phase automation: Analysis (Prometheus) → Execution (Atlas + Workers) → Verification.

#### /plan

| Property | Value |
|----------|-------|
| **Name** | `plan` |
| **Description** | Create a structured execution plan |
| **Arguments** | Topic or task description (free text) |

**Behavior:** Reads the `workflows/plan.md` workflow definition and returns it with the topic. Runs Prometheus planning + Momus review without execution.

#### /start-work

| Property | Value |
|----------|-------|
| **Name** | `start-work` |
| **Description** | Execute an approved plan |
| **Arguments** | Plan path (optional, defaults to most recent) |

**Behavior:** Reads the `workflows/start-work.md` workflow definition and returns it with the plan reference. Loads an existing approved plan from `workspace/plans/` and delegates to Atlas for execution.

### Ralph Commands

#### /ralph-loop

| Property | Value |
|----------|-------|
| **Name** | `ralph-loop` |
| **Description** | Start the Ralph Loop self-completion mechanism |
| **Arguments** | `[max_iterations] [task_file]` (both optional) |

**Behavior:**
- Parses first argument as max iterations (defaults to `config.max_ralph_iterations`, which defaults to 10)
- Second argument is the task file path
- Validates that max iterations is a positive number
- Calls `startLoop()` which clamps iterations to the hard cap (100)
- Returns start confirmation with max iterations, task file, and start time
- Fails if a loop is already running

#### /ralph-stop

| Property | Value |
|----------|-------|
| **Name** | `ralph-stop` |
| **Description** | Stop the active Ralph Loop |
| **Arguments** | None |

**Behavior:** Calls `stopLoop()`, sets the loop to inactive, persists state, and returns the final iteration count.

#### /omoc-status

| Property | Value |
|----------|-------|
| **Name** | `omoc-status` |
| **Description** | Show Oh-My-OpenClaw plugin status |
| **Arguments** | None |

**Behavior:** Returns a status report including:
- Ralph Loop state (active/inactive, iteration count, task file, start time)
- Todo Enforcer state (enabled/disabled, cooldown)
- Comment Checker state (enabled/disabled)
- Total messages monitored count

### Status Commands

#### /omoc-health

| Property | Value |
|----------|-------|
| **Name** | `omoc-health` |
| **Description** | Plugin health check (auto-reply) |
| **Arguments** | None |

**Behavior:** Returns a concise health summary covering plugin availability and key runtime checks.

#### /omoc-config

| Property | Value |
|----------|-------|
| **Name** | `omoc-config` |
| **Description** | Show effective plugin config with sensitive values masked |
| **Arguments** | None |

**Behavior:** Returns effective runtime configuration and masks sensitive fields before output.

---

## Services

### ralph-loop

| Property | Value |
|----------|-------|
| **Service ID** | `omoc-ralph-loop` |
| **Name** | Ralph Loop Service |
| **Description** | Self-referential completion mechanism with configurable iterations |
| **Type** | Background service |

**Configuration:**

| Setting | Value | Source |
|---------|-------|--------|
| Hard cap | 100 iterations | `ABSOLUTE_MAX_RALPH_ITERATIONS` constant in `types.ts` |
| User configurable max | `max_ralph_iterations` | Plugin config (default: 10) |
| State file | `ralph-loop-state.json` | Stored in `checkpoint_dir` |

**State Schema (`RalphLoopState`):**
```typescript
{
  active: boolean;
  iteration: number;
  maxIterations: number;
  taskFile: string;
  startedAt: string;  // ISO 8601
}
```

**Lifecycle:**
- `start()`: Loads state from file on service start
- `stop()`: Persists state to file on service stop
- Corrupted state files are recovered with default state (logged as warning)

**Operations:**

| Function | Description |
|----------|-------------|
| `startLoop(taskFile, maxIterations)` | Starts the loop; fails if already running; clamps iterations to hard cap |
| `stopLoop()` | Sets active to false and persists |
| `getStatus()` | Returns current `RalphLoopState` |
| `incrementIteration()` | Advances counter; auto-stops when limit reached; returns `{ continue, state }` |

**Iteration Clamping:** User-provided `maxIterations` is clamped to `[0, ABSOLUTE_MAX_RALPH_ITERATIONS]` via `clampIterations()`. This prevents runaway loops regardless of user input.

---

## Skills

Oh-My-OpenClaw defines 13 skill documents, each with keyword-based auto-activation triggers.

### Skills Summary Table

| Skill | Trigger Keywords | File | Description |
|-------|-----------------|------|-------------|
| **git-master** | commit, rebase, squash, who wrote, when was, git history, blame | `skills/git-master.md` | Atomic commits, rebase surgery, history search |
| **frontend-ui-ux** | UI, UX, frontend, design, styling, CSS, layout | `skills/frontend-ui-ux.md` | Designer-turned-developer UI/UX crafting |
| **comment-checker** | comment check, AI slop, code quality, clean comments | `skills/comment-checker.md` | Anti-AI-slop code quality guard |
| **gemini-look-at** | look at, PDF, screenshot, diagram, visual | `skills/gemini-look-at.md` | Gemini CLI multimodal file analysis |
| **steering-words** | ultrawork, search, analyze | `skills/steering-words.md` | Keyword detection and mode routing |
| **delegation-prompt** | delegate, sub-agent | `skills/delegation-prompt.md` | 7-element delegation prompt construction guide |
| **multimodal-analysis** | multimodal, image analysis | `skills/multimodal-analysis.md` | Multimodal analysis pattern templates |
| **opencode-controller** | opencode, tmux, plan/build | `plugin/skills/opencode-controller.md` | OpenCode tmux session control and delegation patterns |
| **tmux** | tmux, send-keys, capture-pane | `plugin/skills/tmux.md` | tmux session control and parallel orchestration patterns |
| **tmux-agents** | claude, codex, gemini, ollama | `plugin/skills/tmux-agents.md` | Agent spawn and monitoring patterns in tmux |
| **web-search** | web search, exa, context7, grep.app | `plugin/skills/web-search.md` | Unified web/docs/code search strategy |
| **workflow-auto-rescue** | checkpoint, recover, rollback | `plugin/skills/workflow-auto-rescue.md` | Failure recovery workflow with checkpoints |
| **workflow-tool-patterns** | tool patterns, mapping | `plugin/skills/workflow-tool-patterns.md` | OmO tool pattern mapping for OpenClaw |

### Skill Details

#### git-master

**Triggers:** `commit`, `rebase`, `squash`, `who wrote`, `when was`, `git history`, `blame`

Provides guidance for atomic commits, rebase/squash operations, and git history investigation (blame, bisect, `log -S`). Enforces clean commit hygiene and structured git workflows.

#### frontend-ui-ux

**Triggers:** `UI`, `UX`, `frontend`, `design`, `styling`, `CSS`, `layout`

Designer-turned-developer approach to crafting UI/UX. Covers design-first development, responsive patterns, accessibility, and visual polish even without design mockups.

#### comment-checker

**Triggers:** `comment check`, `AI slop`, `code quality`, `clean comments`

Documents the anti-AI-slop philosophy and the 11 regex patterns used by the comment-checker hook. Guides agents to write meaningful comments that explain "why" rather than narrating "what".

#### gemini-look-at

**Triggers:** `look at`, `PDF`, `screenshot`, `diagram`, `visual`

Instructions for using Gemini CLI via tmux to analyze visual content. Covers PDF documents, screenshots, UI mockups, architecture diagrams, and any file requiring multimodal understanding.

#### steering-words

**Triggers:** `ultrawork`, `search`, `analyze`

Keyword detection patterns that route user intent to appropriate workflows and modes. Maps natural language signals to system actions.

#### delegation-prompt

**Triggers:** `delegate`, `sub-agent`

7-element delegation prompt construction guide for spawning effective sub-agents. Ensures delegated tasks include: task, context, constraints, acceptance criteria, category, skills, and background flag.

#### multimodal-analysis

**Triggers:** `multimodal`, `image analysis`

Templates and patterns for conducting multimodal analysis tasks. Covers image comparison, PDF review, diagram interpretation, and visual verification workflows.

---

## Workflows

Oh-My-OpenClaw defines 7 workflow documents that describe standardized multi-step processes.

### Workflow Summary Table

| Workflow | Command | File | Description |
|----------|---------|------|-------------|
| **ultrawork** | `/ultrawork` | `workflows/ultrawork.md` | Full planning -> execution -> verification loop |
| **plan** | `/plan` | `workflows/plan.md` | Strategic planning (Prometheus + Momus) |
| **start-work** | `/start-work` | `workflows/start-work.md` | Execute an approved plan via Atlas |
| **delegate-to-omo** | — | `workflows/delegate-to-omo.md` | Route task to OpenCode (OmO) running in tmux |
| **tmux-orchestration** | — | `workflows/tmux-orchestration.md` | Multi-tool tmux coordination (OpenCode + Gemini CLI) |
| **tool-patterns** | — | `workflows/tool-patterns.md` | OmO tool -> OpenClaw tool mapping reference |
| **auto-rescue** | — | `workflows/auto-rescue.md` | Checkpoint + failure recovery |

### Workflow Details

#### ultrawork

**Trigger:** `/ultrawork [task description]`

Complete automation workflow from analysis to verified completion.

**Phases:**
1. **Analysis (Prometheus):** Read task, identify scope, assess complexity, determine required agents
2. **Planning:** Create phased plan with milestones and dependencies
3. **Review (Momus):** Check plan executability, block on critical issues only
4. **Execution (Atlas + Workers):** Delegate tasks, monitor progress, handle failures
5. **Verification:** Run tests, check builds, validate output against acceptance criteria

**Prerequisites:** Clear, actionable task description; valid project working directory.

#### plan

**Trigger:** `/plan [topic]`

Strategic planning workflow that analyzes requirements and creates a structured execution plan.

**When to Use:**
- Starting a new feature or project
- Complex multi-step tasks
- Ambiguous requirements needing clarification
- Before `/ultrawork` or `/start-work`

**Phases:**
1. Context Gathering: read existing context, codebase structure, relevant documentation
2. Requirement Analysis: identify explicit/implicit requirements, constraints, dependencies
3. Plan Creation: structured phases with agent assignments and verification criteria
4. Plan Review (Momus): executability check, blocker identification

**Output:** Plan file saved to `workspace/plans/`.

#### start-work

**Trigger:** `/start-work [plan-file]`

Execute an approved plan by delegating tasks to appropriate worker agents.

**Prerequisites:** Approved plan exists in `workspace/plans/` with status "approved" or "in-progress".

**Phases:**
1. Plan Loading: read plan from `workspace/plans/`, parse phases and dependencies
2. Task Delegation: assign tasks to agents based on plan's category assignments
3. Progress Tracking: monitor completion, update todo lists
4. Verification: validate each phase's output before proceeding

#### delegate-to-omo

Workflow for delegating large coding tasks from OpenClaw to Oh-My-OpenCode running in the `opencode` tmux session.

**When to Use:**
- Complex multi-file coding tasks
- Deep codebase refactoring
- Tasks requiring LSP, AST-Grep, or build verification
- Sustained autonomous execution (ultrawork/ralph loop)
- Tasks that benefit from OmO's Prometheus planning + Atlas orchestration

**Prerequisites:** OpenCode tmux session (`opencode`) must be running; oh-my-opencode plugin must be installed in OpenCode.

#### tmux-orchestration

Multi-tool orchestration via tmux. OpenClaw simultaneously manages multiple tmux sessions for parallel coding, visual verification, and result collection.

**Architecture:** OpenClaw (main AI) coordinates multiple sessions via `tmux send-keys` and `tmux capture-pane`, supporting parallel workflows across opencode, gemini, build, and custom sessions.

#### tool-patterns

Reference mapping from OmO's `src/tools/` patterns to their OpenClaw equivalents. Standardizes tool selection, reduces tool choice errors, and maintains consistency across planning, execution, and verification.

#### auto-rescue

Session recovery workflow with checkpointing, failure detection, and automatic restore.

**When to Use:**
- Long implementation/refactoring sessions
- Multi-step tasks (5+ steps)
- High failure-probability debugging/build recovery

**Core Mechanism:**
- Checkpoint save: write file-based checkpoints at major steps (`workspace/checkpoints/`)
- Checkpoint query: read + `memory_search` (OpenClaw native) for recovery
- Auto-restore: restart from most recent healthy state

---

## Category System

Oh-My-OpenClaw uses a category-based routing system to select the optimal model for each task type. Categories are defined in `config/categories.json`.

### All 9 Categories

| Category | Default Model | Alternatives | Description | Assigned Agents |
|----------|--------------|--------------|-------------|-----------------|
| `quick` | `claude-sonnet-4-6` | `gpt-5.3-codex-spark`, `gemini-3-flash` | Simple fixes, searches, small tasks, file operations | sisyphus-junior, explore, librarian |
| `deep` | `claude-opus-4-6-thinking` | `gpt-5.3-codex`, `gemini-3.1-pro` | Complex refactoring, analysis, gap detection, plan review | hephaestus, metis, momus |
| `ultrabrain` | `gpt-5.3-codex` | `claude-opus-4-6-thinking`, `gemini-3.1-pro-high` | Deep logical reasoning, complex architecture decisions | prometheus, atlas, oracle |
| `visual-engineering` | `gemini-3.1-pro` | `claude-opus-4-6-thinking`, `gemini-2.5-pro` | Frontend, UI/UX, design, styling, animation, visual analysis | frontend, multimodal-looker |
| `multimodal` | `gemini-2.5-flash` | `gemini-2.5-pro`, `gemini-3.1-pro` | PDF/image/video analysis via Gemini CLI tmux session | multimodal-looker |
| `artistry` | `claude-opus-4-6-thinking` | `gemini-3.1-pro` | Highly creative/artistic tasks, novel ideas, design exploration | — |
| `unspecified-low` | `claude-sonnet-4-6` | — | Tasks that don't fit other categories, low effort required | — |
| `unspecified-high` | `claude-opus-4-6-thinking` | — | Tasks that don't fit other categories, high effort required | — |
| `writing` | `claude-sonnet-4-6` | `gemini-3.1-pro` | Documentation, prose, technical writing | — |

### Valid Categories (Validation)

The `isValidCategory()` function in `utils/validation.ts` accepts exactly these 9 strings:
`quick`, `deep`, `ultrabrain`, `visual-engineering`, `multimodal`, `artistry`, `unspecified-low`, `unspecified-high`, `writing`.

### Fallback Behavior

| Setting | Value |
|---------|-------|
| `defaults.fallback_category` | `quick` |

If a task cannot be classified into a specific category, it falls back to `quick`.

### Customization

To change a category's model, edit the `"model"` field in `config/categories.json`. The `"alternatives"` array lists other tested and compatible models you can swap in.

---

## tmux Integration

Oh-My-OpenClaw uses tmux as the backbone for multi-tool orchestration, enabling parallel sessions across coding agents, multimodal analysis, and build monitoring.

### Socket Configuration

| Setting | Value |
|---------|-------|
| Socket path | `/tmp/openclaw-tmux-sockets/openclaw.sock` |
| Max concurrent sessions | 6 |

All tmux commands use the `-S` flag to target the dedicated socket: `tmux -S /tmp/openclaw-tmux-sockets/openclaw.sock <command>`.

### Session Templates

#### opencode

| Property | Value |
|----------|-------|
| **Description** | OmO (OpenCode) coding agent sessions |
| **Default Agent** | sisyphus |
| **RAM per session** | 2-4 GB |
| **Startup** | `export NODE_OPTIONS="--max-old-space-size=8192" && cd $PROJECT_DIR && opencode` |

**Agent Switching:**

| Agent | Switch Method | Description |
|-------|--------------|-------------|
| sisyphus | default | Quick implementation |
| hephaestus | Tab x1 | Deep autonomous work |
| prometheus | Tab x2 | Strategic planning |

Multiple instances supported: `opencode`, `opencode-2`, `opencode-3`, etc.

#### gemini

| Property | Value |
|----------|-------|
| **Description** | Gemini CLI multimodal analysis sessions |
| **Default Model** | `gemini-2.5-flash` |
| **RAM per session** | ~200 MB |

**Available Models:**

| Model | Flag | Speed | Description |
|-------|------|-------|-------------|
| `gemini-2.5-flash` | `-m gemini-2.5-flash` | fast | Quick checks |
| `gemini-2.5-pro` | `-m gemini-2.5-pro` | medium | Detailed analysis |
| `gemini-3.1-pro` | `-m gemini-3.1-pro` | slow | Highest quality |

Multiple instances supported: `gemini`, `gemini-2`, etc.

#### build

| Property | Value |
|----------|-------|
| **Description** | Build/test monitoring session |
| **Startup** | `cd $PROJECT_DIR && npm run dev` |

Dedicated session for watching build output, test results, and dev server logs.

#### research

| Property | Value |
|----------|-------|
| **Description** | Research session (Gemini CLI or custom tools) |

Flexible session for research tasks using Gemini CLI or any other command-line tool.

### Naming Convention

Session names follow the pattern `{template}` or `{template}-{index}`:

| Example | Description |
|---------|-------------|
| `opencode` | First opencode session |
| `opencode-2` | Second opencode session |
| `opencode-auth` | Named variant (task-specific) |
| `gemini` | First gemini session |
| `gemini-2` | Second gemini session |
| `build` | Build monitoring session |
| `research` | Research session |

### Interaction Pattern

```
OpenClaw (Main AI)
  |
  |-- tmux send-keys --> opencode-1 (Project A)
  |-- tmux send-keys --> opencode-2 (Project B)
  |-- tmux send-keys --> gemini-1   (PDF analysis)
  |-- tmux send-keys --> gemini-2   (Image comparison)
  |-- tmux send-keys --> build      (Build monitoring)
  |
  |<- tmux capture-pane -- (collect results from all sessions)
```

OpenClaw orchestrates by sending commands via `send-keys` and collecting output via `capture-pane`, all through the dedicated tmux socket.

---

## Further Reading

| Document | Path | Description |
|----------|------|-------------|
| README | `README.md` | Project overview, installation, architecture diagrams |
| Installation Guide | `docs/guide/installation.md` | Step-by-step setup instructions |
| Overview Guide | `docs/guide/overview.md` | System overview and concepts |
| Plugin Manifest | `plugin/openclaw.plugin.json` | Plugin metadata and config schema |
| Categories Config | `config/categories.json` | Model routing, skills, tmux, tool restrictions |
| Agent Profiles | `agents/*.md` | Individual agent definitions (10 files) |
| Skill Documents | `plugin/skills/*.md` | Skill definitions with triggers (13 files) |
| Workflow Documents | `workflows/*.md` | Workflow step-by-step guides (7 files) |
| Sample Agent Config | `config/openclaw.sample.json` | Runtime tool restriction examples |
| SKILL.md | `SKILL.md` | Main skill definition file (OpenClaw entry point) |
