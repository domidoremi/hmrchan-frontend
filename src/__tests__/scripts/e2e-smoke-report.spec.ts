import { describe, expect, it } from 'vitest'

import {
  buildSmokeMarkdownSummary,
  createSmokeSummary,
  getAuthSkipReason,
  resolveAuthSmokeCredentials,
} from '../../../scripts/lib/e2e-smoke-report.js'

describe('e2e smoke report helpers', () => {
  it('reports explicit auth skip reasons', () => {
    expect(getAuthSkipReason('', '')).toBe(
      'PRIMARY_USERNAME/PRIMARY_PASSWORD are not set (legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD also supported)'
    )
    expect(getAuthSkipReason('demo@example.com', '', 'primary')).toBe('PRIMARY_PASSWORD is not set')
    expect(getAuthSkipReason('', 'secret', 'primary')).toBe('PRIMARY_USERNAME is not set')
    expect(getAuthSkipReason('demo@example.com', '', 'legacy')).toBe('E2E_AUTH_PASSWORD is not set')
    expect(getAuthSkipReason('', 'secret', 'legacy')).toBe('E2E_AUTH_LOGIN is not set')
    expect(getAuthSkipReason('demo@example.com', 'secret', 'primary')).toBeNull()
  })

  it('prefers primary auth credentials and keeps legacy aliases as fallback', () => {
    expect(
      resolveAuthSmokeCredentials({
        PRIMARY_USERNAME: 'primary@example.com',
        PRIMARY_PASSWORD: 'primary-secret',
        E2E_AUTH_LOGIN: 'legacy@example.com',
        E2E_AUTH_PASSWORD: 'legacy-secret',
      })
    ).toEqual({
      login: 'primary@example.com',
      password: 'primary-secret',
      source: 'primary',
    })

    expect(
      resolveAuthSmokeCredentials({
        E2E_AUTH_LOGIN: 'legacy@example.com',
        E2E_AUTH_PASSWORD: 'legacy-secret',
      })
    ).toEqual({
      login: 'legacy@example.com',
      password: 'legacy-secret',
      source: 'legacy',
    })
  })

  it('renders guest and auth summary rows with readiness selectors and failure evidence', () => {
    const summary = createSmokeSummary('.e2e-smoke', 'demo@example.com', 'secret')
    summary.baseUrl = 'https://momichan.xyz'
    summary.authSmokeRequired = true
    summary.authSmokeExecuted = true
    summary.lastFailedCheck = 'profile comments'
    summary.lastFailureEvidence = {
      checkName: 'profile comments',
      route: '/profile/comments',
      url: 'https://momichan.xyz/profile/comments',
      pathname: '/profile/comments',
      title: 'Comments · MomiChan',
      screenshotPath: '.e2e-smoke/failure-last.png',
      htmlSnapshotPath: '.e2e-smoke/failure-last.html',
    }
    summary.checks.push(
      {
        name: 'home route',
        kind: 'browser',
        mode: 'guest',
        status: 'passed',
        path: '/',
        selector: '.home-page',
      },
      {
        name: 'profile comments',
        kind: 'auth',
        mode: 'auth',
        status: 'failed',
        path: '/profile/comments',
        selector: '[data-testid="profile-section-shell"][data-profile-section="comments"]',
        readinessSelectorsAll: ['[data-testid="profile-comments-tab"]'],
        readinessSelectorsAny: ['.timeline', '.state-indicator'],
        detail: 'selector timeout',
      }
    )

    const markdown = buildSmokeMarkdownSummary(summary)

    expect(markdown).toContain('Auth smoke: 0/1 passed, 1 failed')
    expect(markdown).toContain('Auth smoke required: yes')
    expect(markdown).toContain('### Auth Account Contract')
    expect(markdown).toContain('all: [data-testid="profile-comments-tab"]')
    expect(markdown).toContain('any: .timeline<br>.state-indicator')
    expect(markdown).toContain('Last failed check: profile comments')
    expect(markdown).toContain('.e2e-smoke/failure-last.png')
  })

  it('renders skipped auth smoke cleanly when credentials are unavailable', () => {
    const summary = createSmokeSummary('.e2e-smoke', '', '')
    summary.baseUrl = 'http://localhost:4173'
    summary.authSmokeRequired = true
    summary.authSmokeSkipReason =
      'PRIMARY_USERNAME/PRIMARY_PASSWORD are not set (legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD also supported)'
    summary.checks.push({
      name: 'auth login bootstrap',
      kind: 'auth',
      mode: 'auth',
      status: 'skipped',
      path: '/api/v1/auth/login',
      detail: summary.authSmokeSkipReason,
    })

    const markdown = buildSmokeMarkdownSummary(summary)

    expect(markdown).toContain(
      'Auth smoke: skipped (PRIMARY_USERNAME/PRIMARY_PASSWORD are not set (legacy aliases E2E_AUTH_LOGIN/E2E_AUTH_PASSWORD also supported))'
    )
    expect(markdown).toContain('Auth smoke required: yes')
    expect(markdown).toContain('Auth skipped routes: 1')
  })
})
