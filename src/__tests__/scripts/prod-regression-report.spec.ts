import { describe, expect, it } from 'vitest'

import {
  buildRunnerPreflightChecks,
  buildRunnerPreflightMarkdownSummary,
  buildRunnerPreflightSummary,
  renderSkippedChecks,
} from '../../../scripts/lib/prod-regression-report.js'

describe('prod regression report helpers', () => {
  it('groups skipped checks by classification', () => {
    const lines = renderSkippedChecks([
      {
        scope: 'main-account',
        name: 'discussion edit round-trip',
        reason: '当前 UI 未发现 discussion 编辑入口，按计划记录为 skipped',
        classification: 'capability-gap',
        severity: 'P2',
      },
      {
        scope: 'main-account',
        name: 'current device rename round-trip',
        reason: '主账号登录失败，依赖项跳过',
        classification: 'dependency',
        severity: 'P1',
      },
    ])

    expect(lines.join('\n')).toContain('### capability-gap')
    expect(lines.join('\n')).toContain('### dependency')
    expect(lines.join('\n')).toContain('discussion edit round-trip')
  })

  it('marks missing credentials and contract drift in preflight checks', () => {
    const checks = buildRunnerPreflightChecks({
      config: {
        baseUrl: 'https://momichan.com',
        artifactDir: 'G:/tmp/prod-regression',
        headless: true,
        primaryUsername: '',
        primaryPassword: '',
        secondaryEmailMode: 'invalid-mode',
      },
      artifactDirReady: true,
      artifactDirError: null,
      contractIssues: [{ code: 'contract-drift', message: 'favorites redirect mismatch' }],
      routeOverview: {
        guestRouteCount: 22,
        authRouteCount: 17,
        manualRunnerRouteCount: 15,
        profileRouteCount: 14,
        detailReadinessRouteCount: 2,
      },
    })

    expect(checks.find((check) => check.name === 'primary username')?.classification).toBe(
      'credential-missing'
    )
    expect(checks.find((check) => check.name === 'primary password')?.classification).toBe(
      'credential-missing'
    )
    expect(checks.find((check) => check.name === 'secondary email mode')?.classification).toBe(
      'dependency'
    )
    expect(checks.find((check) => check.name === 'shared route contract')?.classification).toBe(
      'contract-drift'
    )
  })

  it('renders preflight markdown with route coverage and failed checks', () => {
    const summary = buildRunnerPreflightSummary({
      config: {
        baseUrl: 'https://momichan.com',
        artifactDir: 'G:/tmp/prod-regression',
        headless: false,
      },
      checks: [
        {
          name: 'primary username',
          status: 'passed',
          classification: null,
          detail: 'PRIMARY_USERNAME present',
        },
        {
          name: 'shared route contract',
          status: 'failed',
          classification: 'contract-drift',
          detail: 'favorites redirect mismatch',
        },
      ],
      routeOverview: {
        guestRouteCount: 22,
        authRouteCount: 17,
        manualRunnerRouteCount: 15,
        profileRouteCount: 14,
        detailReadinessRouteCount: 2,
        manualRunnerRouteNames: ['profile accessible', 'profile comments accessible'],
        detailReadinessRouteNames: ['authenticated sample post', 'authenticated sample discussion'],
      },
    })

    const markdown = buildRunnerPreflightMarkdownSummary(summary)

    expect(summary.status).toBe('failed')
    expect(markdown).toContain('状态: failed')
    expect(markdown).toContain('shared route contract | failed | contract-drift')
    expect(markdown).toContain('profile accessible')
    expect(markdown).toContain('authenticated sample discussion')
  })
})
