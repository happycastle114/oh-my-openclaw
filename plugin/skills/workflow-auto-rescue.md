---
description: Session recovery workflow with checkpointing, failure detection, and automatic restore using file-based checkpoints + memory_search.
---

# Auto-Rescue Workflow

장시간 작업 중 실패/중단 상황에서 세션을 자동 복구한다.

## When to Use

- 긴 구현/리팩터링 세션
- 다중 단계 작업(5+ step)
- 반복 실패 가능성이 높은 디버깅/빌드 복구 작업

## Core Mechanism

- **Checkpoint 저장**: 주요 단계마다 `write` 도구로 파일 저장 (`workspace/checkpoints/`)
- **Checkpoint 조회**: 복구 시 `read` 도구 + `memory_search` (OpenClaw 네이티브)
- **자동 복원**: 가장 최근 정상 상태부터 재시작

> **Note**: OpenClaw의 `group:memory`에는 `memory_search`/`memory_get`만 존재하고
> `memory_store`는 없다. 저장은 반드시 파일 기반(`write`)으로 수행한다.

## Checkpoint Schema

`workspace/checkpoints/checkpoint-<timestamp>.json`에 다음 형태로 저장한다:

```json
{
  "type": "session-checkpoint",
  "session_id": "<id>",
  "task": "<current task>",
  "step": "<current step>",
  "changed_files": ["path/a", "path/b"],
  "verification": {
    "diagnostics": "pass|fail|not-run",
    "tests": "pass|fail|not-run",
    "build": "pass|fail|not-run"
  },
  "next_action": "<what to do next>",
  "timestamp": "<iso8601>"
}
```

## Workflow Steps

### 1) Start Monitoring

1. 세션 시작 시 checkpoint baseline 저장 (`write` → `workspace/checkpoints/`)
2. todo 기준으로 단계 전환마다 checkpoint 갱신
3. 실패 가능 작업 전(대규모 edit/build/test) 선저장

### 2) Failure Detection

다음 중 하나면 rescue 트리거:

- 동일 오류 3회 연속 발생
- 빌드/테스트가 연속 실패하고 진행 불가
- 세션 중단(타임아웃/강제 인터럽트/에이전트 중지)

### 3) Recovery Procedure

1. `read` 도구로 `workspace/checkpoints/` 내 최근 checkpoint 파일 읽기
2. 가장 최신 `verification`이 정상(pass)인 지점 선택
3. 해당 시점의 `next_action`부터 재개
4. 동일 실패 재발 시 한 단계 이전 checkpoint로 롤백

### 4) Post-Recovery

1. 복구 성공 상태를 새 checkpoint 파일로 저장 (`write`)
2. 실패 원인/해결을 `workspace/notepads/issues.md`에 기록
3. 남은 단계 계속 진행

## OpenClaw Tool Mapping

| 동작            | 사용할 도구     | 비고                                         |
| --------------- | --------------- | -------------------------------------------- |
| Checkpoint 저장 | `write`         | `workspace/checkpoints/checkpoint-<ts>.json` |
| Checkpoint 읽기 | `read`          | 직접 파일 경로 지정                          |
| 과거 기억 검색  | `memory_search` | OpenClaw `group:memory`                      |
| 특정 기억 조회  | `memory_get`    | key 기반                                     |
| 파일 목록 확인  | `exec` (ls)     | checkpoint 디렉토리 스캔                     |

## Example

```text
# 저장
write({ path: "workspace/checkpoints/checkpoint-2026-02-22T13-00.json", content: "{ ... }" })

# 복구 시 읽기
read({ path: "workspace/checkpoints/checkpoint-2026-02-22T13-00.json" })

# 세션 기억에서 관련 컨텍스트 검색
memory_search({ query: "session-checkpoint auth refactor" })
```

## Completion Criteria

- 복구 후 작업이 실제로 재개됨
- 최신 checkpoint 파일이 저장됨
- 동일 실패 루프가 차단됨
