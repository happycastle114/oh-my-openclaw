/**
 * Search mode — multilingual keyword regex.
 * Necessary: documents 5-language regex for maintainability.
 *
 * EN: search, find, locate, lookup, explore, discover, scan, grep, query, browse, detect, trace, seek, track, pinpoint, hunt
 * KO: 검색, 찾아, 탐색, 조회, 스캔, 서치, 뒤져, 찾기, 어디, 추적, 탐지, 찾아봐, 찾아내, 보여줘, 목록
 * JA: 検索, 探して, 見つけて, サーチ, 探索, スキャン, どこ, 発見, 捜索, 見つけ出す, 一覧
 * ZH: 搜索, 查找, 寻找, 查询, 检索, 定位, 扫描, 发现, 在哪里, 找出来, 列出
 * VI: tìm kiếm, tra cứu, định vị, quét, phát hiện, truy tìm, tìm ra, ở đâu, liệt kê
 */

export const SEARCH_PATTERN =
  /\b(search|find|locate|lookup|look\s*up|explore|discover|scan|grep|query|browse|detect|trace|seek|track|pinpoint|hunt)\b|where\s+is|show\s+me|list\s+all|검색|찾아|탐색|조회|스캔|서치|뒤져|찾기|어디|추적|탐지|찾아봐|찾아내|보여줘|목록|検索|探して|見つけて|サーチ|探索|スキャン|どこ|発見|捜索|見つけ出す|一覧|搜索|查找|寻找|查询|检索|定位|扫描|发现|在哪里|找出来|列出|tìm kiếm|tra cứu|định vị|quét|phát hiện|truy tìm|tìm ra|ở đâu|liệt kê/i;

export const SEARCH_MESSAGE = `[search-mode]
MAXIMIZE SEARCH EFFORT. Use ALL available channels IN PARALLEL:

AGENT DELEGATION (omoc_delegate):
- agent_id="omoc_explore" — codebase patterns, file structures, cross-module references
- agent_id="omoc_librarian" — external docs, OSS examples, API references

WEB SEARCH (mcporter MCP + OpenClaw native):
- web-search-prime.webSearchPrime — keyword web search (news, blogs, latest info)
- exa.web_search_exa — semantic web search (better for question-format queries)
- context7 — library/framework official documentation
- grep_app.search — open-source code pattern search on GitHub
- zread — direct GitHub repo file exploration
- web_fetch — direct URL reading

GEMINI CLI (via tmux gemini session):
- gemini with @google extension — Google Search grounding for real-time info
- gemini with -f flag — analyze PDFs/images/screenshots if visual context needed

Launch multiple delegates + web searches simultaneously.
NEVER stop at first result — be exhaustive.`;
