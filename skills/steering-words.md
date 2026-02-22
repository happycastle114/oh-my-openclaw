---
name: steering-words
description: Detect ultrawork/search/analyze family keywords in multilingual prompts and recommend the best agent mode.
---

# Steering Words - Keyword Detection Skill

키워드 기반으로 사용자 의도를 빠르게 분류하고 적절한 에이전트 모드를 추천한다.

## 목적

- 입력 프롬프트에서 **steering words**를 감지
- `ultrawork / search / analyze` 패밀리로 분류
- 한국어/일본어/중국어 키워드를 포함해 모드 추천

## Detection Families

### 1) Ultrawork Family

- English: `ultrawork`, `ulw`, `full throttle`, `maximum effort`, `deep think`
- 한국어: `울트라워크`, `풀가동`, `최대 노력`, `끝까지`, `전부 자동`
- 日本語: `ウルトラワーク`, `全力`, `最大努力`, `最後まで`, `自動実行`
- 中文: `超强模式`, `全力模式`, `最大努力`, `一路做完`, `全自动`

**추천 모드**
- 우선: `/ultrawork`
- 대안: 복잡 구현이면 `hephaestus`, 복잡 계획이면 `prometheus`

### 2) Search Family

- English: `search`, `find`, `locate`, `lookup`, `scan`, `trace`, `where is`, `list all`
- 한국어: `찾아`, `검색`, `어디`, `전부 보여`, `목록`
- 日本語: `探して`, `検索`, `どこ`, `一覧`, `全部見せて`
- 中文: `查找`, `搜索`, `哪里`, `列出`, `全部显示`

**추천 모드**
- 우선: `explore` (코드베이스 탐색)
- 외부 문서/OSS 필요 시: `librarian` 병행

### 3) Analyze Family

- English: `analyze`, `analyse`, `investigate`, `examine`, `research`, `audit`, `why`, `how does`
- 한국어: `분석`, `조사`, `검토`, `원인`, `왜`, `어떻게`
- 日本語: `分析`, `調査`, `検証`, `原因`, `なぜ`, `どうして`
- 中文: `分析`, `调查`, `排查`, `原因`, `为什么`, `怎么`

**추천 모드**
- 우선: `metis` (의도 분류/범위 정제)
- 아키텍처 트레이드오프 포함 시: `oracle`

## Scoring Rule

1. 패밀리별 키워드 매칭 수를 집계
2. 최다 점수 패밀리를 선택
3. 동점이면 우선순위: `ultrawork > analyze > search`
4. 모호하면 `metis` 추천 후 재분류

## Output Template

```markdown
## Steering Detection
- Family: <ultrawork|search|analyze>
- Matched Keywords: <comma-separated>
- Recommended Mode: <mode/agent>
- Reason: <one sentence>
```

## Guardrails

- 키워드 감지는 힌트이며 절대 규칙이 아니다.
- 명시적 사용자 지시가 있으면 키워드보다 우선한다.
- 다국어 혼합 입력은 단일 언어로 정규화하지 말고 그대로 매칭한다.
