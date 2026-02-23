---
name: steering-words
description: Detect ultrawork/search/analyze family keywords in multilingual prompts and recommend the best agent mode.
---

# Steering Words - Keyword Detection Skill

Quickly classify user intent based on keywords and recommend the appropriate agent mode.

## Purpose

- Detect **steering words** in input prompts
- Classify into `ultrawork / search / analyze` families
- Recommend mode including multilingual keywords (Korean, Japanese, Chinese)

## Detection Families

### 1) Ultrawork Family

- English: `ultrawork`, `ulw`, `full throttle`, `maximum effort`, `deep think`
- Korean: `울트라워크`, `풀가동`, `최대 노력`, `끝까지`, `전부 자동`
- Japanese: `ウルトラワーク`, `全力`, `最大努力`, `最後まで`, `自動実行`
- Chinese: `超强模式`, `全力模式`, `最大努力`, `一路做完`, `全自动`

**Recommended mode**
- Primary: `/ultrawork`
- Alternative: `hephaestus` for complex implementation, `prometheus` for complex planning

### 2) Search Family

- English: `search`, `find`, `locate`, `lookup`, `scan`, `trace`, `where is`, `list all`
- Korean: `���아`, `검색`, `어디`, `전부 보여`, `목록`
- Japanese: `探して`, `検索`, `どこ`, `一覧`, `全部見せて`
- Chinese: `查找`, `搜索`, `哪里`, `列出`, `全部显示`

**Recommended mode**
- Primary: `explore` (codebase search)
- Supplement with `librarian` when external docs/OSS are needed

### 3) Analyze Family

- English: `analyze`, `analyse`, `investigate`, `examine`, `research`, `audit`, `why`, `how does`
- Korean: `분석`, `조사`, `검토`, `원인`, `왜`, `어떻게`
- Japanese: `分析`, `調査`, `検証`, `原因`, `なぜ`, `どうして`
- Chinese: `分析`, `调查`, `排查`, `原因`, `为什么`, `怎么`

**Recommended mode**
- Primary: `metis` (intent classification / scope refinement)
- Include `oracle` when architecture tradeoffs are involved

## Scoring Rule

1. Count keyword matches per family
2. Select the highest-scoring family
3. On tie, priority order: `ultrawork > analyze > search`
4. If ambiguous, recommend `metis` for re-classification

## Output Template

```markdown
## Steering Detection
- Family: <ultrawork|search|analyze>
- Matched Keywords: <comma-separated>
- Recommended Mode: <mode/agent>
- Reason: <one sentence>
```

## Guardrails

- Keyword detection is a hint, not an absolute rule.
- Explicit user instructions take precedence over keywords.
- Do not normalize multilingual mixed input into a single language — match as-is.
