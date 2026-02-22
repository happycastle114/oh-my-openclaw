---
description: tmux 기반 멀티 도구 오케스트레이션. OpenCode(코딩) + Gemini CLI(멀티모달) + tmux(제어)를 연결하여 end-to-end 작업을 자동화한다.
---

# tmux 멀티 도구 오케스트레이션

OpenClaw가 **tmux 세션 3종**을 오케스트레이션하여 코딩 + 시각 검증 + 결과 수집을 자동화하는 워크플로우.

## 아키텍처

```
┌─────────────┐     tmux send-keys      ┌──────────────────┐
│  OpenClaw   │ ──────────────────────── │ opencode 세션     │
│  (메인 AI)   │                          │ OmO (코딩/리서치)  │
│             │     tmux send-keys      ├──────────────────┤
│  조율/보고   │ ──────────────────────── │ gemini 세션       │
│             │                          │ Gemini CLI (멀티모달)│
│             │     tmux capture-pane   ├──────────────────┤
│             │ ◀──────────────────────  │ 결과 수집          │
└─────────────┘                          └──────────────────┘
```

## 세션 정보

| 세션 | 역할 | 소켓 |
|------|------|------|
| `opencode` | OmO 코딩 에이전트 (Sisyphus/Hephaestus/Prometheus) | `/tmp/openclaw-tmux-sockets/openclaw.sock` |
| `gemini` | Gemini CLI 멀티모달 분석 (PDF/이미지/비디오) | `/tmp/openclaw-tmux-sockets/openclaw.sock` |

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

## 시나리오별 워크플로우

### 시나리오 1: 코딩 → 시각적 검증 루프

웹/PDF 결과물을 코딩하고 시각적으로 검증하는 반복 루프.

```
1. [opencode] 코드 작성/수정 → 빌드 → 결과물 생성
2. [gemini]   결과물 시각적 품질 검증 (PDF 레이아웃, UI 스크린샷)
3. [openclaw] Gemini 피드백 수집 → 문제 있으면 다시 1번
4. [openclaw] 만족스러우면 사용자에게 보고
```

**구체적 플로우:**
```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"

# Step 1: OpenCode에 PDF 생성 지시
tmux -S "$SOCKET" send-keys -t opencode:0.0 -l -- 'ultrawork python3 scripts/generate_report.py --output /tmp/report.pdf'
sleep 0.2 && tmux -S "$SOCKET" send-keys -t opencode:0.0 Enter

# Step 2: 빌드 완료 대기 (capture-pane으로 확인)
sleep 30
tmux -S "$SOCKET" capture-pane -p -J -t opencode:0.0 -S -20

# Step 3: Gemini로 PDF 검증
tmux -S "$SOCKET" send-keys -t gemini:0.0 -l -- "gemini -m gemini-2.5-flash --prompt 'PDF 레이아웃/디자인 품질 평가. 문제점 나열.' -f /tmp/report.pdf -o text > /tmp/gemini-review.md 2>&1"
sleep 0.2 && tmux -S "$SOCKET" send-keys -t gemini:0.0 Enter

# Step 4: 결과 수집
sleep 20
cat /tmp/gemini-review.md
```

### 시나리오 2: 리서치 → 구현

넓은 리서치 후 구현하는 패턴.

```
1. [gemini]   문서/웹페이지/PDF 분석 → 리서치 결과 저장
2. [opencode] 리서��� 기반으로 구현
3. [openclaw] 결과 종합 → 사용자 보고
```

### 시나리오 3: 코드 리뷰 + 스크린샷 검증

PR 리뷰 시 코드 변경 + UI 변경을 동시에 검증.

```
1. [opencode] git diff → 코드 변경 사항 분석
2. [opencode] 빌드 → 스크린샷 캡처
3. [gemini]   before/after 이미지 비교 분석
4. [openclaw] 코드 리뷰 + 시각 리뷰 결합 → 종합 피드백
```

## OpenCode 에이전트 선택

| 작업 유형 | 에이전트 | 전환 방법 |
|-----------|---------|----------|
| 빠른 구현/수정 | **Sisyphus** (기본) | 이미 활성 |
| 깊은 자율 작업 | **Hephaestus** | Tab 1번 |
| 전략적 계획 | **Prometheus** | Tab 2번 |

```bash
# 에이전트 전환
tmux -S "$SOCKET" send-keys -t opencode:0.0 Tab
sleep 1
```

## Gemini 모델 선택

| 작업 | 모델 | 플래그 |
|------|------|--------|
| 빠른 확인 | gemini-2.5-flash | `-m gemini-2.5-flash` |
| 상세 분석 | gemini-2.5-pro | `-m gemini-2.5-pro` |
| 최고 품질 | gemini-3.1-pro | `-m gemini-3.1-pro` |

## 에러 복구

### OpenCode 세션 복구
```bash
tmux -S "$SOCKET" kill-session -t opencode 2>/dev/null
tmux -S "$SOCKET" new -d -s opencode -n main
tmux -S "$SOCKET" send-keys -t opencode 'export NODE_OPTIONS="--max-old-space-size=8192" && cd /home/happycastle/Projects/<project> && opencode' Enter
```

### Gemini 세션 복구
```bash
tmux -S "$SOCKET" kill-session -t gemini 2>/dev/null
tmux -S "$SOCKET" new -d -s gemini -n main
# Gemini CLI는 첫 실행 시 인증 필요할 수 있음
tmux -S "$SOCKET" send-keys -t gemini 'gemini --version' Enter
```

## 주의사항

- `send-keys -l` + `Enter` **반드시 분리** (한번에 보내면 명령이 깨질 수 있음)
- 긴 명령은 파일에 먼저 쓰고 `bash /tmp/script.sh`로 실행
- `capture-pane -S -200`이 부족하면 `-S -500`까지 늘리기
- 동시에 두 세션에 명령 보낼 때는 각각 완료 확인 후 다음 단계
