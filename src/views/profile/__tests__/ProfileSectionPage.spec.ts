import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ProfileSectionPage from '../ProfileSectionPage.vue'
import { profileSections } from '@/config/profileSections'

const routedSections = profileSections.filter((section) =>
  [
    'favorites',
    'comments',
    'likes',
    'comment-favorites',
    'history',
    'reports',
    'followers',
    'following',
    'blocked',
  ].includes(section.id)
)

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/profile/ProfileSubPageHeader.vue', () => ({
  default: {
    props: ['title', 'hint'],
    template:
      '<header class="profile-sub-page-header-stub"><h1>{{ title }}</h1><p>{{ hint }}</p></header>',
  },
}))

vi.mock('@/components/profile/ProfileFavoritesTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template: '<div class="profile-favorites-tab-stub">favorites:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileCommentsTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template: '<div class="profile-comments-tab-stub">comments:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileLikesTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template: '<div class="profile-likes-tab-stub">likes:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileCommentFavoritesTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template:
      '<div class="profile-comment-favorites-tab-stub">comment-favorites:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileHistoryTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template: '<div class="profile-history-tab-stub">history:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileReportsTab.vue', () => ({
  default: {
    props: ['showHeader'],
    template: '<div class="profile-reports-tab-stub">reports:{{ showHeader }}</div>',
  },
}))
vi.mock('@/components/profile/ProfileRelationsTab.vue', () => ({
  default: {
    props: ['mode', 'showHeader'],
    template: '<div class="profile-relations-tab-stub">relations:{{ mode }}:{{ showHeader }}</div>',
  },
}))

describe('ProfileSectionPage', () => {
  it.each(
    routedSections.map((section) => [section.id, section.labelKey, section.hintKey] as const)
  )('maps %s to the expected header and body component', (sectionId, labelKey, hintKey) => {
    const wrapper = mount(ProfileSectionPage, {
      props: {
        sectionId,
      },
    })

    const sectionShell = wrapper.get('[data-testid="profile-section-shell"]')
    expect(sectionShell.attributes('data-profile-section')).toBe(sectionId)

    const headerText = wrapper.find('.profile-sub-page-header-stub').text()
    expect(headerText).toContain(labelKey)
    expect(headerText.includes(hintKey ?? '')).toBe(hintKey ? true : true)

    const relationSection =
      sectionId === 'followers' || sectionId === 'following' || sectionId === 'blocked'

    const expectedStubClass = relationSection
      ? '.profile-relations-tab-stub'
      : {
          favorites: '.profile-favorites-tab-stub',
          comments: '.profile-comments-tab-stub',
          likes: '.profile-likes-tab-stub',
          'comment-favorites': '.profile-comment-favorites-tab-stub',
          history: '.profile-history-tab-stub',
          reports: '.profile-reports-tab-stub',
        }[sectionId]

    expect(expectedStubClass).toBeTruthy()
    expect(wrapper.find(expectedStubClass!).exists()).toBe(true)

    const relationWrapper = wrapper.find('.profile-relations-tab-stub')
    const relationText = relationWrapper.exists() ? relationWrapper.text() : ''
    expect(relationWrapper.exists()).toBe(relationSection)
    expect(relationText).toContain(relationSection ? `relations:${sectionId}:false` : '')
  })
})
