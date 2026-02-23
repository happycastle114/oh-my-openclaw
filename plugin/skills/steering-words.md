---
name: steering-words
description: Detect ultrawork/search/analyze family keywords in multilingual prompts and recommend the best agent mode.
---

# Steering Words - Keyword Detection Skill

Quickly classify user intent based on keywords and recommend the appropriate agent mode.

## Purpose

- Detect **steering words** in input prompts
- Classify into `ultrawork / search / analyze` families
- Recommend mode including Korean/Japanese/Chinese keywords

## Detection Families

### 1) Ultrawork Family

- English: `ultrawork`, `ulw`, `full throttle`, `maximum effort`, `deep think`
 Korean (transliterated): `ultrawork`, `full-power`, `max-effort`, `until-the-end`, `fully-automatic`
- Japanese: `ウルトラワーク`, `全力`, `最大努力`, `最後まで`, `自動実行`
- Chinese: `超强模式`, `全力模式`, `最大努力`, `一路做完`, `全自动`

**Recommended Mode**
- Priority: `/ultrawork`
- Alternative: `hephaestus` for complex implementation, `prometheus` for complex planning

### 2) Search Family

- English: `search`, `find`, `locate`, `lookup`, `scan`, `trace`, `where is`, `list all`
 Korean (transliterated): `find`, `search`, `where`, `show-all`, `list`
- Japanese: `探して`, `検索`, `どこ`, `一覧`, `全部見せて`
- Chinese: `查找`, `搜索`, `哪里`, `列出`, `全部显示`

**Recommended Mode**
- Priority: `explore` (codebase exploration)
- Combine with `librarian` if external docs/OSS needed

### 3) Analyze Family

- English: `analyze`, `analyse`, `investigate`, `examine`, `research`, `audit`, `why`, `how does`
 Korean (transliterated): `analyze`, `investigate`, `review`, `cause`, `why`, `how`
- Japanese: `分析`, `調査`, `検証`, `原因`, `なぜ`, `どうして`
- Chinese: `分析`, `调查`, `排查`, `原因`, `为什么`, `怎么`

**Recommended Mode**
- Priority: `metis` (intent classification/scope refinement)
- Include `oracle` if architecture trade-offs involved

## Scoring Rule

1. Aggregate keyword match count by family
2. Select family with highest score
3. On tie, priority: `ultrawork > analyze > search`
4. If ambiguous, recommend `metis` then reclassify

## Output Template

```markdown
## Steering Detection
- Family: <ultrawork|search|analyze>
- Matched Keywords: <comma-separated>
- Recommended Mode: <mode/agent>
- Reason: <one sentence>
```

## Guardrails

- Keyword detection is a hint, not an absolute rule
- Explicit user instructions take priority over keywords
- For multilingual mixed input, match as-is without normalizing to single language
