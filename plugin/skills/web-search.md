---
name: web-search
description: 웹 검색 및 정보 수집 스킬. OmO의 websearch/context7/grep_app MCP 패턴을 OpenClaw 네이티브 도구 + mcporter MCP로 통합. 웹 검색, 페이지 읽기, 라이브러리 문서 검색, 오픈소스 코드 검색을 지원한다.
---

# Web Search Skill

웹에서 정보를 수집하는 통합 스킬. OpenClaw 네이티브 도구(`web_fetch`)와 mcporter MCP 서버를 조합하여 다양한 검색 전략을 제공한다.

## 도구 우선순위

상황에 따라 최적의 도구를 선택:

### 1. OpenClaw 네이티브 `web_fetch` (기본)
가장 빠르고 간단. URL을 알고 있거나 간단한 페이지 읽기에 적합.
```
web_fetch(url="https://example.com", extractMode="markdown")
```
- 별도 설정 불필요
- HTML → markdown/text 자동 변환
- `maxChars`로 응답 크기 제한 가능

### 2. mcporter `web-search-prime` (웹 검색)
키워드 기반 웹 검색. 최신 정보, 뉴스, 기술 블로그 검색에 적합.
```bash
mcporter call web-search-prime.webSearchPrime \
  search_query="검색어" \
  location="us" \
  content_size="medium"
```
**파라미터:**
- `search_query` (필수): 검색 키워드
- `location`: `us` | `kr` | `jp` 등 (기본: `us`)
- `content_size`: `medium` (기본) | `high` (상세, ~2500자)
- `search_recency_filter`: `oneDay` | `oneWeek` | `oneMonth` | `oneYear` | `noLimit`

### 3. mcporter `web-reader` (페이지 전문 읽기)
특정 URL의 전체 내용을 깔끔하게 추출. `web_fetch`보다 정확한 추출이 필요할 때.
```bash
mcporter call web-reader.webReader \
  url="https://example.com" \
  return_format="markdown"
```
**파라미터:**
- `url` (필수): 읽을 URL
- `return_format`: `markdown` (기본) | `text`
- `retain_images`: `true` (기본) | `false`
- `with_links_summary`: `true` | `false` (문서 내 링크 요약)

### 4. mcporter `exa` (시맨틱 웹 검색)
OmO의 기본 웹서치. 의미 기반(semantic) 검색으로 키워드보다 정확한 결과.
```bash
mcporter call exa.web_search_exa \
  query="검색어"
```
- API 키 없이도 동작 (기본 제공)
- 시맨틱 검색 지원 (질문 형태로 검색하면 더 좋은 결과)

### 5. mcporter `context7` (라이브러리 문서 검색)
프로그래밍 라이브러리/프레임워크의 공식 문서를 검색.
```bash
# 라이브러리 검색
mcporter call context7.resolve-library-id \
  libraryName="react"

# 문서 검색
mcporter call context7.get-library-docs \
  context7CompatibleLibraryID="/facebook/react" \
  topic="hooks"
```
**용도:**
- 라이브러리 API 레퍼런스 확인
- 프레임워크 사용법 검색
- 최신 버전 변경사항 확인

### 6. mcporter `grep_app` (오픈소스 코드 검색)
GitHub 등 오픈소스 코드에서 패턴/사용 예시를 검색.
```bash
mcporter call grep_app.search \
  query="useEffect cleanup" \
  language="typescript"
```
**용도:**
- 실제 프로젝트에서의 API 사용 예시 찾기
- 특정 패턴/에러의 해결책 검색
- 라이브러리 통합 방법 확인

### 7. mcporter `zread` (GitHub 리포 직접 탐색)
특정 GitHub 리포지토리의 파일/문서를 직접 읽기.
```bash
# 리포 구조 확인
mcporter call zread.get_repo_structure \
  repo_name="owner/repo"

# 파일 읽기
mcporter call zread.read_file \
  repo_name="owner/repo" \
  file_path="src/index.ts"

# 문서/이슈 검색
mcporter call zread.search_doc \
  repo_name="owner/repo" \
  query="검색어"
```

## 검색 전략 가이드

### 일반 검색 (뉴스, 블로그, 일반 정보)
1. `web-search-prime` → 검색 결과 → `web_fetch`로 상세 페이지 읽기

### 기술 문서 검색
1. `context7`로 라이브러리 문서 직접 검색
2. 없으면 `web-search-prime`으로 공식 문서 URL 찾기 → `web_fetch`

### 코드 예시 검색
1. `grep_app`으로 오픈소스 코드에서 패턴 검색
2. `zread`로 특정 리포 파일 직접 읽기
3. `context7`로 라이브러리 공식 예시 확인

### 특정 사이트 정보
1. `web_fetch`로 직접 URL 읽기 (가장 빠름)
2. 내용 추출이 불완전하면 `web-reader`로 재시도

### 최신 정보 (오늘/이번 주)
1. `web-search-prime` + `search_recency_filter="oneDay"` 또는 `"oneWeek"`
2. `exa`로 시맨틱 검색 보완

## mcporter 설정

MCP 서버들은 `~/.openclaw/workspace/config/mcporter.json`에 설정되어 있다:

```json
{
  "mcpServers": {
    "web-search-prime": { "type": "remote", "url": "https://api.z.ai/api/mcp/web_search_prime/mcp" },
    "web-reader": { "type": "remote", "url": "https://api.z.ai/api/mcp/web_reader/mcp" },
    "exa": { "type": "remote", "url": "https://mcp.exa.ai/mcp?tools=web_search_exa" },
    "context7": { "type": "remote", "url": "https://mcp.context7.com/mcp" },
    "grep_app": { "type": "remote", "url": "https://mcp.grep.app" },
    "zread": { "type": "remote", "url": "https://api.z.ai/api/mcp/zread/mcp" }
  }
}
```

## OmO 대응표

| OmO (MCP)       | oh-my-openclaw 대응                              |
|------------------|--------------------------------------------------|
| `websearch` (Exa)| `mcporter call exa.web_search_exa` + `web_fetch` |
| `websearch` (Tavily)| `mcporter call web-search-prime.webSearchPrime`|
| `context7`       | `mcporter call context7.resolve-library-id` / `.get-library-docs` |
| `grep_app`       | `mcporter call grep_app.search`                  |
| *(없음)*         | `web_fetch` (OpenClaw 네이티브)                   |
| *(없음)*         | `web-reader` (MCP, 깔끔한 페이지 추출)            |
| *(없음)*         | `zread` (MCP, GitHub 리포 직접 탐색)               |
