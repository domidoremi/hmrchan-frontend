import { describe, expect, it, vi } from 'vitest'

import {
  endpointsForProfileSection,
  fallbackSupportContent,
  mapProfileSectionContent,
  mapSettingsContent,
} from '@/api/hmrProfileContent'

describe('hmrProfileContent profile sections', () => {
  it('maps security section endpoints into summary, rows, and security metrics', async () => {
    const reader = vi.fn(async (path: string) => {
      const payloads: Record<string, unknown> = {
        '/2fa/status': {
          enabled: true,
          updated_at: '2026-05-28T00:00:00.000Z',
          webauthn_credentials: [{ id: 'passkey-1' }, { id: 'passkey-2' }],
        },
        '/auth/sessions': {
          sessions: [
            {
              id: 'session-1',
              title: 'Chrome on Windows',
              body: 'Current session',
              metric: 'active',
            },
          ],
        },
        '/devices': {
          devices: [{ id: 'device-1' }, { id: 'device-2' }],
        },
      }
      return payloads[path] ?? null
    })

    const content = await mapProfileSectionContent('security', reader)

    expect(reader).toHaveBeenCalledWith('/2fa/status')
    expect(reader).toHaveBeenCalledWith('/auth/sessions')
    expect(reader).toHaveBeenCalledWith('/devices')
    expect(content).toMatchObject({
      section: 'security',
      title: '安全状态',
      security: {
        passkeys: 2,
        sessions: 1,
        devices: 2,
        twoFactorEnabled: true,
        updatedAt: '2026-05-28T00:00:00.000Z',
      },
    })
    expect(content.summary.map((item) => item.metric)).toEqual(['2', '1', '2'])
    expect(content.rows).toEqual([
      {
        id: 'session-1',
        title: 'Chrome on Windows',
        excerpt: 'Current session',
        metric: 'active',
      },
    ])
  })

  it('normalizes unknown sections to overview and maps identity metadata', async () => {
    const reader = vi.fn(async (path: string) => {
      const payloads: Record<string, unknown> = {
        '/auth/me': {
          id: 'member-1',
          username: 'momi',
        },
        '/users/me/profile': {
          bio: 'Signal collector',
          items: [
            {
              id: 'profile-row',
              title: 'Public profile',
              description: 'Visible profile row',
              value: 'Profile',
            },
          ],
        },
      }
      return payloads[path] ?? null
    })

    const content = await mapProfileSectionContent('unknown', reader)

    expect(content.section).toBe('overview')
    expect(content.summary[0]).toEqual({
      id: 'identity',
      title: 'momi',
      excerpt: 'Signal collector',
      metric: 'member-1',
    })
    expect(content.rows[0]).toMatchObject({
      id: 'profile-row',
      title: 'Public profile',
      excerpt: 'Visible profile row',
      metric: 'Profile',
    })
  })

  it('maps inbox summary aliases into unread and latest state', async () => {
    const reader = vi.fn(async (path: string) => {
      if (path === '/inbox/summary') {
        return {
          unread: '5',
          latest_label: '刚刚',
        }
      }
      if (path === '/inbox') {
        return {
          messages: [
            {
              id: 'message-1',
              title: '系统通知',
              body: '审核已完成',
              metric: 'unread',
            },
          ],
        }
      }
      return null
    })

    const content = await mapProfileSectionContent('inbox', reader)

    expect(content.inbox).toEqual({
      unreadCount: 5,
      latestLabel: '刚刚',
    })
    expect(content.summary.map((item) => item.metric)).toEqual(['5', '刚刚'])
    expect(content.rows).toHaveLength(1)
  })

  it('declares stable endpoints for each profile section', () => {
    expect(endpointsForProfileSection('security')).toEqual([
      '/2fa/status',
      '/auth/sessions',
      '/devices',
    ])
    expect(endpointsForProfileSection('favorites')).toEqual(['/favorites/summary', '/favorites'])
    expect(endpointsForProfileSection('history')).toEqual(['/history/summary', '/history/browsing'])
    expect(endpointsForProfileSection('inbox')).toEqual(['/inbox/summary', '/inbox'])
    expect(endpointsForProfileSection('unknown')).toEqual(['/auth/me', '/users/me/profile'])
  })
})

describe('hmrProfileContent settings and support', () => {
  it('maps settings payloads into account, security, and preference groups', () => {
    const content = mapSettingsContent(
      {
        items: [
          {
            id: 'locale',
            title: '语言',
            description: 'zh-CN',
            metric: '偏好',
          },
        ],
      },
      {
        items: [
          {
            id: 'totp',
            title: 'TOTP',
            description: 'enabled',
            metric: 'Security',
          },
        ],
      },
      {
        devices: [
          {
            id: 'device-1',
            title: 'Windows',
            description: 'Trusted',
            metric: 'Device',
          },
        ],
      }
    )

    expect(content.account.map((item) => item.id)).toEqual(['profile', 'feedback'])
    expect(content.security.map((item) => item.id)).toEqual(['totp', 'device-1'])
    expect(content.preferences).toEqual([
      {
        id: 'locale',
        title: '语言',
        excerpt: 'zh-CN',
        metric: '偏好',
      },
    ])
  })

  it('provides local support content for contact flows', () => {
    const support = fallbackSupportContent()

    expect(support.faqs.map((item) => item.id)).toEqual(['contact', 'join', 'local'])
    expect(support.flows.map((item) => item.id)).toEqual(['brief', 'reply'])
  })
})
