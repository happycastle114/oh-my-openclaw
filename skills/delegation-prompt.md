---
name: delegation-prompt
description: Delegation prompt writing guide with 7 required elements for high-precision subagent execution.
---

# Delegation Prompt - 7 Elements Guide

위임 품질은 프롬프트 품질에 의해 결정된다. 아래 7요소를 항상 포함한다.

## 7 Required Elements

1. **TASK**
   - 단일 원자 작업을 명확히 지시
2. **EXPECTED OUTCOME**
   - 산출물과 성공 기준을 구체화
3. **REQUIRED SKILLS**
   - 필요한 스킬 목록 명시
4. **REQUIRED TOOLS**
   - 사용 가능한 도구 화이트리스트
5. **MUST DO**
   - 반드시 수행할 세부 요구사항
6. **MUST NOT DO**
   - 금지사항(범위 확장, 파일 수정 금지 등)
7. **CONTEXT**
   - 경로, 제약, 기존 패턴, 다운스트림 목적

## Canonical Template

```markdown
1) TASK: <one atomic goal>
2) EXPECTED OUTCOME: <deliverables + acceptance criteria>
3) REQUIRED SKILLS: <skill1, skill2>
4) REQUIRED TOOLS: <tool whitelist>
5) MUST DO: <exhaustive requirements>
6) MUST NOT DO: <explicit prohibitions>
7) CONTEXT: <paths, constraints, style references, downstream use>
```

## Quality Checklist

- 결과 검증 기준이 측정 가능하다
- 입력 경로/범위가 명시되어 있다
- 금지사항이 모호하지 않다
- 실패 시 재시도/보고 방식이 정의되어 있다

## Anti-Patterns

- "적당히", "알아서" 같은 모호한 지시
- 도구 무제한 허용
- 컨텍스트 없는 대규모 요청
- 기대 산출물이 없는 위임
