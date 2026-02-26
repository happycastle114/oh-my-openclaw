---
name: gemini-look-at
description: Gemini CLI-based multimodal analysis skill. Analyzes PDFs, images, screenshots, and diagrams using Gemini's native multimodal capabilities. Executed via tmux gemini session.
---

# Gemini Look-At — Multimodal Analysis via Gemini CLI

OmO's `look-at` tool reimplemented with Gemini CLI + tmux.
OpenClaw's `read` tool can send images as attachments, but **cannot read PDFs**, while Gemini CLI can natively analyze PDFs/images/videos.

## When to Use

- **PDF Analysis** — Evaluate layout, design, content quality
- **Image/Screenshot Analysis** — UI review, bug verification, design feedback
- **Diagram Interpretation** — Analyze architecture, flowcharts, ER diagrams
- **Multi-file Comparison** — Compare two PDFs/images simultaneously
- **OCR + Interpretation** — Extract text from screenshots + semantic analysis

## Gemini CLI Basic Usage

```bash
# Quick start
gemini "question..."

# Specify model
gemini --model <name> "prompt..."

# JSON format output
gemini --output-format json "return JSON"

# List extensions
gemini --list-extensions
```

- Interactive login/authentication required on first run
- Do not use `--yolo` flag

## Execution Methods

### Method 1: tmux gemini Session (Recommended)

The tmux `gemini` session is already authenticated, so it's stable.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
SESSION="gemini"

# Single file analysis
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-3-flash-preview --prompt 'Analyze this file. Evaluate layout, design, and content quality, and suggest improvements.' -f /path/to/file.pdf -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# Check results (wait 10-30 seconds)
sleep 15
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
```

### Method 2: Save Results to File

When analysis results are long, redirect to file:

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-3-flash-preview --prompt 'Detailed analysis' -f /path/to/file.pdf -o text > /tmp/gemini-analysis.md 2>&1" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# Read results file
sleep 20
cat /tmp/gemini-analysis.md
```

### Method 3: Analyze Multiple Files Simultaneously

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-3-flash-preview --prompt 'Compare these two files' -f /path/to/before.png -f /path/to/after.png -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter
```

## Analysis Prompts by Pattern

### PDF Layout/Design Review

```
Evaluate this PDF's layout, line breaks, and design.
If there are unnatural parts, tell me specifically.
In particular, check: margins, font size, line spacing, page breaks, table/image placement.
```

### Screenshot UI Review

```
Analyze this web UI screenshot.
1. Layout alignment and spacing consistency
2. Typography hierarchy
3. Color contrast and accessibility
4. Visibility of interactive elements
5. Overall design quality (1-10 score)
Provide specific improvement suggestions.
```

### Architecture Diagram Interpretation

```
Analyze this architecture diagram.
- Identify the role of each component
- Explain data flow direction
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
- Read the error message accurately
- Estimate possible causes
- Suggest solutions
```

## Model Selection Guide

| Use Case          | Recommended Model | Reason                                 |
| ----------------- | ----------------- | -------------------------------------- |
| Quick check       | `gemini-3-flash`  | Fast, sufficient multimodal capability |
| Detailed analysis | `gemini-3-pro`    | Deeper analysis, longer content        |
| Best quality      | `gemini-3.1-pro`  | Latest model, best multimodal          |

## OpenClaw read vs Gemini CLI

| Feature                       | OpenClaw `read`       | Gemini CLI                   |
| ----------------------------- | --------------------- | ---------------------------- |
| Images (PNG/JPG)              | ✅ Send as attachment | ✅ Native analysis           |
| PDF                           | ❌ Text only          | ✅ Layout-inclusive analysis |
| Video                         | ❌                    | ✅ Frame analysis            |
| Multiple files simultaneously | ❌ One at a time      | ✅ Multiple `-f` flags       |
| Authentication                | Not required          | tmux session required        |

## Workflow: OpenCode + Gemini CLI Integration

When visual verification is needed during coding work:

```
1. Write/modify code in OpenCode (tmux opencode session)
2. Generate build/render results (PDF, screenshots, etc.)
3. Verify visual quality with Gemini CLI (tmux gemini session)
4. On issues found → return to OpenCode to fix
5. Repeat (until satisfied with results)
```

## Cautions

- tmux `gemini` session must be running (maintain authentication state)
- If output is cut off in `capture-pane`, increase lines with `-S -500` etc.
- Use absolute paths for files
- Response wait time: 10-60 seconds depending on PDF size
- Do not use `--yolo` flag (safety)
