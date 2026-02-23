---
name: web-search
description: Web search and information gathering skill. Integrates OmO's websearch/context7/grep_app MCP patterns with OpenClaw native tools + mcporter MCP. Supports web search, page reading, library documentation search, and open-source code search.
---

# Web Search Skill

Integrated skill for gathering information from the web. Combines OpenClaw native tools (`web_fetch`) with mcporter MCP server to provide diverse search strategies.

## Tool Priority

Choose the optimal tool based on situation:

### 1. OpenClaw Native `web_fetch` (Default)
Fastest and simplest. Suitable when you know the URL or need simple page reading.
```
web_fetch(url="https://example.com", extractMode="markdown")
```
- No additional configuration needed
- Automatic HTML → markdown/text conversion
- Can limit response size with `maxChars`

### 2. mcporter `web-search-prime` (Web Search)
Keyword-based web search. Suitable for latest information, news, tech blog searches.
```bash
mcporter call web-search-prime.webSearchPrime \
  search_query="search term" \
  location="us" \
  content_size="medium"
```
**Parameters:**
- `search_query` (required): Search keywords
- `location`: `us` | `kr` | `jp` etc. (default: `us`)
- `content_size`: `medium` (default) | `high` (detailed, ~2500 chars)
- `search_recency_filter`: `oneDay` | `oneWeek` | `oneMonth` | `oneYear` | `noLimit`

### 3. mcporter `web-reader` (Full Page Reading)
Extract entire content of specific URL cleanly. Use when more accurate extraction than `web_fetch` is needed.
```bash
mcporter call web-reader.webReader \
  url="https://example.com" \
  return_format="markdown"
```
**Parameters:**
- `url` (required): URL to read
- `return_format`: `markdown` (default) | `text`
- `retain_images`: `true` (default) | `false`
- `with_links_summary`: `true` | `false` (summarize links in document)

### 4. mcporter `exa` (Semantic Web Search)
OmO's default web search. Semantic search for more accurate results than keywords.
```bash
mcporter call exa.web_search_exa \
  query="search term"
```
- Works without API key (provided by default)
- Supports semantic search (better results with question format)

### 5. mcporter `context7` (Library Documentation Search)
Search official documentation for programming libraries/frameworks.
```bash
# Library search
mcporter call context7.resolve-library-id \
  libraryName="react"

# Documentation search
mcporter call context7.query-docs \
  libraryId="/facebook/react" \
  query="hooks"
```
**Use cases:**
- Check library API reference
- Search framework usage
- Check latest version changes

### 6. mcporter `grep_app` (Open-Source Code Search)
Search patterns/usage examples in open-source code on GitHub.
```bash
mcporter call grep_app.search \
  query="useEffect cleanup" \
  language="typescript"
```
**Use cases:**
- Find API usage examples in real projects
- Search for pattern/error solutions
- Verify library integration methods

### 7. mcporter `zread` (Direct GitHub Repo Exploration)
Directly read files/documents from specific GitHub repositories.
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
  query="search term"
```

## Search Strategy Guide

### General Search (News, Blogs, General Information)
1. `web-search-prime` → search results → `web_fetch` for detailed page reading

### Technical Documentation Search
1. Search library docs directly with `context7`
2. If not found, use `web-search-prime` to find official docs URL → `web_fetch`

### Code Example Search
1. Search patterns in open-source code with `grep_app`
2. Read specific repo files directly with `zread`
3. Check official examples with `context7`

### Specific Site Information
1. Read URL directly with `web_fetch` (fastest)
2. If content extraction incomplete, retry with `web-reader`

### Latest Information (Today/This Week)
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

| OmO (MCP)       | oh-my-openclaw Equivalent                        |
|------------------|--------------------------------------------------|
| `websearch` (Exa)| `mcporter call exa.web_search_exa` + `web_fetch` |
| `websearch` (Tavily)| `mcporter call web-search-prime.webSearchPrime`|
| `context7`       | `mcporter call context7.resolve-library-id` / `.query-docs` |
| `grep_app`       | `mcporter call grep_app.search`                  |
| *(none)*         | `web_fetch` (OpenClaw native)                    |
| *(none)*         | `web-reader` (MCP, clean page extraction)        |
| *(none)*         | `zread` (MCP, direct GitHub repo exploration)    |
