---
name: tmux
description: tmux 세션 원격제어 + 멀티 세션 오케스트레이션. send-keys/capture-pane으로 인터랙티브 CLI를 제어하고 병렬 세션을 운영한다.
---

# tmux — 세션 제어와 병렬 오케스트레이션

OpenClaw에서 tmux를 제어할 때의 표준 패턴.
단일 세션 제어부터 OpenCode/Gemini 멀티 세션 병렬 운영까지 다룬다.

## 소켓 규칙

- OpenClaw 기본 소켓: `/tmp/openclaw-tmux-sockets/openclaw.sock`
- 기본 clawdbot 경로를 가정하지 말고 OpenClaw 소켓을 우선 사용
- 폴백 규칙: `CLAWDBOT_TMUX_SOCKET_DIR`가 있으면 해당 디렉토리의 소켓 사용

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
if [ -n "${CLAWDBOT_TMUX_SOCKET_DIR:-}" ] && [ -S "$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock" ]; then
  SOCKET="$CLAWDBOT_TMUX_SOCKET_DIR/openclaw.sock"
fi
```

## Quickstart (OpenClaw 소켓)

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 세션 목록
tmux -S "$SOCKET" list-sessions

# opencode 세션이 살아있는지 확인
tmux -S "$SOCKET" has-session -t opencode && echo READY || echo MISSING

# 출력 확인
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

## 타겟 지정 규칙

- 타겟 형식: `session:window.pane`
- 예시: `opencode:0.0`, `gemini:0.0`, `opencode-2:1.0`
- 세션명만 주면 모호해질 수 있으므로 가능하면 pane까지 고정

```bash
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'pwd'
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter
```

## 안전한 입력 전송

원칙: `send-keys -l`로 문자열 전송 후 `Enter`를 별도 호출.

```bash
TARGET="opencode:0.0"
CMD='git status --short'

tmux -S "$SOCKET" send-keys -t "$TARGET" -l -- "$CMD"
sleep 0.1
tmux -S "$SOCKET" send-keys -t "$TARGET" Enter
```

## 출력 수집 표준

최근 출력은 아래 명령을 기본으로 사용:

```bash
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -200
```

- 긴 작업은 `-S -500` 이상으로 확장
- `-J`로 줄바꿈 연결해 파싱 안정성 확보

## 코딩 에이전트 오케스트레이션

여러 코딩 세션을 병렬 실행하고 완료를 폴링한다.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 병렬 지시
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork auth 버그 수정'
tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork 결제 모듈 테스트 보강'
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Enter

# 완료 폴링
for i in $(seq 1 20); do
  echo "[poll:$i] opencode"
  tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -30
  echo "[poll:$i] opencode-2"
  tmux -S "$SOCKET" capture-pane -p -J -t opencode-2:0.0 -S -30
  sleep 15
done
```

권장 운영 방식:
- 시작은 병렬, 결과 수집은 순차
- 폴링 간격은 10-30초
- 완료 신호(작업 요약/테스트 결과) 확인 후 다음 단계 진행

## 멀티 세션 오케스트레이션 패턴

### 세션 네이밍

- 기본: `opencode`, `gemini`
- 확장: `opencode-2`, `gemini-2`, `opencode-3`, `research`, `build`
- 규칙: 역할 또는 프로젝트 단위로 명명

### 병렬 시나리오

1) 두 프로젝트 동시 진행
- `opencode`: 프로젝트 A
- `opencode-2`: 프로젝트 B

2) 코딩 + 검증 동시 진행
- `opencode`: 구현/수정
- `gemini`, `gemini-2`: 결과물 시각 검증

3) 리서치 + 구현 + 빌드
- `research` 또는 `gemini`: 문서/레퍼런스 분석
- `opencode`: 구현
- `build`: 테스트/빌드 감시

### 에이전트 선택표 (OpenCode)

| 작업 성격 | 권장 에이전트 | 전환 |
|-----------|----------------|------|
| 빠른 수정/구현 | Sisyphus (기본) | 기본 상태 |
| 복잡한 자율 구현 | Hephaestus | Tab 1회 |
| 계획/전략 수립 | Prometheus | Tab 2회 |

## 운영 템플릿

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 세션 생성
tmux -S "$SOCKET" new -d -s opencode-2 -n main
tmux -S "$SOCKET" new -d -s gemini-2 -n main

# 작업 전송
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork 리팩토링 실행'
sleep 0.1
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Enter

# 결과 캡처
tmux -S "$SOCKET" capture-pane -p -J -t opencode-2:0.0 -S -200
```

## 정리(클린업)

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 단일 세션 종료
tmux -S "$SOCKET" kill-session -t opencode-2

# 기본 세션(opencode, gemini) 제외 전체 종료
for s in $(tmux -S "$SOCKET" list-sessions -F '#{session_name}' 2>/dev/null); do
  case "$s" in
    opencode|gemini) ;;
    *) tmux -S "$SOCKET" kill-session -t "$s" ;;
  esac
done
```

## 주의사항

- Enter를 명령 문자열에 섞지 말고 반드시 분리
- 경로/인용부호가 복잡한 명령은 스크립트 파일로 실행
- pane 캡처만으로 부족하면 로그 파일 리다이렉트 병행
- 세션 수를 늘릴수록 메모리 사용량이 급증하므로 동시성 제한 필요
