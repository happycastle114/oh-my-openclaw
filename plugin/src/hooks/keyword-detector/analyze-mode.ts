/**
 * Analyze mode — multilingual keyword regex.
 * Necessary: documents 5-language regex for maintainability.
 *
 * EN: analyze, analyse, investigate, examine, research, study, deep-dive, inspect, audit, evaluate, assess, review, diagnose, scrutinize, dissect, debug, comprehend, interpret, breakdown, understand
 * KO: 분석, 조사, 파악, 연구, 검토, 진단, 이해, 설명, 원인, 이유, 뜯어봐, 따져봐, 평가, 해석, 디버깅, 디버그, 어떻게, 왜, 살펴
 * JA: 分析, 調査, 解析, 検討, 研究, 診断, 理解, 説明, 検証, 精査, 究明, デバッグ, なぜ, どう, 仕組み
 * ZH: 调查, 检查, 剖析, 深入, 诊断, 解释, 调试, 为什么, 原理, 搞清楚, 弄明白
 * VI: phân tích, điều tra, nghiên cứu, kiểm tra, xem xét, chẩn đoán, giải thích, tìm hiểu, gỡ lỗi, tại sao
 */

export const ANALYZE_PATTERN =
  /\b(analyze|analyse|investigate|examine|research|study|deep[\s-]?dive|inspect|audit|evaluate|assess|review|diagnose|scrutinize|dissect|debug|comprehend|interpret|breakdown|understand)\b|why\s+is|how\s+does|how\s+to|분석|조사|파악|연구|검토|진단|이해|설명|원인|이유|뜯어봐|따져봐|평가|해석|디버깅|디버그|어떻게|왜|살펴|分析|調査|解析|検討|研究|診断|理解|説明|検証|精査|究明|デバッグ|なぜ|どう|仕組み|调查|检查|剖析|深入|诊断|解释|调试|为什么|原理|搞清楚|弄明白|phân tích|điều tra|nghiên cứu|kiểm tra|xem xét|chẩn đoán|giải thích|tìm hiểu|gỡ lỗi|tại sao/i;

export const ANALYZE_MESSAGE = `[analyze-mode]
ANALYSIS MODE. Gather context from ALL channels before diving deep:

CONTEXT GATHERING (parallel):
- omoc_delegate(agent_id="omoc_explore") — codebase patterns, implementations
- omoc_delegate(agent_id="omoc_librarian") — external docs, API references
- web-search-prime / context7 — official docs, known issues, changelogs
- grep_app.search — how others solved similar problems in OSS
- gemini CLI with @google — Google Search grounding for real-time info

VISUAL/MULTIMODAL ANALYSIS (if needed):
- gemini CLI (via tmux) with -f flag — analyze PDFs, screenshots, architecture diagrams
- omoc_look_at — quick multimodal analysis of images/screenshots

IF COMPLEX — delegate to specialists:
- omoc_delegate(agent_id="omoc_oracle") — architecture, debugging, complex logic
- omoc_delegate(category="artistry") — unconventional approaches

SYNTHESIZE findings before proceeding.`;
