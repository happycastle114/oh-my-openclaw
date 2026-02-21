---
description: OmO src/tools 패턴을 OpenClaw에서 재사용 가능한 실행 패턴으로 매핑하는 워크플로우
---

# Tool Patterns Workflow (OmO → OpenClaw)

OmO의 `src/tools/` 구조를 기준으로, OpenClaw에서 실사용 가능한 도구 패턴을 표준화한다.

## 목적

- 도구 선택 실수를 줄이고
- 반복 가능한 실행 루틴을 만들며
- 계획/실행/검증 단계를 일관되게 유지한다.

## 패턴 매핑

| OmO Tool Pattern | 의도 | OpenClaw에서의 사용 패턴 |
|---|---|---|
| `task/*` (task-create/list/update/get, todo-sync) | 작업 상태 동기화 | `todowrite`로 원자적 할 일 관리 (생성 → in_progress → completed 즉시 반영) |
| `lsp/*` (goto/references/symbols/diagnostics/rename) | 안전한 코드 탐색/검증 | `lsp_*` 도구로 정의/참조 탐색 및 변경 후 진단 게이트 수행 |
| `interactive-bash` | 장시간/상호작용 셸 | `interactive_bash`(tmux) 사용, 원샷 명령은 `bash` 사용 |
| `slashcommand` discovery | 명령 워크플로우 구동 | OpenClaw 워크플로우 문서(`/plan`, `/start-work`, `/ultrawork`)를 명령 소스처럼 사용 |
| `session-manager` | 세션 탐색/재개 | `session_list`, `session_read`, `session_search`로 작업 연속성 유지 |
| `skill-mcp` | 스킬 기반 MCP 호출 | `skill`, `skill_mcp`로 도메인별 스킬 로드 후 도구 호출 |
| `look-at` | 멀티모달 분석 | `look_at` 또는 전용 이미지/비디오 분석 도구 사용 |
| `background-task` (output/cancel) | 병렬 작업 수집/정리 | `task(..., run_in_background=true)` + `background_output` + 종료 전 `background_cancel` |

## 실행 절차

### 1) 계획 단계
1. 복잡 작업이면 `todowrite`부터 생성
2. 탐색은 `glob/grep/lsp_symbols` 우선
3. 외부 의존성은 `librarian` 또는 문서 검색 도구 병행

### 2) 구현 단계
1. 변경 전 참조/영향도 파악 (`lsp_find_references`)
2. 작은 단위로 수정
3. 필요 시 전문 에이전트/스킬 조합 사용

### 3) 검증 단계
1. 변경 파일 `lsp_diagnostics`
2. 관련 테스트/빌드 실행
3. 실패 시 원인-기반 수정 후 재검증

### 4) 병렬 작업 관리
1. 독립 탐색/리서치는 background task로 병렬 실행
2. 필요 시점에 `background_output`으로 수집
3. 최종 응답 전 `background_cancel`로 정리

## 금지/주의 사항

- 구현 미요청 상태에서 코드 변경 금지
- 검증 없는 완료 보고 금지
- 장시간 TUI 작업을 일반 `bash`로 처리하지 않기
- 수동 추정으로 API/패턴 확정하지 않기 (검색/근거 필수)

## 체크리스트

- [ ] Todo 상태가 실시간으로 갱신되었는가
- [ ] 도구 선택이 의도와 일치하는가
- [ ] 변경 후 diagnostics/test/build 근거가 있는가
- [ ] 백그라운드 작업이 정리되었는가
