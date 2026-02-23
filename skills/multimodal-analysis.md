---
name: multimodal-analysis
description: Multimodal file analysis skill for PDFs, images, and technical diagrams using look-at style patterns.
---

# Multimodal Analysis - File Analysis Skill

Standardizes document/image/diagram analysis based on OmO's `look-at` tool pattern.

## Source Pattern (OmO)

- `look-at` takes a file path + analysis goal and performs multimodal interpretation
- Core input is simple: **what to look at** + **what to extract**

## Supported Inputs

- PDF documents
- Standard images (PNG/JPG/WebP)
- Technical diagrams (architecture/flow/UML/ER)

## Analysis Patterns

### 1) PDF Analysis

- Example goals: summarize, extract policies/requirements, compare changes
- Output: key items as bullets + structured list when needed

### 2) Image Analysis

- Example goals: identify UI components, extract text/labels, compare states
- Output: per-region observations + actionable insights

### 3) Diagram Analysis

- Example goals: component relationships, data flow, bottleneck/risk identification
- Output: node/edge interpretation + improvement points

## Prompt Template

```text
Input: <file_path>
Goal: <what to extract / explain>
Constraints: <format, scope, language>
Output: <summary|table|checklist>
```

## Recommended Workflow

1. Clarify the goal in one sentence
2. Select the appropriate pattern for the file type
3. Convert analysis results into actionable items
4. Mark uncertainty as "estimated" explicitly

## Guardrails

- Do not make assertions when file content is unclear
- Present OCR/visual interpretation results with supporting evidence
- Keep source quotes brief; no excessive copy-paste
