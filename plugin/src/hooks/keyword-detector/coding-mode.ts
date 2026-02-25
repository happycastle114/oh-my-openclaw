/**
 * Coding mode — multilingual keyword regex.
 * Necessary: documents 5-language regex for maintainability.
 *
 * EN: implement, code, build, develop, refactor, fix, patch, write code, program, create, scaffold, migrate, port, convert
 * KO: 구현, 코딩, 개발, 리팩토링, 수정, 패치, 코드 작성, 만들어, 짜줘, 고쳐, 빌드, 변환, 마이그레이션
 * JA: 実装, コーディング, 開発, リファクタリング, 修正, パッチ, コード, 作って, ビルド, 変換
 * ZH: 实现, 编码, 开发, 重构, 修复, 补丁, 写代码, 构建, 转换, 迁移
 * VI: triển khai, lập trình, phát triển, tái cấu trúc, sửa lỗi, viết code, xây dựng, chuyển đổi
 */

export const CODING_PATTERN =
  /\b(implement|code|build|develop|refactor|fix|patch|program|scaffold|migrate|port|convert)\b|write\s+code|구현|코딩|개발|리팩토링|수정|패치|코드\s*작성|만들어|짜줘|고쳐|빌드|변환|마이그레이션|実装|コーディング|開発|リファクタリング|修正|パッチ|コード|作って|ビルド|変換|实现|编码|开发|重构|修复|补丁|写代码|构建|转换|迁移|triển khai|lập trình|phát triển|tái cấu trúc|sửa lỗi|viết code|xây dựng|chuyển đổi/i;

export const CODING_MESSAGE = `[coding-mode]
CODING TASK DETECTED. Use the right execution channel:

PRIMARY — tmux OpenCode/OmO session (opencode-controller skill):
- Delegate implementation to OpenCode running in tmux for full OmO power
- Use for: heavy coding, multi-file refactors, test writing, build/lint cycles

ALTERNATIVE — omoc_delegate for lighter tasks:
- omoc_delegate(category="quick", agent_id="omoc_sisyphus") — simple fixes, single-file changes
- omoc_delegate(category="deep", agent_id="omoc_hephaestus") — complex refactoring, architecture changes

CONTEXT GATHERING (parallel, before coding):
- omoc_delegate(agent_id="omoc_explore") — understand existing patterns first
- context7 / grep_app.search — check library APIs, find OSS examples

VERIFICATION (after coding):
- Run tests, linter, type-check, build via tmux opencode session
- gemini CLI with -f flag — visual verification of UI changes if applicable`;
