import { describe, expect, it, vi, beforeEach } from 'vitest';
import { detectKeywords, WORKFLOW_PERSONA_MAP } from '../hooks/keyword-detector/detector.js';
import { registerKeywordDetector } from '../hooks/keyword-detector/hook.js';
import { createMockApi } from './helpers/mock-factory.js';

describe('keyword-detector', () => {
  describe('detectKeywords', () => {
    it('detects ultrawork keywords', () => {
      const result = detectKeywords('ultrawork this feature');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ultrawork');
    });

    it('detects ulw shorthand', () => {
      const result = detectKeywords('ulw implement auth');
      expect(result.some((k) => k.type === 'ultrawork')).toBe(true);
    });

    it('detects search keywords in English', () => {
      const result = detectKeywords('search for auth patterns');
      expect(result.some((k) => k.type === 'search')).toBe(true);
    });

    it('detects search keywords in Korean', () => {
      const result = detectKeywords('인증 패턴 찾아줘');
      expect(result.some((k) => k.type === 'search')).toBe(true);
    });

    it('detects analyze keywords in English', () => {
      const result = detectKeywords('analyze the performance bottleneck');
      expect(result.some((k) => k.type === 'analyze')).toBe(true);
    });

    it('detects analyze keywords in Korean', () => {
      const result = detectKeywords('이 코드 분석해줘');
      expect(result.some((k) => k.type === 'analyze')).toBe(true);
    });

    it('detects coding keywords in English', () => {
      const result = detectKeywords('implement a new auth system');
      expect(result.some((k) => k.type === 'coding')).toBe(true);
    });

    it('detects coding keywords in Korean', () => {
      const result = detectKeywords('인증 시스템 구현해줘');
      expect(result.some((k) => k.type === 'coding')).toBe(true);
    });

    it('detects multiple keyword types simultaneously', () => {
      const result = detectKeywords('search and analyze the auth module then implement a fix');
      const types = result.map((k) => k.type);
      expect(types).toContain('search');
      expect(types).toContain('analyze');
      expect(types).toContain('coding');
    });

    it('returns empty for no keywords', () => {
      const result = detectKeywords('hello world');
      expect(result).toHaveLength(0);
    });

    it('ignores keywords inside code blocks', () => {
      const result = detectKeywords('here is code:\n```\nfunction search() {}\n```\nnothing else');
      expect(result.some((k) => k.type === 'search')).toBe(false);
    });

    it('ignores keywords inside inline code', () => {
      const result = detectKeywords('the `search` function is here');
      expect(result.some((k) => k.type === 'search')).toBe(false);
    });

    it('detects Japanese keywords', () => {
      const result = detectKeywords('このコードを分析してください');
      expect(result.some((k) => k.type === 'analyze')).toBe(true);
    });

    it('detects Chinese keywords', () => {
      const result = detectKeywords('搜索认证模式');
      expect(result.some((k) => k.type === 'search')).toBe(true);
    });

    it('detects Vietnamese keywords', () => {
      const result = detectKeywords('tìm kiếm mẫu xác thực');
      expect(result.some((k) => k.type === 'search')).toBe(true);
    });

    it('detects /plan command', () => {
      const result = detectKeywords('/plan create a migration strategy');
      expect(result.some((k) => k.type === 'plan')).toBe(true);
    });

    it('detects /start_work command', () => {
      const result = detectKeywords('/start_work plan-v2.md');
      expect(result.some((k) => k.type === 'start_work')).toBe(true);
    });

    it('detects start_work without slash', () => {
      const result = detectKeywords('start_work on the approved plan');
      expect(result.some((k) => k.type === 'start_work')).toBe(true);
    });
  });

  describe('WORKFLOW_PERSONA_MAP', () => {
    it('maps ultrawork to omoc_atlas', () => {
      expect(WORKFLOW_PERSONA_MAP.ultrawork).toBe('omoc_atlas');
    });

    it('maps plan to omoc_prometheus', () => {
      expect(WORKFLOW_PERSONA_MAP.plan).toBe('omoc_prometheus');
    });

    it('maps start_work to omoc_atlas', () => {
      expect(WORKFLOW_PERSONA_MAP.start_work).toBe('omoc_atlas');
    });
  });

  describe('registerKeywordDetector hook', () => {
    let mockApi: ReturnType<typeof createMockApi>;
    let hookHandler: (event: { prompt?: string }, ctx: Record<string, unknown>) => unknown;

    beforeEach(() => {
      mockApi = createMockApi();
      registerKeywordDetector(mockApi as any);

      // given - hook registered on before_prompt_build
      const onCall = mockApi.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'before_prompt_build',
      );
      expect(onCall).toBeDefined();
      hookHandler = onCall![1] as typeof hookHandler;
    });

    it('returns prependContext when keywords detected', () => {
      // when - prompt contains search keyword
      const result = hookHandler({ prompt: 'search for auth patterns' }, {});

      // then - prependContext includes search-mode message
      expect(result).toBeDefined();
      expect((result as any).prependContext).toContain('[search-mode]');
    });

    it('returns void when no keywords detected', () => {
      // when - prompt has no keywords
      const result = hookHandler({ prompt: 'hello world' }, {});

      // then - no context prepended
      expect(result).toBeUndefined();
    });

    it('returns void when prompt is empty', () => {
      const result = hookHandler({ prompt: '' }, {});
      expect(result).toBeUndefined();
    });

    it('returns void when prompt is missing', () => {
      const result = hookHandler({}, {});
      expect(result).toBeUndefined();
    });

    it('merges multiple detected keyword messages', () => {
      // when - prompt triggers both search and analyze
      const result = hookHandler(
        { prompt: 'search and analyze this module' },
        {},
      );

      // then - both mode messages included
      const context = (result as any).prependContext;
      expect(context).toContain('[search-mode]');
      expect(context).toContain('[analyze-mode]');
    });

    it('includes coding-mode when coding keywords present', () => {
      const result = hookHandler({ prompt: '이 기능 구현해줘' }, {});
      expect((result as any).prependContext).toContain('[coding-mode]');
    });

    it('returns plan-mode context when /plan detected', () => {
      const result = hookHandler({ prompt: '/plan design the auth system' }, {});
      expect((result as any).prependContext).toContain('[plan-mode]');
    });

    it('returns start-work-mode context when /start_work detected', () => {
      const result = hookHandler({ prompt: '/start_work plan-v2.md' }, {});
      expect((result as any).prependContext).toContain('[start-work-mode]');
    });

    it('registers with priority 75', () => {
      const onCall = mockApi.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'before_prompt_build',
      );
      expect(onCall![2]).toEqual({ priority: 75 });
    });
  });
});
