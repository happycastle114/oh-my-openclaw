---
name: opencode-controller
description: tmux의 OpenCode 세션을 제어한다. 세션 관리, 모델 선택, 에이전트 전환(Plan/Build), OmO 위임 패턴을 포함.
---

# opencode-controller — OpenCode 세션 제어

OpenClaw는 직접 코드를 쓰는 실행기가 아니라, OpenCode에 작업을 위임해 결과를 수집/검증하는 오케스트레이터다.

## 핵심 원칙

- OpenClaw가 직접 코드를 작성하지 않는다
- 코딩 작업은 tmux `opencode` 세션으로 위임한다
- OpenClaw는 작업 분해, 지시, 모니터링, 결과 검증을 담당한다

## Pre-flight 체크

### 1) Provider/모델 선택

- 작업 난이도에 따라 OpenCode 모델 선택(quick/deep/ultrabrain)
- 고난도 작업은 고성능 모델 우선

### 2) 인증 상태

- OpenCode CLI 제공자 인증이 완료되어 있어야 함
- 인증 만료 시 세션 내에서 재로그인 후 재시도

### 3) tmux 세션 확인

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode
```

## 세션 관리

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 세션 생성
tmux -S "$SOCKET" new -d -s opencode -n main

# 세션 상태
tmux -S "$SOCKET" list-sessions

# 세션 출력 확인
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

## 에이전트 제어

OpenCode 에이전트 전환은 Tab 기반으로 수행한다.

| 에이전트 | 용도 | 전환 |
|----------|------|------|
| Sisyphus | 기본 구현/수정 | 기본 상태 |
| Hephaestus | 깊은 구현/리팩토링 | Tab 1회 |
| Prometheus | 계획 수립/전략화 | Tab 2회 |

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 1
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -20
```

## 모델 선택 가이드

- 빠른 수정: 속도 우선 모델
- 복잡한 리팩토링/설계: 심층 추론 모델
- 계획 전용 단계: 최고 추론 모델 우선

실행 시점에 프로젝트 표준 라우팅(quick/deep/ultrabrain)을 따른다.

## Plan -> Build 워크플로우

1) Prometheus로 계획 수립
2) 계획 승인/정리
3) Sisyphus 또는 Hephaestus로 구현 전환
4) 테스트/빌드/검증 실행
5) 결과를 OpenClaw가 수집해 최종 보고

```bash
# Plan 단계
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 0.2
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- '계획 수립: 인증 모듈 리팩토링 범위/리스크/검증전략 작성'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Build 단계 전환(예: Sisyphus로 복귀 후 구현)
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork 위 계획 기준으로 구현 시작, 테스트까지 완료'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## OmO 위임 패턴

### 1) tmux 세션 검증

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
tmux -S "$SOCKET" has-session -t opencode
```

### 2) 에이전트 선택표

| 목적 | 에이전트 | 전환 |
|------|----------|------|
| 기본 실행 | Sisyphus | 기본 |
| 깊은 구현 | Hephaestus | Tab 1회 |
| 계획 수립 | Prometheus | Tab 2회 |

### 3) 작업 전송 (`send-keys -l` + Enter 분리)

```bash
TASK='ultrawork 결제 실패 버그 수정. 재현, 원인 분석, 테스트 추가, 회귀 방지 포함.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- "$TASK"
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

### 4) 작업 템플릿

기능 구현:
```text
ultrawork [기능] 구현.
요구사항:
- [요구 1]
- [요구 2]
기존 [참조 파일] 패턴을 따르고 테스트까지 수행.
```

버그 수정:
```text
ultrawork [버그 설명] 수정.
재현 경로: [steps]
에러: [message]
기대 동작: [expected]
```

리팩토링:
```text
ultrawork [모듈] 리팩토링.
목표:
- [목표 1]
- [목표 2]
제약:
- Public API 변경 금지
- 기존 테스트 통과
```

리서치 + 구현:
```text
[/path/to/research.md]를 먼저 읽고,
ultrawork 연구 결과 기준으로 [기능] 구현.
```

### 5) 진행 모니터링 (`capture-pane`)

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

권장:
- 10-30초 주기로 진행 로그 확인
- 막힘 징후(동일 출력 반복, 프롬프트 대기) 즉시 개입

### 6) 결과 수집 (`git status`/`git diff`)

```bash
git status
git diff --stat
git diff
```

OpenClaw는 변경 파일/테스트 결과/리스크를 요약해 사용자에게 전달한다.

### 7) 에러 복구

```bash
# 현재 동작 중단
tmux -S "$SOCKET" send-keys -t opencode:0.0 Escape

# 수정 지시 재전송
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- '직전 단계에서 테스트 실패 원인만 먼저 해결해.'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# 세션 재시작
tmux -S "$SOCKET" kill-session -t opencode
tmux -S "$SOCKET" new -d -s opencode -n main
```

## 운영 체크리스트

- 세션 alive 확인 -> 에이전트 선택 -> 작업 전송 -> 모니터링 -> 결과 수집
- 항상 `send-keys -l` + 별도 Enter
- 결과 보고 전에 `git status`/`git diff`로 변경 검증
