import { describe, expect, it } from 'vitest'

import {
  buildSecurityRefreshTasks,
  buildSecurityPanelCards,
  formatSecurityCount,
  getSecurityPanelHash,
  hasSecurityRiskSignals,
  resolveActiveSecurityPanelCard,
  resolveLastLoginLabel,
  resolveSecurityLoadErrorMessage,
  resolveSecurityPanelFromHash,
  SECURITY_PANEL_DEFINITIONS,
  shouldReplaceSecurityPanelHash,
} from '../profileSecurityPageModel'

const copy = {
  credentialsKicker: 'Credentials kicker',
  credentialsTitle: 'Credentials',
  credentialsDescription: 'Manage email and password',
  credentialsMetaLabel: 'Email',
  mfaKicker: 'Verification',
  mfaTitle: 'MFA',
  mfaDescription: 'Manage verification',
  mfaMetaLabel: 'Auth source',
  devicesKicker: 'Sessions',
  devicesTitle: 'Devices',
  devicesDescription: 'Manage devices',
  devicesMetaLabel: 'Active sessions',
  activityKicker: 'Signals',
  activityTitle: 'Activity',
  activityDescription: 'Review events',
  activityMetaLabel: 'Security events',
}

const icons = {
  credentials: 'mail-icon',
  mfa: 'fingerprint-icon',
  devices: 'monitor-icon',
  activity: 'history-icon',
}

describe('profileSecurityPageModel', () => {
  it('keeps the security panel route contract in a stable order', () => {
    expect(SECURITY_PANEL_DEFINITIONS.map((panel) => panel.id)).toEqual([
      'credentials',
      'mfa',
      'devices',
      'activity',
    ])
  })

  it('resolves canonical and alias hashes with credentials as the fallback', () => {
    expect(resolveSecurityPanelFromHash('#credentials')).toBe('credentials')
    expect(resolveSecurityPanelFromHash('#email')).toBe('credentials')
    expect(resolveSecurityPanelFromHash('#MFA')).toBe('mfa')
    expect(resolveSecurityPanelFromHash('#unknown')).toBe('credentials')
    expect(resolveSecurityPanelFromHash('')).toBe('credentials')
  })

  it('maps panel ids to canonical hashes', () => {
    expect(getSecurityPanelHash('credentials')).toBe('#credentials')
    expect(getSecurityPanelHash('mfa')).toBe('#mfa')
    expect(getSecurityPanelHash('devices')).toBe('#devices')
    expect(getSecurityPanelHash('activity')).toBe('#activity')
  })

  it('detects whether selecting a panel requires a router hash replacement', () => {
    expect(
      shouldReplaceSecurityPanelHash({
        currentHash: '#devices',
        panelId: 'devices',
      })
    ).toBe(false)
    expect(
      shouldReplaceSecurityPanelHash({
        currentHash: '#email',
        panelId: 'credentials',
      })
    ).toBe(true)
  })

  it('formats security overview counts and risk signals', () => {
    expect(formatSecurityCount(undefined)).toBe('0')
    expect(formatSecurityCount(3)).toBe('3')
    expect(hasSecurityRiskSignals(0)).toBe(false)
    expect(hasSecurityRiskSignals(2)).toBe(true)
  })

  it('resolves the last login label without owning date formatting', () => {
    expect(
      resolveLastLoginLabel({
        value: null,
        fallback: 'empty',
        format: (value) => `formatted:${value}`,
      })
    ).toBe('empty')
    expect(
      resolveLastLoginLabel({
        value: '2026-04-28T00:00:00.000Z',
        fallback: 'empty',
        format: (value) => `formatted:${value}`,
      })
    ).toBe('formatted:2026-04-28T00:00:00.000Z')
  })

  it('builds panel cards from route definitions and supplied copy', () => {
    const cards = buildSecurityPanelCards({
      copy,
      icons,
      authSourceSummaryLabel: 'Email',
      email: 'domi@example.com',
      unavailableLabel: 'Not found',
      sessionCountLabel: '2',
      securityEventsCount: 4,
    })

    expect(cards.map((card) => card.id)).toEqual(['credentials', 'mfa', 'devices', 'activity'])
    expect(cards[0]).toMatchObject({
      id: 'credentials',
      hash: '#credentials',
      icon: 'mail-icon',
      kicker: 'Email',
      metaValue: 'domi@example.com',
    })
    expect(cards[1]).toMatchObject({
      id: 'mfa',
      metaValue: 'Email',
    })
    expect(cards[2]).toMatchObject({
      id: 'devices',
      metaValue: '2',
    })
    expect(cards[3]).toMatchObject({
      id: 'activity',
      metaValue: '4',
    })
  })

  it('falls back to the first panel card when the active id is missing', () => {
    const cards = buildSecurityPanelCards({
      copy,
      icons,
      authSourceSummaryLabel: 'Email',
      email: '',
      unavailableLabel: 'Not found',
      sessionCountLabel: '0',
      securityEventsCount: null,
    })

    expect(cards[0].metaValue).toBe('Not found')
    expect(resolveActiveSecurityPanelCard({ cards, activePanel: 'activity' })?.id).toBe('activity')
    expect(
      resolveActiveSecurityPanelCard({
        cards,
        activePanel: 'missing' as never,
      })?.id
    ).toBe('credentials')
  })

  it('resolves load error messages without importing API classes', () => {
    const apiError = { message: 'Backend rejected the request', api: true }
    const isApiError = (error: unknown): error is { message: string } =>
      Boolean(error && typeof error === 'object' && 'api' in error)

    expect(
      resolveSecurityLoadErrorMessage({
        error: apiError,
        isApiError,
        fallbackMessage: 'common.error',
      })
    ).toBe('Backend rejected the request')
    expect(
      resolveSecurityLoadErrorMessage({
        error: new Error('plain'),
        isApiError,
        fallbackMessage: 'common.error',
      })
    ).toBe('common.error')
  })

  it('builds refresh tasks in the page orchestration order', async () => {
    const calls: string[] = []
    const tasks = buildSecurityRefreshTasks({
      fetchProfile: () => {
        calls.push('profile')
        return Promise.resolve('profile')
      },
      fetchSessions: () => {
        calls.push('sessions')
        return Promise.resolve('sessions')
      },
      fetchSecuritySummary: () => {
        calls.push('summary')
        return Promise.resolve('summary')
      },
    })

    await expect(Promise.all(tasks)).resolves.toEqual(['profile', 'sessions', 'summary'])
    expect(calls).toEqual(['profile', 'sessions', 'summary'])
  })
})
