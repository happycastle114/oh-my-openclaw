import { OmocPluginApi, TypedHookContext, BeforePromptBuildEvent, BeforePromptBuildResult } from '../types.js';
import { LOG_PREFIX } from '../constants.js';

const GUARDRAIL_RULES = `
<anti-hallucination-guardrails>
## Anti-Hallucination Rules (MANDATORY)

These rules are NON-NEGOTIABLE. Violating them is a critical failure.

### Rule 1: No Fake Tool Calls
- If you say "I read the file", "I checked the code", "I confirmed in the source", or similar — there MUST be a corresponding \`read\`, \`exec\`, \`grep\`, or equivalent tool call in THE SAME turn.
- If you did NOT make a tool call, you MUST say: "I haven't verified this directly — this is based on my prior knowledge/context."
- Phrases that REQUIRE a preceding tool call: "확인했다", "읽었다", "봤다", "코드에서", "소스를 보면", "파일을 열어보니", "checked", "verified", "confirmed", "read the file", "looked at the code"

### Rule 2: No Fabricated Results
- Never invent file contents, command outputs, or API responses.
- If you're unsure what a file contains, READ IT. Don't guess.
- If a tool call fails, report the failure — don't make up what the result "would have been."

### Rule 3: Distinguish Memory from Verification
- Information from previous sessions or context = "이전 세션 기억 기반으로는..." or "Based on prior context..."
- Information from THIS session's tool calls = state it directly
- NEVER present memory/context as if you just verified it with a tool call.

### Rule 4: Sub-agent Delegation Honesty
- If asked to delegate to a sub-agent, you MUST actually call \`sessions_spawn\` or \`omoc_delegate\`.
- Saying "서브에이전트 호출 완료" without a tool call = CRITICAL VIOLATION.
- If the spawn fails, report the failure honestly.
</anti-hallucination-guardrails>
`.trim();

export function registerGuardrailInjector(api: OmocPluginApi): void {
  api.on<BeforePromptBuildEvent, BeforePromptBuildResult>(
    'before_prompt_build',
    (_event: BeforePromptBuildEvent, _ctx: TypedHookContext): BeforePromptBuildResult | void => {
      api.logger.info(`${LOG_PREFIX} Guardrail rules injected via before_prompt_build`);

      return {
        prependContext: GUARDRAIL_RULES,
      };
    },
    { priority: 90 } // Between persona (100) and context-injector (50)
  );
}
