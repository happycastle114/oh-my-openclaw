---
name: web-search
description: Web search and information gathering skill. Integrates OmO's websearch/context7/grep_app MCP patterns into OpenClaw native tools + mcporter MCP. Supports web search, page reading, library docs search, and open-source code search.
---

# Web Search Skill

Unified skill for gathering information from the web. Combines OpenClaw native tools (`web_fetch`) with mcporter MCP servers to provide diverse search strategies.

## Tool Priority

Select the optimal tool based on the situation:

### 1. OpenClaw Native `web_fetch` (default)
Fastest and simplest. Best when you have the URL or need simple page reading.
```
web_fetch(url="https://example.com", extractMode="markdown")
```
- No additional setup needed
- Auto-converts HTML → markdown/text
- Response size limitable via `maxChars`

### 2. mcporter `web-search-prime` (web search)
Keyword-based web search. Best for latest info, news, tech blogs.
```bash
mcporter call web-search-prime.webSearchPrime \
  search_query="search terms" \
  location="us" \
  content_size="medium"
```
**Parameters:**
- `search_query` (required): Search keywords
- `location`: `us` | `kr` | `jp` etc. (default: `us`)
- `content_size`: `medium` (default) | `high` (detailed, ~2500 chars)
- `search_recency_filter`: `oneDay` | `oneWeek` | `oneMonth` | `oneYear` | `noLimit`

### 3. mcporter `web-reader` (full page reading)
Clean extraction of full page content. Use when `web_fetch` extraction is incomplete.
```bash
mcporter call web-reader.webReader \
  url="https://example.com" \
  return_format="markdown"
```
**Parameters:**
- `url` (required): URL to read
- `return_format`: `markdown` (default) | `text`
- `retain_images`: `true` (default) | `false`
- `with_links_summary`: `true` | `false` (summarize links in doc)

### 4. mcporter `exa` (semantic web search)
OmO's default web search. Semantic search for more accurate results than keywords.
```bash
mcporter call exa.web_search_exa \
  query="search terms"
```
- Works without API key (provided by default)
- Semantic search (question-form queries yield better results)

### 5. mcporter `context7` (library docs search)
Search official docs for programming libraries/frameworks.
```bash
# Find library
mcporter call context7.resolve-library-id \
  libraryName="react"

# Search docs
mcporter call context7.query-docs \
  libraryId="/facebook/react" \
  query="hooks"
```
**Use for:**
- Library API reference lookup
- Framework usage search
- Latest version changelog

### 6. mcporter `grep_app` (open-source code search)
Search patterns/usage examples in GitHub and other open-source code.
```bash
mcporter call grep_app.search \
  query="useEffect cleanup" \
  language="typescript"
```
**Use for:**
- Finding real-world API usage examples
- Searching for pattern/error solutions
- Library integration examples

### 7. mcporter `zread` (GitHub repo direct access)
Directly read files/docs from specific GitHub repositories.
```bash
# Check repo structure
mcporter call zread.get_repo_structure \
  repo_name="owner/repo"

# Read file
mcporter call zread.read_file \
  repo_name="owner/repo" \
  file_path="src/index.ts"

# Search docs/issues
mcporter call zread.search_doc \
  repo_name="owner/repo" \
  query="search terms"
```

## Search Strategy Guide

### General Search (news, blogs, general info)
1. `web-search-prime` → results → `web_fetch` for detailed page reading

### Technical Documentation
1. `context7` for direct library docs search
2. If not found, `web-search-prime` to find official docs URL → `web_fetch`

### Code Examples
1. `grep_app` for pattern search in open-source code
2. `zread` for direct file reading from specific repos
3. `context7` for official library examples

### Specific Site Info
1. `web_fetch` for direct URL reading (fastest)
2. If extraction is incomplete, retry with `web-reader`

### Latest Info (today/this week)
1. `web-search-prime` + `search_recency_filter="oneDay"` or `"oneWeek"`
2. Supplement with `exa` semantic search

## mcporter Configuration

MCP servers are configured in `~/.openclaw/workspace/config/mcporter.json`:

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

## OmO Mapping Table

| OmO (MCP) | oh-my-openclaw equivalent |
|-----------|---------------------------|
| `websearch` (Exa) | `mcporter call exa.web_search_exa` + `web_fetch` |
| `websearch` (Tavily) | `mcporter call web-search-prime.webSearchPrime` |
| `context7` | `mcporter call context7.resolve-library-id` / `.query-docs` |
| `grep_app` | `mcporter call grep_app.search` |
| *(none)* | `web_fetch` (OpenClaw native) |
| *(none)* | `web-reader` (MCP, clean page extraction) |
| *(none)* | `zread` (MCP, direct GitHub repo access) |
