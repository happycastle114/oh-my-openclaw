# Similarity Analysis: OmO ↔ OmOC

## TL;DR

Oh-My-OpenClaw (OmOC v0.5.0) is a deliberate, structural port of Oh-My-OpenCode (OmO v3.8.3) to the OpenClaw runtime. The core agent roster, category system, orchestration loop, and philosophy are lifted nearly verbatim — Sisyphus becomes Atlas, Hephaestus stays Hephaestus, and the same four task categories drive routing decisions. The primary divergence is implementation medium: OmO ships agents as compiled TypeScript with 55+ hooks and 17 tools; OmOC ships them as markdown skill files with 5 hooks and 3 tools, relying on OpenClaw's native plugin API and Gemini CLI for capabilities OmO handles internally. OmOC also gains platform features OmO cannot have — Discord/Telegram channels, tmux multi-session orchestration, browser control, and a Graphiti knowledge graph — but it trades away LSP integration, AST-Grep, IntentGate, session tooling, and the full hook ecosystem. The result is a faithful conceptual clone with a meaningfully different capability surface.

---

## Direct Pattern Ports

The following features were ported from OmO to OmOC with minimal conceptual change. "Direct port" means the behavior, naming, and role are preserved. "High" similarity means the same role under a different name.

| OmO Feature | OmOC Equivalent | Similarity |
|---|---|---|
| Sisyphus orchestrator | Atlas orchestrator agent | High — same role, different name |
| Hephaestus deep worker | Hephaestus agent (markdown) | Direct port |
| Prometheus planner | Prometheus agent (markdown) | Direct port |
| Oracle consultant | Oracle agent (markdown) | Direct port |
| Explore/Librarian | Explore/Librarian agents | Direct port |
| Category system (quick/deep/ultrabrain/visual) | Same 4 categories + multimodal + artistry | Direct port |
| ultrawork command | /ultrawork command | Direct port |
| /start-work command | /start-work command | Direct port |
| Ralph Loop | ralph-loop service + commands | Direct port |
| Todo Enforcer hook | todo-enforcer hook | Direct port |
| Comment Checker hook | comment-checker hook (11 patterns) | Direct port |
| Background agents (task tool) | omoc_delegate tool | Adapted |
| look_at tool (multimodal) | omoc_look_at tool (Gemini CLI + tmux) | Adapted |
| Skill system | Markdown skills (13 files) | Adapted |
| /init-deep | scripts/init-deep.sh | Adapted |
| Metis gap analyzer | Metis agent (markdown) | Direct port |
| Momus plan reviewer | Momus agent (markdown) | Direct port |

---

## Adapted Patterns

These features exist in both systems but were meaningfully changed during the port to fit OpenClaw's architecture.

### omoc_delegate (from task tool / background agents)

OmO's `task` tool spawns background agents with full dependency graphs, concurrency control, and runtime model resolution. OmOC's `omoc_delegate` tool is a simplified wrapper: it reads `categories.json` to determine which agent type to invoke, then dispatches a single task. There is no dependency chain, no concurrency limit enforcement, and no provider fallback. The conceptual role — "hand off work to a specialized agent" — is identical; the implementation depth is not.

### omoc_look_at (from look_at tool)

OmO's `look_at` tool is a native TypeScript implementation that passes image or PDF data directly to the model's multimodal API. OmOC's `omoc_look_at` tool achieves the same outcome by shelling out to Gemini CLI via a tmux session, capturing stdout, and returning the result. The interface is the same (file path + goal → analysis text), but the execution path goes through an external process rather than an in-process API call. This makes OmOC's version slower and dependent on Gemini CLI being installed and authenticated.

### Markdown skills (from TypeScript skill system)

OmO's skill system is implemented as TypeScript modules loaded at runtime, with typed interfaces, skill-embedded MCPs, and dynamic context injection. OmOC's skills are plain markdown files in `skills/`. They carry the same instructional content — persona, workflow, rules — but have no runtime type safety, no embedded MCP invocation, and no dynamic loading. The skill content is faithful; the delivery mechanism is a documentation convention rather than a plugin system.

### scripts/init-deep.sh (from /init-deep command)

OmO's `/init-deep` is a built-in command that traverses the project tree and writes hierarchical `AGENTS.md` files with LSP-informed context. OmOC's `scripts/init-deep.sh` is a shell script that performs the same traversal and file generation but without LSP data. The output structure is compatible; the depth of analysis is reduced.

---

## OmO Features NOT in OmOC

These capabilities exist in OmO v3.8.3 and have no equivalent in OmOC v0.5.0.

- **Hash-anchored edit tool** — OmO's edit tool uses LINE#ID format with CID letter pairs for precise, collision-resistant line targeting. OmOC has no equivalent; edits go through OpenClaw's native file tools.
- **LSP tools** — `lsp_goto_definition`, `lsp_find_references`, `lsp_symbols`, `lsp_diagnostics`, `lsp_prepare_rename`, `lsp_rename`. OmOC has no language server integration.
- **AST-Grep** — `ast_grep_search` and `ast_grep_replace` for structural code pattern matching across 25 languages. OmOC has no AST-aware search.
- **IntentGate** — OmO's pre-routing intent classifier that intercepts ambiguous requests before agent selection. OmOC routes directly via categories.json without an intent layer.
- **Session tools** — `session_list`, `session_read`, `session_search`, `session_info` for querying historical conversation data. OmOC has no session persistence tooling.
- **Claude Code compatibility layer** — OmO is built specifically for the Claude Code CLI runtime. OmOC targets OpenClaw and has no Claude Code integration.
- **44+ hooks** — OmO ships over 44 lifecycle hooks covering pre-tool, post-tool, pre-agent, post-agent, and error events. OmOC has 5 hooks.
- **Built-in MCPs** — OmO bundles MCP servers (filesystem, git, GitHub, web search, browser, etc.) as first-class plugin dependencies. OmOC relies on OpenClaw's plugin API for external tool access.
- **Skill-embedded MCPs** — OmO skills can declare and invoke their own MCP servers inline. OmOC markdown skills have no MCP invocation capability.
- **Task system with dependencies** — OmO's task tool supports DAG-style dependency declarations between background tasks. OmOC's omoc_delegate is single-task, no dependency graph.
- **Runtime model resolution with provider chains** — OmO resolves which model to use at runtime based on task category, cost budget, and provider availability, with fallback chains. OmOC uses a static model assignment per agent.
- **Dual-prompt agents** — OmO agents can carry both a system prompt and a separate task prompt, merged at invocation time. OmOC agents use a single markdown skill file.
- **Agent permissions** — OmO agents declare explicit tool permission sets; a Hephaestus agent cannot call tools outside its declared scope. OmOC has no per-agent tool restriction.
- **Dynamic context pruning** — OmO trims conversation context dynamically based on token budget and relevance scoring. OmOC relies on OpenClaw's default context window management.
- **Background task concurrency control** — OmO enforces a configurable maximum number of concurrent background agents. OmOC has no concurrency limit on omoc_delegate calls.

---

## OmOC Features NOT in OmO

These capabilities exist in OmOC v0.5.0 and have no equivalent in OmO v3.8.3.

- **Gemini CLI tmux integration** — OmOC can spawn Gemini CLI in a tmux pane and capture its output, enabling multimodal analysis via a separate model without leaving the OpenClaw runtime.
- **OpenClaw messaging channels** — OmOC agents can send and receive messages through Discord, Telegram, and web interfaces natively. OmO is terminal-only.
- **omoc_checkpoint tool** — OmOC provides a checkpoint mechanism for saving and restoring agent state mid-task. OmO has no equivalent checkpoint primitive.
- **OpenClaw Plugin API** — OmOC is built on OpenClaw's plugin system, which exposes a structured API for tool registration, event hooks, and channel routing. OmO's plugin surface is the Claude Code CLI extension interface.
- **Multi-device access** — Because OmOC runs through OpenClaw's server, the same agent session is accessible from any device with a Discord/Telegram/web client. OmO sessions are local to the terminal.
- **Browser control** — OmOC exposes browser automation tools through OpenClaw's plugin API. OmO has browser MCP support but it is not a first-class agent capability.
- **Graphiti knowledge graph** — OmOC integrates with Graphiti for persistent, queryable knowledge storage across sessions. OmO has no persistent knowledge graph.
- **tmux multi-session orchestration** — OmOC can manage multiple tmux sessions simultaneously, enabling parallel workstreams that survive terminal disconnects. OmO's background agents are in-process and do not persist across terminal sessions.

---

## Architecture Comparison

### OmO v3.8.3

```
TypeScript plugin (agents + hooks + tools)
        ↓
  Claude Code CLI (runtime, MCP host, LSP bridge)
        ↓
     Terminal (single user, local machine)
```

OmO is a monolithic TypeScript plugin that extends Claude Code. All agents, hooks, and tools are compiled into a single plugin bundle. The runtime is the Claude Code CLI, which provides MCP hosting, LSP bridging, and session management. The interface is a local terminal. There is no network layer between the user and the agent.

### OmOC v0.5.0

```
Markdown skills (agent instructions, 13 files)
  + TypeScript plugin (omoc_delegate, omoc_look_at, omoc_checkpoint)
        ↓
  OpenClaw (runtime, plugin host, channel router)
        ↓
  Discord / Telegram / Web (multi-user, multi-device)
        ↓
  (optional) Gemini CLI via tmux (multimodal sidecar)
```

OmOC splits agent intelligence (markdown skills) from tool capability (TypeScript plugin). OpenClaw handles routing, channel management, and plugin lifecycle. The interface is a messaging platform, not a terminal. A Gemini CLI sidecar handles multimodal tasks that OmO handles natively.

### Key Architectural Differences

| Dimension | OmO | OmOC |
|---|---|---|
| Agent implementation | TypeScript classes | Markdown skill files |
| Hook count | 55+ | 5 |
| Tool count | 17 | 3 |
| Runtime | Claude Code CLI | OpenClaw |
| Interface | Terminal | Discord / Telegram / Web |
| Multimodal | Native API call | Gemini CLI via tmux |
| LSP integration | Yes (6 tools) | No |
| AST-Grep | Yes (2 tools) | No |
| Persistence | Session tools | Graphiti knowledge graph |
| Multi-device | No | Yes |
| Model routing | Dynamic, provider chains | Static per agent |

---

## Philosophy

Both OmO and OmOC share the same core philosophy as documented in `manifesto.md`. The key tenets are:

1. **Agents over prompts** — Intelligence lives in specialized agents with defined roles, not in a single monolithic system prompt.
2. **Orchestration over improvisation** — A dedicated orchestrator (Sisyphus/Atlas) routes work to the right specialist rather than letting a general model attempt everything.
3. **Discipline enforced by tooling** — Hooks and enforcers (todo-enforcer, comment-checker) make good practices automatic, not aspirational.
4. **Depth over breadth** — A small number of well-defined agents doing their jobs correctly beats a large number of loosely defined agents doing everything poorly.
5. **The loop is the product** — The Ralph Loop / ralph-loop service embodies the philosophy that continuous, self-correcting iteration is the fundamental unit of productive AI work.

OmOC does not deviate from this philosophy. It applies the same principles to a different runtime and a different interface. The manifesto transfers without modification; only the implementation changes.

---

## Further Reading

- [Guide and Overview](guide/overview.md) — Getting started with OmOC, agent roster, and basic usage patterns.
- [Feature Reference](reference/features.md) — Complete feature list with configuration options and tool signatures.
