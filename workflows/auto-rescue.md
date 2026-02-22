---
description: Session recovery workflow with checkpointing, failure detection, and automatic restore using memory_store/memory_search.
---

# Auto-Rescue Workflow

장시간 작업 중 실패/중단 상황에서 세션을 자동 복구한다.

## When to Use

- 긴 구현/리팩터링 세션
- 다중 단계 작업(5+ step)
- 반복 실패 가능성이 높은 디버깅/빌드 복구 작업

## Core Mechanism

- **Checkpoint 저장**: 주요 단계마다 `memory_store`
- **Checkpoint 조회**: 복구 시 `memory_search`
- **자동 복원**: 가장 최근 정상 상태부터 재시작

## Checkpoint Schema

`memory_store`에 다음 형태로 저장한다:

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

1. 세션 시작 시 checkpoint baseline 저장
2. todo 기준으로 단계 전환마다 checkpoint 갱신
3. 실패 가능 작업 전(대규모 edit/build/test) 선저장

### 2) Failure Detection

다음 중 하나면 rescue 트리거:

- 동일 오류 3회 연속 발생
- 빌드/테스트가 연속 실패하고 진행 불가
- 세션 중단(타임아웃/강제 인터럽트/에이전트 중지)

### 3) Recovery Procedure

1. `memory_search`로 최근 `session-checkpoint` 검색
2. 가장 최신 `verification`이 정상(pass)인 지점 선택
3. 해당 시점의 `next_action`부터 재개
4. 동일 실패 재발 시 한 단계 이전 checkpoint로 롤백

### 4) Post-Recovery

1. 복구 성공 상태를 새 checkpoint로 저장
2. 실패 원인/해결을 별도 기록(`memory_store`)
3. 남은 단계 계속 진행

## Example Calls

```text
memory_store({ type: "session-checkpoint", ... })
memory_search({ query: "session-checkpoint session_id:<id>" })
```

## Completion Criteria

- 복구 후 작업이 실제로 재개됨
- 최신 checkpoint가 저장됨
- 동일 실패 루프가 차단됨
