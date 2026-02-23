---
name: workflow-tool-patterns
description: OmO src/tools 패턴을 OpenClaw에서 재사용 가능한 실행 패턴으로 매핑하는 워크플로우
---

# Tool Patterns Workflow (OmO → OpenClaw)

OmO의 `src/tools/` 구조를 기준으로, OpenClaw에서 실사용 가능한 도구 패턴을 표준화한다.

## 목적

- 도구 선택 실수를 줄이고
- 반복 가능한 실행 루틴을 만들며
- 계획/실행/검증 단계를 일관되게 유지한다.

## 패턴 매핑

> **중요**: 아래 테이블의 "OpenClaw 도구"는 모두 OpenClaw 공식 도구 인벤토리에 실제 존재하는 도구들이다.

| OmO Tool Pattern          | 의도                 | OpenClaw 도구 & 사용 패턴                                          |
| ------------------------- | -------------------- | ------------------------------------------------------------------ |
| `task/*` (todo-sync)      | 작업 상태 추적       | 파일 기반 할 일 관리: `write`로 `workspace/todos.md` 갱신          |
| `lsp/*` (goto/references) | 코드 탐색/검증       | `exec` 도구로 린터/타입체커 실행 → 결과로 검증                     |
| `interactive-bash`        | 장시간/상호작용 셸   | `exec`(`pty: true`) 또는 tmux 연동                                 |
| `bash`                    | 원샷 명령            | `exec`(동기), `exec`(`background: true`) → `process`(`poll`)       |
| `slashcommand`            | 명령 워크플로우 구동 | OpenClaw 스킬 `/ultrawork`, `/plan`, `/start-work` (슬래시 커맨드) |
| `session-manager`         | 세션 탐색/재개       | `sessions_list`, `sessions_history`, `session_status`              |
| `skill-mcp`               | 스킬 기반 도구 호출  | OpenClaw 스킬 시스템 (`read` → SKILL.md 참조)                      |
| `look-at`                 | 멀티모달 분석        | `image` 도구 + Gemini CLI tmux 연동                                |
| `background-task`         | 병렬 작업            | `exec`(`background: true`) → `process`(`poll`/`log`/`kill`)        |
| `file-read/write/edit`    | 파일 조작            | `read`, `write`, `edit`, `apply_patch` (`group:fs`)                |
| `web-search`              | 웹 검색              | `web_search`, `web_fetch` (`group:web`)                            |
| `memory`                  | 지식 축적            | `memory_search`, `memory_get` (`group:memory`)                     |
| `delegation`              | 서브에이전트 위임    | `sessions_spawn`(`task`, `agentId`, `model`)                       |

## OpenClaw Tool Groups 정리

| Group            | 포함 도구                                        | 활용                         |
| ---------------- | ------------------------------------------------ | ---------------------------- |
| `group:fs`       | read, write, edit, apply_patch                   | 파일 조작 전반               |
| `group:runtime`  | exec, bash, process                              | 명령 실행 + 백그라운드 관리  |
| `group:sessions` | sessions_list/history/send/spawn, session_status | 멀티 에이전트                |
| `group:memory`   | memory_search, memory_get                        | 지식 검색 (저장은 파일 기반) |
| `group:web`      | web_search, web_fetch                            | 웹 검색/페치                 |
| `group:ui`       | browser, canvas                                  | 브라우저/UI                  |

## 실행 절차

### 1) 계획 단계

1. 복잡 작업이면 `write`로 `workspace/todos.md` 생성
2. 탐색은 `exec` + grep/find 우선
3. 외부 의존성은 `web_search`/`web_fetch` 또는 librarian 에이전트 병행

### 2) 구현 단계

1. 변경 전 `read` + `exec`(grep)로 영향도 파악
2. 작은 단위로 `edit`/`apply_patch` 수정
3. 필요 시 `sessions_spawn`로 전문 에이전트 위임

### 3) 검증 단계

1. `exec`로 린터/타입체커 실행
2. `exec`로 관련 테스트/빌드 실행
3. 실패 시 원인-기반 `edit` 후 재검증

### 4) 병렬 작업 관리

1. 독립 탐색/리서치는 `exec`(`background: true`)로 병렬 실행
2. `process`(`poll`/`log`)로 결과 수집
3. 최종 응답 전 `process`(`kill`)로 정리

## 금지/주의 사항

- 구현 미요청 상태에서 코드 변경 금지
- 검증 없는 완료 보고 금지
- 장시간 TUI 작업은 `exec`(`pty: true`) 사용
- 수동 추정으로 API/패턴 확정하지 않기 (검색/근거 필수)

## 체크리스트

- [ ] Todo 상태가 `workspace/todos.md`에 실시간 반영되었는가
- [ ] 사용한 도구가 OpenClaw 공식 도구 인벤토리에 존재하는가
- [ ] 변경 후 `exec`로 test/build 근거가 있는가
- [ ] 백그라운드 작업이 `process`(`kill`)로 정리되었는가
