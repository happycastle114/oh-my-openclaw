---
name: tmux-agents
description: tmux 세션에서 코딩 에이전트(Claude Code, Codex, Gemini, Ollama)를 스폰하고 모니터링한다.
---

# tmux-agents — 에이전트 스폰/모니터링 가이드

tmux 안에서 코딩 에이전트를 띄우고, 상태를 확인하고, 병렬로 운영하는 실행 패턴 모음.

## 에이전트 종류

| 구분 | 에이전트 ID | 실행 위치 | 특성 |
|------|-------------|----------|------|
| cloud | `claude` | 원격 API | 고품질 추론, 안정적 |
| cloud | `codex` | 원격 API | 코드 생성/수정 강점 |
| cloud | `gemini` | 원격 API | 멀티모달/긴 문맥 강점 |
| local | `ollama-claude` | 로컬 Ollama | 비용 절감, 오프라인 가능 |
| local | `ollama-codex` | 로컬 Ollama | 로컬 코드 작업 최적화 |

## 빠른 명령 모음

아래 명령은 tmux-agents 헬퍼 스크립트 인터페이스를 기준으로 한다.

```bash
# 1) 스폰
./spawn.sh --agent codex --session opencode-2 --cwd /path/to/project

# 2) 목록
./status.sh list

# 3) 헬스체크
./check.sh --session opencode-2

# 4) 붙기
tmux attach -t opencode-2

# 5) 지시 전송 (안전 입력)
tmux send-keys -t opencode-2:0.0 -l -- 'Fix failing tests in auth module'
tmux send-keys -t opencode-2:0.0 Enter

# 6) 종료
tmux kill-session -t opencode-2
```

## 병렬 에이전트 패턴

```bash
# 병렬 스폰 예시
./spawn.sh --agent codex --session opencode --cwd /repo/a
./spawn.sh --agent claude --session opencode-2 --cwd /repo/b
./spawn.sh --agent gemini --session gemini --cwd /repo/a

# 병렬 진행 후 상태 점검
./status.sh list
./check.sh --session opencode
./check.sh --session opencode-2
./check.sh --session gemini
```

운영 원칙:
- 구현 세션과 검증 세션을 분리
- 긴 작업은 10-30초 간격으로 주기 점검
- 완료 후 세션별 결과를 순차 수집

## Local vs Cloud 선택 기준

| 상황 | 권장 | 이유 |
|------|------|------|
| 속도보다 품질이 중요 | cloud | 최신 모델 품질/추론 강점 |
| 장시간 반복 작업 | local | 비용 절감, 호출 제한 없음 |
| 외부 네트워크 제약 | local | 오프라인/폐쇄망 대응 |
| 멀티모달 분석 필요 | cloud(gemini) | 이미지/PDF 처리 품질 |
| 민감 코드 로컬 처리 | local | 데이터 외부 전송 최소화 |

## Ollama 준비

```bash
# Ollama 실행 확인
ollama list

# 필요한 모델 다운로드(예시)
ollama pull qwen2.5-coder:14b
ollama pull llama3.1:8b

# 로컬 응답 확인
curl http://127.0.0.1:11434/api/tags
```

권장:
- 코딩용 모델 + 범용 대화 모델 1개씩 준비
- RAM/VRAM 한계를 고려해 동시 실행 수 제한

## 팁

- 세션 타겟은 항상 `session:window.pane`으로 고정 (`opencode-2:0.0`)
- 텍스트 입력은 `send-keys -l` 후 Enter 분리
- 출력 확인은 `capture-pane -p -J -S -200` 기본 사용
- 실패 세션은 즉시 재생성하고 동일 프롬프트 재투입

## 헬퍼 스크립트 범위

`spawn.sh`, `status.sh`, `check.sh`는 공식 `openclaw/skills/tmux-agents` 패키지에서 제공되는 헬퍼 스크립트 인터페이스를 따른다.
이 문서는 스크립트 사용법 자체가 아니라, OpenClaw/OmO 운영 관점의 실행 지식을 제공한다.
