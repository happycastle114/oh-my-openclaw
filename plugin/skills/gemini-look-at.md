---
name: gemini-look-at
description: Gemini CLI 기반 멀티모달 분석 스킬. PDF, 이미지, 스크린샷, 다이어그램을 Gemini의 네이티브 멀티모달 능력으로 분석한다. tmux gemini 세션을 통해 실행.
---
# Gemini Look-At — Multimodal Analysis via Gemini CLI

OmO의 `look-at` 도구를 Gemini CLI + tmux로 재구현한 스킬.
OpenClaw의 `read` 도구는 이미지를 첨부로 보내줄 수 있지만, **PDF는 읽을 수 없고**, Gemini CLI는 PDF/이미지/비디오를 네이티브로 분석할 수 있다.

## 언제 사용하는가

- **PDF 분석** — 레이아웃, 디자인, 콘텐츠 품질 평가
- **이미지/스크린샷 분석** — UI 리뷰, 버그 확인, 디자인 피드백
- **다이어그램 해석** — 아키텍처, 플로우차트, ER 다이어그램 분석
- **멀티 파일 비교** — 두 PDF/이미지를 동시에 비교
- **OCR + 해석** — 스크린샷에서 텍스트 추출 + 의미 분석

## Gemini CLI 기본 사용법

```bash
# 빠른 시작
gemini "질문..."

# 모델 지정
gemini --model <name> "프롬프트..."

# JSON 형식 출력
gemini --output-format json "JSON 반환"

# 확장(extensions) 목록 확인
gemini --list-extensions
```

- 첫 실행 시 인터랙티브 로그인/인증이 필요하다.
- `--yolo` 플래그는 사용하지 않는다.

## 실행 방법

### 방법 1: tmux gemini 세션 (권장)

tmux `gemini` 세션이 이미 인증되어 있으므로 안정적.

```bash
SOCKET="/tmp/openclaw-tmux-sockets/openclaw.sock"
SESSION="gemini"

# 단일 파일 분석
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt '이 파일을 분석해줘. 레이아웃, 디자인, 콘텐츠 품질을 평가하고 개선점을 제안해.' -f /path/to/file.pdf -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# 결과 확인 (10-30초 대기 후)
sleep 15
tmux -S "$SOCKET" capture-pane -p -J -t "$SESSION":0.0 -S -200
```

### 방법 2: 결과를 파일로 저장

분석 결과가 길 때는 파일로 리다이렉트:

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt '상세 분석' -f /path/to/file.pdf -o text > /tmp/gemini-analysis.md 2>&1" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter

# 결과 파일 읽기
sleep 20
cat /tmp/gemini-analysis.md
```

### 방법 3: 여러 파일 동시 분석

```bash
tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 -l -- \
  "gemini -m gemini-2.5-flash --prompt '두 파일을 비교해줘' -f /path/to/before.png -f /path/to/after.png -o text" \
  && sleep 0.1 && tmux -S "$SOCKET" send-keys -t "$SESSION":0.0 Enter
```

## 분석 패턴별 프롬프트

### PDF 레이아웃/디자인 리뷰
```
이 PDF의 레이아웃, 줄넘김, 디자인을 평가해줘. 
부자연스러운 부분이 있으면 구체적으로 알려줘.
특히: 여백, 폰트 크기, 줄간격, 페이지 나눔, 표/이미지 배치를 체크해.
```

### 스크린샷 UI 리뷰
```
이 웹 UI 스크린샷을 분석해줘.
1. 레이아웃 정렬과 간격 일관성
2. 타이포그래피 계층 구조
3. 색상 대비 및 접근성
4. 인터랙티브 요소의 가시성
5. 전체적인 디자인 품질 (1-10 점수)
개선 제안을 구체적으로 해줘.
```

### 아키텍처 다이어그램 해석
```
이 아키텍처 다이어그램을 분석해줘.
- 각 컴포넌트의 역할을 식별
- 데이터 흐름 방향을 설명
- 잠재적 병목점이나 단일 장애점을 식별
- 개선 제안
```

### Before/After 비교
```
이 두 이미지를 비교해줘.
- 바뀐 부분을 구체적으로 나열
- 개선된 점과 퇴보한 점을 구분
- 추가 개선 제안
```

### 에러 스크린샷 디버깅
```
이 에러 스크린샷을 분석해줘.
- 에러 메시지를 정확히 읽어줘
- 가능한 원인을 추정
- 해결 방법을 제안
```

## 모델 선택 가이드

| 용도 | 추천 모델 | 이유 |
|------|-----------|------|
| 빠른 확인 | `gemini-2.5-flash` | 빠름, 충분한 멀티모달 능력 |
| 상세 분석 | `gemini-2.5-pro` | 더 깊은 분석, 긴 콘텐츠 |
| 최고 품질 | `gemini-3.1-pro` | 최신 모델, 최상의 멀티모달 |

## OpenClaw read vs Gemini CLI

| 기능 | OpenClaw `read` | Gemini CLI |
|------|----------------|------------|
| 이미지 (PNG/JPG) | ✅ 첨부로 전송 | ✅ 네이티브 분석 |
| PDF | ❌ 텍스트만 | ✅ 레이아웃 포함 분석 |
| 비디오 | ❌ | ✅ 프레임 분석 |
| 여러 파일 동시 | ❌ 하나씩 | ✅ `-f` 여러 개 |
| 인증 | 불필요 | tmux 세션 필요 |

## 워크플로우: OpenCode + Gemini CLI 연계

코딩 작업 중 시각적 확인이 필요할 때:

```
1. OpenCode (tmux opencode 세션)에서 코드 작성/수정
2. 빌드/렌더링 결과물 생성 (PDF, 스크린샷 등)
3. Gemini CLI (tmux gemini 세션)로 결과물 시각적 품질 검증
4. 문제 발견 시 → 다시 OpenCode로 돌아가서 수정
5. 반복 (결과물 만족할 때까지)
```

## 주의사항

- tmux `gemini` 세션이 반드시 실행 중이어야 함 (인증 상태 유지)
- `capture-pane`으로 결과 확인 시 출력이 잘리면 `-S -500` 등으로 줄 수 늘리기
- 파일 경로는 절대 경로 사용
- 응답 대기: PDF 크기에 따라 10-60초 소요 가능
- `--yolo` 플래그 사용 금지 (안전성)
