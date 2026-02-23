---
name: gemini-look-at
description: Multimodal analysis skill using Gemini CLI. Analyzes PDFs, images, screenshots, and diagrams via Gemini's native multimodal capabilities. Runs through tmux gemini session.
---
# Gemini Look-At — Multimodal Analysis via Gemini CLI

Re-implementation of OmO's `look-at` tool using Gemini CLI + tmux.
OpenClaw's `read` tool can send images as attachments, but **cannot read PDFs natively**. Gemini CLI can analyze PDF/image/video natively.

## When to Use

- **PDF analysis** — layout, design, content quality assessment
- **Image/screenshot analysis** — UI review, bug verification, design feedback
- **Diagram interpretation** — architecture, flowchart, ER diagram analysis
- **Multi-file comparison** — compare two PDFs/images side by side
- **OCR + interpretation** — extract text from screenshots + semantic analysis

## Gemini CLI Basics

```bash
# Quick start
gemini "your question..."

# Specify model
gemini --model <name> "prompt..."

# JSON output format
gemini --output-format json "return JSON"

# List extensions
gemini --list-extensions
```

- First run requires interactive login/authentication.
- Do NOT use the `--yolo` flag.

## Execution Methods

### Method 1: tmux gemini session (recommended)

The tmux `gemini` session is already authenticated and stable.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
SESSION="gemini"

# Single file analysis
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt 'Analyze this file. Evaluate layout, design, content quality, and suggest improvements.' -f /path/to/file.pdf -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# Check results (wait 10-30 seconds)
sleep 15
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
```

### Method 2: Save output to file

When analysis output is long, redirect to a file:

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt 'Detailed analysis' -f /path/to/file.pdf -o text > /tmp/gemini-analysis.md 2>&1" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# Read result file
sleep 20
cat /tmp/gemini-analysis.md
```

### Method 3: Multi-file analysis

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt 'Compare these two files' -f /path/to/before.png -f /path/to/after.png -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter
```

## Analysis Prompt Templates

### PDF Layout/Design Review
```
Evaluate this PDF's layout, line breaks, and design.
Point out any unnatural areas specifically.
Check: margins, font sizes, line spacing, page breaks, table/image placement.
```

### Screenshot UI Review
```
Analyze this web UI screenshot.
1. Layout alignment and spacing consistency
2. Typography hierarchy
3. Color contrast and accessibility
4. Interactive element visibility
5. Overall design quality (1-10 score)
Provide specific improvement suggestions.
```

### Architecture Diagram Interpretation
```
Analyze this architecture diagram.
- Identify each component's role
- Describe data flow direction
- Identify potential bottlenecks or single points of failure
- Suggest improvements
```

### Before/After Comparison
```
Compare these two images.
- List specific changes
- Distinguish improvements from regressions
- Suggest additional improvements
```

### Error Screenshot Debugging
```
Analyze this error screenshot.
- Read the error message exactly
- Estimate possible causes
- Suggest solutions
```

## Model Selection Guide

| Purpose | Recommended Model | Reason |
|---------|-------------------|--------|
| Quick check | `gemini-2.5-flash` | Fast, sufficient multimodal ability |
| Detailed analysis | `gemini-2.5-pro` | Deeper analysis, long content |
| Highest quality | `gemini-3.1-pro` | Latest model, best multimodal |

## OpenClaw read vs Gemini CLI

| Feature | OpenClaw `read` | Gemini CLI |
|---------|----------------|------------|
| Images (PNG/JPG) | ✅ Sent as attachment | ✅ Native analysis |
| PDF | ❌ Text only | ✅ Layout-aware analysis |
| Video | ❌ | ✅ Frame analysis |
| Multiple files | ❌ One at a time | ✅ Multiple `-f` flags |
| Authentication | Not needed | tmux session required |

## Workflow: OpenCode + Gemini CLI Integration

When visual verification is needed during coding:

```
1. Write/modify code in OpenCode (tmux opencode session)
2. Generate build/render output (PDF, screenshot, etc.)
3. Verify visual quality with Gemini CLI (tmux gemini session)
4. If issues found → return to OpenCode to fix
5. Repeat until output is satisfactory
```

## Important Notes

- The tmux `gemini` session MUST be running (maintains auth state)
- If `capture-pane` output is truncated, increase lines with `-S -500`
- Use absolute file paths
- Response wait time: 10-60 seconds depending on PDF size
- Do NOT use `--yolo` flag (safety)
