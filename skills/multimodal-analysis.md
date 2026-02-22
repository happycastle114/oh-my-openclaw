---
name: multimodal-analysis
description: Multimodal file analysis skill for PDFs, images, and technical diagrams using look-at style patterns.
---

# Multimodal Analysis - File Analysis Skill

OmO `look-at` 도구 패턴을 기반으로, 문서/이미지/다이어그램 분석을 표준화한다.

## Source Pattern (OmO)

- `look-at`는 파일 경로 + 분석 목표(goal)를 받아 멀티모달 해석 수행
- 핵심 입력은 단순하다: **무엇을 볼지** + **무엇을 추출할지**

## Supported Inputs

- PDF 문서
- 일반 이미지(PNG/JPG/WebP)
- 기술 다이어그램(architecture/flow/UML/ER)

## Analysis Patterns

### 1) PDF Analysis

- 목표 예시: 요약, 정책/요건 추출, 변경점 비교
- 출력: 핵심 항목 bullet + 필요한 경우 구조화 목록

### 2) Image Analysis

- 목표 예시: 화면 구성요소 식별, 텍스트/라벨 추출, 상태 비교
- 출력: 영역별 관찰 + actionable insight

### 3) Diagram Analysis

- 목표 예시: 컴포넌트 관계, 데이터 흐름, 병목/리스크 파악
- 출력: 노드/엣지 해석 + 개선 포인트

## Prompt Template

```text
Input: <file_path>
Goal: <what to extract / explain>
Constraints: <format, scope, language>
Output: <summary|table|checklist>
```

## Recommended Workflow

1. 목표를 1문장으로 명확화
2. 파일 유형에 맞는 패턴 선택
3. 분석 결과를 실행 가능한 액션으로 변환
4. 불확실성은 "추정"으로 명시

## Guardrails

- 파일 내용이 불명확하면 단정하지 않는다
- OCR/시각 해석 결과는 근거와 함께 제시
- 원문 인용이 필요하면 짧게, 과도한 복붙 금지
