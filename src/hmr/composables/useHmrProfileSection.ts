import { computed, type Ref } from 'vue'
import type { Router } from 'vue-router'

import type { HmrProfileSectionContent, HmrProfileSectionKey } from '@/api/hmrContent'
import type { useAuthStore } from '@/stores/auth'

type AuthStore = ReturnType<typeof useAuthStore>

export type HmrProfileNavSection = {
  section: HmrProfileSectionKey
  label: string
  to: string
  testId: string
}

export interface HmrProfileSectionCard {
  kicker: string
  title: string
  body: string
}

interface HmrProfileSectionDefinition extends Omit<HmrProfileNavSection, 'label'> {
  labelKey: string
  intro: string | null
}

export interface HmrProfileSectionOptions {
  auth: Pick<AuthStore, 'isAuthenticated' | 'isLoading' | 'logout' | 'sessionExpiresAt' | 'user'>
  content: Ref<HmrProfileSectionContent>
  rawSection: Ref<string>
  router: Pick<Router, 'push'>
  t: (key: string) => string
}

const PROFILE_SECTION_DEFINITIONS = [
  {
    section: 'overview',
    labelKey: 'profile.overview',
    to: '/profile',
    testId: 'profile-overview-tab',
    intro: null,
  },
  {
    section: 'security',
    labelKey: 'profile.security',
    to: '/profile/security',
    testId: 'profile-security-tab',
    intro: '管理 Passkey、2FA、设备会话和敏感操作验证。',
  },
  {
    section: 'preferences',
    labelKey: 'profile.preferences',
    to: '/profile/preferences',
    testId: 'profile-preferences-tab',
    intro: '管理主题、语言、通知和内容密度。',
  },
  {
    section: 'favorites',
    labelKey: 'profile.favorites',
    to: '/profile/favorites',
    testId: 'profile-favorites-tab',
    intro: '收藏内容会在这里形成可回看的个人索引。',
  },
  {
    section: 'history',
    labelKey: 'profile.history',
    to: '/profile/history',
    testId: 'profile-history-tab',
    intro: '浏览、阅读和互动历史会在这里展示。',
  },
  {
    section: 'inbox',
    labelKey: 'profile.inbox',
    to: '/profile/inbox',
    testId: 'profile-inbox-tab',
    intro: '评论、回复、系统通知和审核结果会进入这里。',
  },
] as const satisfies readonly HmrProfileSectionDefinition[]

const PROFILE_SECTION_DEFINITION_BY_KEY = new Map(
  PROFILE_SECTION_DEFINITIONS.map((definition) => [definition.section, definition])
)

function isHmrProfileSectionKey(section: string): section is HmrProfileSectionKey {
  return PROFILE_SECTION_DEFINITION_BY_KEY.has(section as HmrProfileSectionKey)
}

export function normalizeHmrProfileSection(section: string): HmrProfileSectionKey {
  return isHmrProfileSectionKey(section) ? section : 'overview'
}

export function createHmrProfileSections(t: (key: string) => string): HmrProfileNavSection[] {
  return PROFILE_SECTION_DEFINITIONS.map(({ section, labelKey, to, testId }) => ({
    section,
    label: t(labelKey),
    to,
    testId,
  }))
}

export function resolveHmrProfileSectionIntro(
  section: HmrProfileSectionKey,
  t: (key: string) => string
): string {
  return PROFILE_SECTION_DEFINITION_BY_KEY.get(section)?.intro ?? t('profile.empty')
}

export function useHmrProfileSection(options: HmrProfileSectionOptions) {
  const activeSection = computed(() => normalizeHmrProfileSection(options.rawSection.value))
  const sections = computed(() => createHmrProfileSections(options.t))
  const currentTitle = computed(() => options.content.value.title)
  const sectionIntro = computed(() => resolveHmrProfileSectionIntro(activeSection.value, options.t))
  const sectionCards = computed<HmrProfileSectionCard[]>(() => [
    {
      kicker: '会话',
      title: options.auth.isAuthenticated ? '当前会话' : '等待登录',
      body: options.auth.sessionExpiresAt
        ? `有效期至 ${options.auth.sessionExpiresAt}`
        : options.t('profile.sessionState'),
    },
    {
      kicker: '身份',
      title: options.auth.user?.id ?? 'guest',
      body: options.auth.user?.email ?? '登录后显示邮箱和个人资料。',
    },
    ...(options.content.value.security
      ? [
          {
            kicker: '安全',
            title: `${options.content.value.security.passkeys} Passkey`,
            body: options.content.value.security.twoFactorEnabled
              ? '2FA 已启用。'
              : '2FA 尚未启用。',
          },
        ]
      : []),
    ...(options.content.value.inbox
      ? [
          {
            kicker: '收件箱',
            title: `${options.content.value.inbox.unreadCount} 未读`,
            body: options.content.value.inbox.latestLabel,
          },
        ]
      : []),
  ])

  async function logout(): Promise<void> {
    await options.auth.logout()
    await options.router.push('/login')
  }

  return {
    activeSection,
    currentTitle,
    logout,
    sectionCards,
    sectionIntro,
    sections,
  }
}
