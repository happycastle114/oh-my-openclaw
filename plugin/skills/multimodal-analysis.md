---
name: multimodal-analysis
description: Multimodal file analysis skill for PDFs, images, and technical diagrams using look-at style patterns.
---

# Multimodal Analysis - File Analysis Skill

Standardizes document/image/diagram analysis based on the OmO `look-at` tool pattern.

## Source Pattern (OmO)

- `look-at` takes a file path + analysis goal and performs multimodal interpretation
- Core inputs are simple: **what to look at** + **what to extract**

## Supported Inputs

- PDF documents
- General images (PNG/JPG/WebP)
- Technical diagrams (architecture/flow/UML/ER)

## Analysis Patterns

### 1) PDF Analysis

- Goal examples: summary, policy/requirement extraction, change comparison
- Output: key items as bullets + structured list if needed

### 2) Image Analysis

- Goal examples: identify screen components, extract text/labels, compare states
- Output: observations by region + actionable insights

### 3) Diagram Analysis

- Goal examples: component relationships, data flow, bottleneck/risk identification
- Output: node/edge interpretation + improvement points

## Prompt Template

```text
Input: <file_path>
Goal: <what to extract / explain>
Constraints: <format, scope, language>
Output: <summary|table|checklist>
```

## Recommended Workflow

1. Clarify goal in one sentence
2. Select pattern matching file type
3. Convert analysis results into actionable items
4. Mark uncertainties as "estimated"

## Guardrails

- Do not make definitive statements if file content is unclear
- Present OCR/visual interpretation results with supporting evidence
- If source quotes are needed, keep them brief—avoid excessive copy-paste
