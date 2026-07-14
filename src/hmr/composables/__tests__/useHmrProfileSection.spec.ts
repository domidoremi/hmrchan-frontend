import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { HmrProfileSectionContent } from '@/api/hmrContent'
import {
  createHmrProfileSections,
  normalizeHmrProfileSection,
  resolveHmrProfileSectionIntro,
  useHmrProfileSection,
} from '@/hmr/composables/useHmrProfileSection'

function t(key: string): string {
  const messages: Record<string, string> = {
    'profile.empty': '暂无个人内容',
    'profile.favorites': '收藏',
    'profile.history': '历史',
    'profile.inbox': '收件箱',
    'profile.overview': '概览',
    'profile.preferences': '偏好',
    'profile.security': '安全',
    'profile.sessionState': '会话状态',
  }
  return messages[key] ?? key
}

function makeProfileContent(
  overrides: Partial<HmrProfileSectionContent> = {}
): HmrProfileSectionContent {
  return {
    section: 'overview',
    title: '个人概览',
    summary: [],
    rows: [],
    ...overrides,
  }
}

function makeProfileSection(
  overrides: Partial<{
    authenticated: boolean
    content: HmrProfileSectionContent
    rawSection: string
  }> = {}
) {
  const auth = {
    isAuthenticated: overrides.authenticated ?? false,
    isLoading: false,
    logout: vi.fn(async () => undefined),
    sessionExpiresAt: '2026-06-01T00:00:00.000Z',
    user: {
      id: 'user-1',
      username: 'momi',
      email: 'user@example.test',
    },
  }
  const router = {
    push: vi.fn(async () => undefined),
  }
  const content = ref(overrides.content ?? makeProfileContent())
  const rawSection = ref(overrides.rawSection ?? 'overview')
  const section = useHmrProfileSection({
    auth,
    content,
    rawSection,
    router,
    t,
  })

  return {
    auth,
    content,
    rawSection,
    router,
    section,
  }
}

describe('profile section helpers', () => {
  it('normalizes unsupported sections to overview', () => {
    expect(normalizeHmrProfileSection('security')).toBe('security')
    expect(normalizeHmrProfileSection('unknown')).toBe('overview')
  })

  it('builds the stable profile section navigation', () => {
    expect(createHmrProfileSections(t).map((item) => item.section)).toEqual([
      'overview',
      'security',
      'preferences',
      'favorites',
      'history',
      'inbox',
    ])
  })

  it('resolves section intro copy by active section', () => {
    expect(resolveHmrProfileSectionIntro('favorites', t)).toBe(
      '收藏内容会在这里形成可回看的个人索引。'
    )
    expect(resolveHmrProfileSectionIntro('overview', t)).toBe('暂无个人内容')
  })
})

describe('useHmrProfileSection', () => {
  it('derives title, active section, and profile cards', () => {
    const { section } = makeProfileSection({
      authenticated: true,
      rawSection: 'security',
      content: makeProfileContent({
        title: '安全状态',
        security: {
          passkeys: 2,
          sessions: 3,
          devices: 1,
          twoFactorEnabled: true,
          updatedAt: 'now',
        },
      }),
    })

    expect(section.activeSection.value).toBe('security')
    expect(section.currentTitle.value).toBe('安全状态')
    expect(section.sectionIntro.value).toBe('管理 Passkey、2FA、设备会话和敏感操作验证。')
    expect(section.sectionCards.value).toEqual([
      {
        kicker: '会话',
        title: '当前会话',
        body: '有效期至 2026-06-01T00:00:00.000Z',
      },
      {
        kicker: '身份',
        title: 'user-1',
        body: 'user@example.test',
      },
      {
        kicker: '安全',
        title: '2 Passkey',
        body: '2FA 已启用。',
      },
    ])
  })

  it('updates derived section when route section changes', () => {
    const { rawSection, section } = makeProfileSection({ rawSection: 'unknown' })

    expect(section.activeSection.value).toBe('overview')

    rawSection.value = 'inbox'
    expect(section.activeSection.value).toBe('inbox')
  })

  it('logs out and routes to login', async () => {
    const { auth, router, section } = makeProfileSection()

    await section.logout()

    expect(auth.logout).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/login')
  })
})
