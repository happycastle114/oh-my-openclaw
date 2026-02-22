# Oh-My-OpenClaw (OmOC)

OpenClaw용 멀티 에이전트 오케스트레이션 프레임워크. Oh-My-OpenCode(OmO)의 검증된 패턴을 OpenClaw 네이티브 구조로 이식한다.

## 프로젝트 개요

- 계획(Planning) → 조율(Orchestration) → 실행(Execution) 흐름 표준화
- 에이전트/스킬/워크플로우 문서 기반 운영
- 복잡 작업에서 재현 가능한 실행·검증 루틴 제공

## 설치 방법

```bash
# 1) 저장소 클론
git clone <this-repo-url>
cd oh-my-openclaw

# 2) 워크스페이스 초기화
./scripts/init-deep.sh

# 3) OpenClaw에서 참조되도록 연결
ln -s "$(pwd)" /path/to/your/project/.opencode/skills/oh-my-openclaw
```

## 주요 에이전트

- `prometheus` - 전략 계획 수립
- `metis` - 사전 분석(의도 분류/범위 정제)
- `momus` - 계획 실행 가능성 리뷰(블로커 중심)
- `atlas` - 작업 조율/분배
- `sisyphus-junior` - 일반 구현 워커
- `hephaestus` - 복잡 구현 전담 딥 워커
- `oracle` - 고난도 아키텍처/디버깅 자문
- `librarian` - 외부 문서·레퍼런스 조사
- `explore` - 코드베이스 탐색
- `multimodal-looker` - 멀티모달 파일 해석

## 스킬 목록

- `git-master` - Git 중심 작업 가이드
- `frontend-ui-ux` - 프론트엔드/UI 실행 가이드
- `comment-checker` - 코멘트·문서 품질 점검
- `steering-words` - 다국어 키워드 감지 및 모드 추천
- `multimodal-analysis` - PDF/이미지/다이어그램 분석 패턴
- `delegation-prompt` - 위임 프롬프트 7요소 작성 가이드

## 워크플로우 목록

- `ultrawork` - 계획+실행+검증 통합 실행
- `plan` - 계획 전용 모드
- `start-work` - 기존 계획 실행
- `delegate-to-omo` - OmO tmux 위임 흐름
- `tool-patterns` - OmO src/tools → OpenClaw 패턴 매핑
- `auto-rescue` - 체크포인트/실패 감지/자동 복구

## 자주 쓰는 명령

- `/ultrawork` - 전체 자동화 실행
- `/plan` - 계획만 생성
- `/start-work` - 계획 기반 실행 시작

## 라이선스

Private - happycastle
