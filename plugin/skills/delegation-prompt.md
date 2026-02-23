---
name: delegation-prompt
description: sessions_spawn 기반 서브에이전트 위임 가이드. 7요소 프롬프트 + sessions_spawn 호출 패턴.
---

# Delegation Prompt + sessions_spawn Guide

OmO의 핵심 컨셉은 **서브에이전트 활용**이다. oh-my-openclaw에서는 OpenClaw의 `sessions_spawn`을 사용하여 실제 서브 에이전트를 생성한다.

## sessions_spawn 사용법

```
sessions_spawn(
  task="...",           # 7요소 프롬프트 (아래 참조)
  mode="run",           # "run" (일회성) | "session" (영구)
  model="...",          # 카테고리별 모델 (아래 표 참조)
  agentId="...",        # 특정 에이전트 지정 (선택 — omoc_prometheus, omoc_sisyphus 등)
  label="...",          # 식별용 라벨 (선택)
  thread=true           # Discord 스레드로 결과 전달 (선택)
)
```

### agentId로 전문 에이전트 지정

`agentId`를 명시하면 해당 에이전트의 페르소나/권한/모델이 자동 적용된다:

| agentId | 역할 | 권한 |
|---------|------|------|
| `omoc_prometheus` | 전략 기획 | read-only (코드 수정 불가) |
| `omoc_atlas` | 오케스트레이션 | read-only (코드 수정 불가) |
| `omoc_sisyphus` | 구현 워커 | full (코드 수정 가능) |
| `omoc_hephaestus` | 딥 구현 | full (코드 수정 가능) |
| `omoc_oracle` | 아키텍처 컨설팅 | read-only |
| `omoc_explore` | 코드 탐색 | read-only |
| `omoc_librarian` | 문서 리서치 | read-only |
| `omoc_metis` | 갭 분석 | read-only |
| `omoc_momus` | 플랜 리뷰 | read-only |

`agentId` 생략 시 기본 에이전트가 `model`에 맞춰 실행된다.

## 카테고리별 모델 매핑

| 카테고리 | 모델 | 용도 |
|---------|------|------|
| quick | claude-sonnet-4-6 | 간단한 수정, 파일 탐색, 검색 |
| deep | claude-opus-4-6-thinking | 복잡한 리팩토링, 분석, 자율 작업 |
| ultrabrain | gpt-5.3-codex | 깊은 추론, 아키텍처 설계 |
| visual-engineering | gemini-3.1-pro | 프론트엔드, UI/UX, 디자인 |
| writing | claude-sonnet-4-6 | 문서, 기술 글쓰기 |

## 위임 결정 기준

기본 원칙: **구현/수정/리팩토링/테스트/빌드 관련 작업은 기본적으로 sessions_spawn 위임이 필수**.

### sessions_spawn을 쓸 때 (서브에이전트)
- **병렬 가능한 독립 작업** (여러 파일 검증, 여러 리포 탐색)
- **시간이 오래 걸리는 작업** (대규모 리팩토링, 전체 코드 분석)
- **다른 모델이 더 적합한 작업** (추론→gpt-5.3, 비주얼→gemini)
- **background=true로 비동기 실행 후 결과 수신**

### 직접 처리할 때 (spawn 불필요)
- 순수 설명/요약/의사결정만 필요한 경우 (파일 변경 없음)
- 사용자 확인 질문에 대한 짧은 응답
- 플랜 문서 작성 자체 (구현 실행 전 단계)

### OmO 구현 위임 (강제)

- 코드 변경이 필요한 작업은 `opencode-controller` + `tmux` + `tmux-agents` 경로로 위임한다.
- 구현 단계에서 "직접 처리"는 예외가 아니라 **금지**다.
- 최소 1개의 실행 세션을 생성하고 결과를 수집/검증한다.

## 7 Required Elements (프롬프트 품질 = 위임 품질)

1. **TASK**: 단일 원자 작업을 명확히 지시
2. **EXPECTED OUTCOME**: 산출물과 성공 기준을 구체화
3. **REQUIRED SKILLS**: 필요한 스킬 목록 명시
4. **REQUIRED TOOLS**: 사용 가능한 도구 화이트리스트
5. **MUST DO**: 반드시 수행할 세부 요구사항
6. **MUST NOT DO**: 금지사항 (범위 확장, 파일 수정 금지 등)
7. **CONTEXT**: 경로, 제약, 기존 패턴, 다운스트림 목적

## 실행 예시

### 예시 1: 코드 분석 (deep, background)
```
sessions_spawn(
  task="""
  1) TASK: /home/happycastle/Projects/my-app/src/ 디렉토리의 테스트 커버리지 분석
  2) EXPECTED OUTCOME: 테스트 없는 파일 목록 + 우선순위별 테스트 작성 계획
  3) REQUIRED SKILLS: none
  4) REQUIRED TOOLS: read, exec (jest --coverage)
  5) MUST DO: 각 파일의 복잡도와 중요도 평가 포함
  6) MUST NOT DO: 테스트 파일 직접 작성하지 말 것
  7) CONTEXT: Jest + TypeScript 프로젝트, src/utils/는 가장 중요
  """,
  mode="run",
  model="claude-opus-4-6-thinking",
  label="test-coverage-analysis"
)
```

### 예시 2: 웹 리서치 (quick, background)
```
sessions_spawn(
  task="""
  1) TASK: Next.js 15의 Server Actions 변경사항 조사
  2) EXPECTED OUTCOME: 주요 변경점 요약 + 마이그레이션 가이드
  3) REQUIRED SKILLS: web-search
  4) REQUIRED TOOLS: web_fetch, exec (mcporter)
  5) MUST DO: 공식 문서 + 커뮤니티 피드백 모두 확인
  6) MUST NOT DO: 코드 수정하지 말 것
  7) CONTEXT: 현재 Next.js 14 사용 중, 업그레이드 검토
  """,
  mode="run",
  model="claude-sonnet-4-6",
  label="nextjs-migration-research"
)
```

### 예시 3: 병렬 작업 (여러 spawn 동시)
```
# 동시에 3개 서브에이전트 실행
sessions_spawn(task="파일 A 리팩토링...", mode="run", model="claude-opus-4-6-thinking", label="refactor-a")
sessions_spawn(task="파일 B 리팩토링...", mode="run", model="claude-opus-4-6-thinking", label="refactor-b")
sessions_spawn(task="테스트 작성...", mode="run", model="claude-sonnet-4-6", label="write-tests")
```

## omoc_delegate와의 관계

`omoc_delegate` 도구는 카테고리 → 모델 매핑만 해준다. 실제 서브에이전트 생성은 반드시 `sessions_spawn`을 호출해야 한다.

**올바른 흐름:**
1. `omoc_delegate`로 카테고리/모델 확인 (선택적)
2. `sessions_spawn`으로 실제 서브에이전트 생성
3. 완료 시 자동 통지 수신 (push-based)

**절대 하지 말 것:**
- `subagents list`를 루프로 폴링하지 말 것 — 결과는 자동으로 돌아옴
- spawn 후 즉시 결과를 기대하지 말 것 — 비동기 실행

## Quality Checklist

- [ ] 결과 검증 기준이 측정 가능하다
- [ ] 입력 경로/범위가 명시되어 있다
- [ ] 금지사항이 모호하지 않다
- [ ] 실패 시 재시도/보고 방식이 정의되어 있다
- [ ] 적절한 카테고리/모델을 선택했다
- [ ] mode가 맞다 (run=일회성, session=영구)

## 서브에이전트 완료 후 행동 (강제)

서브에이전트 완료 통지("✅ Subagent finished")는 **FYI가 아니라 행동 트리거**다.

### 완료 통지를 받으면 반드시:

1. **결과 확인** — 서브에이전트가 산출한 결과를 즉시 읽는다
2. **성공 기준 대조** — 위임 시 명시한 EXPECTED OUTCOME과 비교 검증한다
3. **다음 단계 실행** — 검증 통과 시 즉시 다음 phase/step을 진행한다
4. **실패 시 재시도** — 검증 실패 시 같은 에이전트로 재시도 (최대 3회) 또는 에스컬레이션
5. **멈추지 않는다** — 모든 phase가 완료될 때까지 절대 멈추지 않는다

### 금지사항:

- ❌ 완료 통지를 받고 아무 행동 없이 멈추기
- ❌ "완료되었습니다"만 보고하고 결과를 확인하지 않기
- ❌ 다음 phase가 있는데 사용자 확인을 기다리기 (자동 진행이 기본)
- ❌ 서브에이전트 결과를 무시하고 직접 다시 작업하기

### 병렬 서브에이전트인 경우:

- 각 완료 통지마다 해당 결과를 수집한다
- 모든 병렬 에이전트가 완료되면 의존 phase를 즉시 시작한다
- 일부만 완료된 상태에서는 독립적인 다음 작업을 먼저 진행한다

## Anti-Patterns

- "적당히", "알아서" 같은 모호한 지시
- 도구 무제한 허용
- 컨텍스트 없는 대규모 요청
- 기대 산출물이 없는 위임
- spawn 후 poll 루프로 결과 대기
- 모든 작업을 직접 처리 (서브에이전트 미활용)
- 구현 작업인데 sessions_spawn 없이 직접 코드 수정
- **완료 통지 후 멈추기 (가장 흔한 실패 패턴)**
