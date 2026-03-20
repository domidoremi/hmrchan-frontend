import { describe, expect, it } from 'vitest'

import {
  createAggregateAnalysis,
  mergeRunSummaries,
} from '../../../scripts/lib/lighthouse-prod-aggregate.mjs'

describe('mergeRunSummaries', () => {
  it('computes medians, preserves run details, and marks unstable pages', () => {
    const manifest = {
      entries: [
        {
          url: 'https://momichan.xyz/post/post-1',
          pageType: 'post-detail',
          discoverySource: 'api-posts',
          indexedInSitemap: false,
          robotsDisallowed: false,
          selectionReason: 'post sample',
        },
        {
          url: 'https://momichan.xyz/login',
          pageType: 'anonymous-auth',
          discoverySource: 'route-whitelist',
          indexedInSitemap: false,
          robotsDisallowed: true,
          selectionReason: 'login sample',
        },
      ],
      coverage: {
        includedByPageType: {
          'post-detail': 1,
          'anonymous-auth': 1,
        },
        indexedCount: 0,
        robotsDisallowedCount: 1,
        gaps: [],
      },
      excluded: [],
    }

    const runSummaries = [
      {
        runId: 'run-1',
        base: 'https://momichan.xyz',
        profiles: ['mobile', 'desktop'],
        results: [
          {
            url: 'https://momichan.xyz/post/post-1',
            profile: 'mobile',
            performance: 80,
            accessibility: 95,
            bestPractices: 81,
            seo: 100,
            fcpMs: 1200,
            lcpMs: 2500,
            cls: 0.01,
            tbtMs: 90,
            speedIndexMs: 2100,
            requestCount: 60,
            transferSizeBytes: 200000,
            warnings: [],
            runtimeError: null,
            opportunities: [{ id: 'unused-javascript', title: 'Reduce unused JavaScript' }],
          },
          {
            url: 'https://momichan.xyz/login',
            profile: 'desktop',
            performance: 98,
            accessibility: 96,
            bestPractices: 81,
            seo: 100,
            fcpMs: 900,
            lcpMs: 1300,
            cls: 0,
            tbtMs: 20,
            speedIndexMs: 1200,
            requestCount: 20,
            transferSizeBytes: 80000,
            warnings: ['Turnstile challenge required'],
            runtimeError: null,
            opportunities: [],
          },
        ],
      },
      {
        runId: 'run-2',
        base: 'https://momichan.xyz',
        profiles: ['mobile', 'desktop'],
        results: [
          {
            url: 'https://momichan.xyz/post/post-1',
            profile: 'mobile',
            performance: 62,
            accessibility: 95,
            bestPractices: 81,
            seo: 100,
            fcpMs: 1500,
            lcpMs: 3900,
            cls: 0.02,
            tbtMs: 140,
            speedIndexMs: 2600,
            requestCount: 66,
            transferSizeBytes: 215000,
            warnings: [],
            runtimeError: null,
            opportunities: [{ id: 'unused-javascript', title: 'Reduce unused JavaScript' }],
          },
          {
            url: 'https://momichan.xyz/login',
            profile: 'desktop',
            error: 'Challenge required',
            warnings: ['Verification failed'],
          },
        ],
      },
      {
        runId: 'run-3',
        base: 'https://momichan.xyz',
        profiles: ['mobile', 'desktop'],
        results: [
          {
            url: 'https://momichan.xyz/post/post-1',
            profile: 'mobile',
            performance: 95,
            accessibility: 94,
            bestPractices: 81,
            seo: 100,
            fcpMs: 1100,
            lcpMs: 2300,
            cls: 0.015,
            tbtMs: 60,
            speedIndexMs: 2050,
            requestCount: 58,
            transferSizeBytes: 198000,
            warnings: [],
            runtimeError: null,
            opportunities: [{ id: 'unused-css-rules', title: 'Reduce unused CSS' }],
          },
          {
            url: 'https://momichan.xyz/login',
            profile: 'desktop',
            performance: 97,
            accessibility: 96,
            bestPractices: 81,
            seo: 100,
            fcpMs: 950,
            lcpMs: 1400,
            cls: 0,
            tbtMs: 18,
            speedIndexMs: 1250,
            requestCount: 19,
            transferSizeBytes: 79000,
            warnings: ['verification prompt'],
            runtimeError: null,
            opportunities: [],
          },
        ],
      },
    ]

    const merged = mergeRunSummaries({ runSummaries, manifest })
    const postEntry = merged.results.find(
      (entry) => entry.url === 'https://momichan.xyz/post/post-1' && entry.profile === 'mobile'
    )
    const loginEntry = merged.results.find(
      (entry) => entry.url === 'https://momichan.xyz/login' && entry.profile === 'desktop'
    )

    expect(postEntry).toMatchObject({
      pageType: 'post-detail',
      performance: 80,
      lcpMs: 2500,
      unstable: true,
      unstableReasons: expect.arrayContaining(['performance-spread>15', 'lcp-spread>1000ms']),
    })
    expect(postEntry?.runs).toHaveLength(3)
    expect(postEntry?.opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Reduce unused JavaScript', count: 2 }),
        expect.objectContaining({ title: 'Reduce unused CSS', count: 1 }),
      ])
    )

    expect(loginEntry).toMatchObject({
      pageType: 'anonymous-auth',
      robotsDisallowed: true,
      unstable: true,
      challengeLikely: true,
      unstableReasons: expect.arrayContaining(['failed-run', 'challenge-signal']),
      performance: 98,
    })
    expect(loginEntry?.error).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ runLabel: 'run-2', error: 'Challenge required' }),
      ])
    )
  })

  it('renders the aggregate analysis with the expected sections', () => {
    const summary = {
      generatedAt: '2026-03-20T00:00:00.000Z',
      base: 'https://momichan.xyz',
      runs: ['run-1', 'run-2', 'run-3'],
      coverage: {
        includedByPageType: { home: 1, 'anonymous-auth': 1 },
        indexedCount: 1,
        robotsDisallowedCount: 1,
        gaps: [],
      },
      excluded: [{ url: 'https://momichan.xyz/favorites' }],
      results: [
        {
          url: 'https://momichan.xyz/',
          profile: 'mobile',
          pageType: 'home',
          performance: 82,
          accessibility: 95,
          bestPractices: 81,
          seo: 100,
          fcpMs: 1500,
          lcpMs: 2500,
          cls: 0.02,
          tbtMs: 90,
          requestCount: 70,
          transferSizeBytes: 300000,
          opportunities: [{ title: 'Reduce unused JavaScript' }],
          warnings: [],
          runs: [],
          error: null,
          unstable: false,
          challengeLikely: false,
        },
        {
          url: 'https://momichan.xyz/login',
          profile: 'desktop',
          pageType: 'anonymous-auth',
          performance: 97,
          accessibility: 96,
          bestPractices: 81,
          seo: 100,
          fcpMs: 900,
          lcpMs: 1300,
          cls: 0,
          tbtMs: 20,
          requestCount: 18,
          transferSizeBytes: 70000,
          opportunities: [],
          warnings: ['Turnstile challenge required'],
          runs: [],
          error: null,
          unstable: true,
          unstableReasons: ['challenge-signal'],
          challengeLikely: true,
        },
      ],
    }

    const analysis = createAggregateAnalysis(summary)

    expect(analysis).toContain('## 1. 覆盖范围与排除项')
    expect(analysis).toContain('## 2. 最差页面 Top N')
    expect(analysis).toContain('## 5. 认证页 / 第三方挑战干扰')
    expect(analysis).toContain('## 6. P0 / P1 / P2 整改建议')
    expect(analysis).toContain('/favorites')
  })
})
