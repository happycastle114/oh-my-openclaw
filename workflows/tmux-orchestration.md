---
description: tmux 기반 멀티 도구 오케스트레이션. OpenCode(코딩) + Gemini CLI(멀티모달) + 추가 세션을 동시에 운영하여 병렬 작업을 자동화한다.
---

# tmux 멀티 도구 오케스트레이션

OpenClaw가 **여러 tmux 세션을 동시에** 오케스트레이션하여 병렬 코딩 + 시각 검증 + 결과 수집을 자동화하는 워크플로우.

## 아키텍처

```
                                           ┌── opencode-1 (프로젝트 A)
                                           ├── opencode-2 (프로젝트 B)
┌─────────────┐     tmux send-keys        ├── opencode-3 (리팩토링)
│  OpenClaw   │ ─────────────────────┬──── ├── gemini-1   (PDF 분석)
│  (메인 AI)   │                      │     ├── gemini-2   (이미지 비교)
│             │     tmux capture     │     └── custom-1   (커스텀 작업)
│  조율/보고   │ ◀────────────────────┘
└─────────────┘
```

**핵심: 한 세션에서 작업 하나씩이 아니라, 여러 세션을 동시에 띄워서 병렬로 진행.**

## 세션 네이밍 규칙

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 기본 세션 (항상 존재)
opencode    # 메인 코딩 세션
gemini      # 메인 Gemini CLI 세션

# 추가 세션 (필요시 생성)
opencode-2  # 두 번째 코딩 세션 (다른 프로젝트/작업)
opencode-3  # 세 번째 코딩 세션
gemini-2    # 두 번째 Gemini 세션 (병렬 분석)
research    # 리서치 전용 세션
build       # 빌드/테스트 전용 세션
```

## 세션 관리 명령

### 새 세션 생성 (동시성 확보)

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# OpenCode 추가 세션 (다른 프로젝트)
tmux -S "$SOCKET" new -d -s opencode-2 -n main
tmux -S "$SOCKET" send-keys -t opencode-2 \
  'export NODE_OPTIONS="--max-old-space-size=8192" && cd /home/happycastle/Projects/<project-B> && opencode' Enter

# Gemini 추가 세션 (병렬 멀티모달 분석)
tmux -S "$SOCKET" new -d -s gemini-2 -n main

# 커스텀 세션 (빌드 모니터링 등)
tmux -S "$SOCKET" new -d -s build -n main
tmux -S "$SOCKET" send-keys -t build 'cd /home/happycastle/Projects/<project> && npm run dev' Enter
```

### 세션 목록 확인

```bash
tmux -S "$SOCKET" list-sessions
# 출력 예:
# gemini: 1 windows (created ...)
# gemini-2: 1 windows (created ...)
# opencode: 1 windows (created ...)
# opencode-2: 1 windows (created ...)
```

### 세션 종료

```bash
# 특정 세션 종료
tmux -S "$SOCKET" kill-session -t opencode-2

# 모든 추가 세션 정리 (기본 세션 유지)
for s in $(tmux -S "$SOCKET" list-sessions -F '#{session_name}' 2>/dev/null); do
  case "$s" in opencode|gemini) ;; *) tmux -S "$SOCKET" kill-session -t "$s" ;; esac
done
```

## 공통 명령

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# 세션 존재 확인
tmux -S "$SOCKET" has-session -t <session> 2>&1 && echo "OK" || echo "DEAD"

# 명령 보내기 (항상 -l + Enter 분리!)
tmux -S "$SOCKET" send-keys -t <session>:0.0 -l -- '<command>'
sleep 0.2
tmux -S "$SOCKET" send-keys -t <session>:0.0 Enter

# 출력 수집
tmux -S "$SOCKET" capture-pane -p -J -t <session>:0.0 -S -200
```

## 병렬 시나리오

### 시나리오 1: 두 프로젝트 동시 코딩

```bash
# 프로젝트 A: opencode 세션
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork Fix auth bugs'
sleep 0.2 && tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# 프로젝트 B: opencode-2 세션 (동시에!)
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 -l -- 'ultrawork Add payment module'
sleep 0.2 && tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Enter

# 두 세션 동시 모니터링
sleep 60
echo "=== Project A ===" && tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -20
echo "=== Project B ===" && tmux -S "$SOCKET" capture-pane -p -J -t opencode-2:0.0 -S -20
```

### 시나리오 2: 코딩 + 병렬 검증

코딩과 시각 검증을 **동시에** 여러 파일에 대해:

```
1. [opencode]    코드 작성/수정 → 빌드
2. [gemini-1]    첫 번째 결과물 검증 (PDF A)
3. [gemini-2]    두 번째 결과물 검증 (PDF B)    ← 동시!
4. [openclaw]    두 검증 결과 수집 → 종합 보고
```

```bash
# 병렬 Gemini 분석
tmux -S "$SOCKET" send-keys -t gemini:0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt 'PDF A 분석' -f /tmp/report-a.pdf -o text > /tmp/review-a.md 2>&1"
sleep 0.1 && tmux -S "$SOCKET" send-keys -t gemini:0.0 Enter

tmux -S "$SOCKET" send-keys -t gemini-2:0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt 'PDF B 분석' -f /tmp/report-b.pdf -o text > /tmp/review-b.md 2>&1"
sleep 0.1 && tmux -S "$SOCKET" send-keys -t gemini-2:0.0 Enter

# 두 결과 동시 대기 후 수집
sleep 20
cat /tmp/review-a.md
cat /tmp/review-b.md
```

### 시나리오 3: 리서치 + 구현 + 빌드 (3중 병렬)

```
[gemini]     → 문서 리서치 (PDF/웹 분석)
[opencode]   → 코드 구현
[build]      → 빌드/테스트 모니터링
```

### 시나리오 4: 코드 리뷰 + 스크린샷 검증

PR 리뷰 시 코드 변경 + UI 변경을 동시에 검증:

```
[opencode]   git diff → 코드 변경 사항 분석
[gemini]     before/after 이미지 비교 분석 (동시 시작!)
[openclaw]   코드 리뷰 + 시각 리뷰 결합 → 종합 피드백
```

## OpenCode 에이전트 선택

| 작업 유형 | 에이전트 | 전환 방법 |
|-----------|---------|----------|
| 빠른 구현/수정 | **Sisyphus** (기본) | 이미 활성 |
| 깊은 자율 작업 | **Hephaestus** | Tab 1번 |
| 전략적 계획 | **Prometheus** | Tab 2번 |

```bash
# 에이전트 전환 (특정 세션 지정)
tmux -S "$SOCKET" send-keys -t opencode-2:0.0 Tab
sleep 1
```

## Gemini 모델 선택

| 작업 | 모델 | 플래그 |
|------|------|--------|
| 빠른 확인 | gemini-2.5-flash | `-m gemini-2.5-flash` |
| 상세 분석 | gemini-2.5-pro | `-m gemini-2.5-pro` |
| 최고 품질 | gemini-3.1-pro | `-m gemini-3.1-pro` |

## 세션 생성 템플릿

### OpenCode 추가 세션

```bash
SESSION_NAME="opencode-2"
PROJECT_DIR="/home/happycastle/Projects/<project>"
tmux -S "$SOCKET" new -d -s "$SESSION_NAME" -n main
tmux -S "$SOCKET" send-keys -t "$SESSION_NAME" \
  "export NODE_OPTIONS=\"--max-old-space-size=8192\" && cd $PROJECT_DIR && opencode" Enter
```

### Gemini 추가 세션

```bash
SESSION_NAME="gemini-2"
tmux -S "$SOCKET" new -d -s "$SESSION_NAME" -n main
# Gemini CLI는 인증 상태를 공유하므로 바로 사용 가능
```

### 빌드/테스트 모니터링 세션

```bash
tmux -S "$SOCKET" new -d -s build -n main
tmux -S "$SOCKET" send-keys -t build \
  "cd /home/happycastle/Projects/<project> && npm run test:watch" Enter
```

## 에러 복구

### 특정 세션 복구

```bash
SESSION="opencode-2"
tmux -S "$SOCKET" kill-session -t "$SESSION" 2>/dev/null
tmux -S "$SOCKET" new -d -s "$SESSION" -n main
tmux -S "$SOCKET" send-keys -t "$SESSION" \
  'export NODE_OPTIONS="--max-old-space-size=8192" && cd /home/happycastle/Projects/<project> && opencode' Enter
```

### 전체 세션 상태 점검

```bash
# 모든 세션 상태 확인
tmux -S "$SOCKET" list-sessions 2>/dev/null || echo "tmux 서버 죽음 — 소켓 재생성 필요"

# 각 세션의 마지막 출력 빠르게 확인
for s in $(tmux -S "$SOCKET" list-sessions -F '#{session_name}' 2>/dev/null); do
  echo "=== $s ===" 
  tmux -S "$SOCKET" capture-pane -p -J -t "$s":0.0 -S -5
done
```

## 주의사항

- `send-keys -l` + `Enter` **반드시 분리** (한번에 보내면 명령이 깨질 수 있음)
- 긴 명령은 파일에 먼저 쓰고 `bash /tmp/script.sh`로 실행
- `capture-pane -S -200`이 부족하면 `-S -500`까지 늘리기
- 병렬 세션 수는 **메모리/CPU에 따라 제한** — OpenCode 세션당 ~2-4GB RAM 사용
- 세션 이름은 **프로젝트별** 또는 **작업별**로 구분 (예: `opencode-auth`, `opencode-payment`)
- 작업 完了 후 추가 세션은 정리해주기 (`kill-session`)
