import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppSideNav from '../AppSideNav.vue'

vi.mock('pinia', async () => {
  const actual = await vi.importActual<typeof import('pinia')>('pinia')
  const vue = await vi.importActual<typeof import('vue')>('vue')

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => {
      const refs: Record<string, unknown> = {}
      for (const key of Object.keys(store)) {
        if (typeof store[key] === 'function') continue
        refs[key] = vue.toRef(store, key)
      }
      return refs
    },
  }
})

const authStoreState = reactive({
  user: null as { username: string } | null,
  isAuthenticated: false,
})

vi.mock('@/stores', () => ({
  useAuthStore: () => authStoreState,
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      app: {
        name: 'MomiChan',
      },
      common: {
        siteNavigation: 'Site navigation',
        primaryNavigation: 'Primary navigation',
        utilityNavigation: 'Utility navigation',
      },
      nav: {
        home: 'Home',
        explore: 'Explore',
        favorites: 'Favorites',
        authors: 'Authors',
        community: 'Community',
        schedule: 'Schedule',
        about: 'About',
        profileSettings: 'Profile Settings',
      },
    },
  },
})

async function createWrapper(initialPath = '/explore') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/explore', component: { template: '<div>explore</div>' } },
      { path: '/favorites', component: { template: '<div>favorites</div>' } },
      { path: '/authors', component: { template: '<div>authors</div>' } },
      { path: '/community', component: { template: '<div>community</div>' } },
      { path: '/schedule', component: { template: '<div>schedule</div>' } },
      { path: '/about', component: { template: '<div>about</div>' } },
      { path: '/profile/settings', component: { template: '<div>settings</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  return mount(AppSideNav, {
    global: {
      plugins: [router, i18n],
    },
  })
}

describe('AppSideNav', () => {
  beforeEach(() => {
    authStoreState.user = null
    authStoreState.isAuthenticated = false
  })

  it('renders logo, primary routes, and utility routes for guests', async () => {
    const wrapper = await createWrapper('/explore')

    expect(wrapper.find('.app-side-nav__brand').attributes('title')).toBe('MomiChan')
    expect(wrapper.find('nav[aria-label="Primary navigation"]').exists()).toBe(true)
    expect(wrapper.find('nav[aria-label="Utility navigation"]').exists()).toBe(true)
    expect(wrapper.findAll('.app-side-nav__section--primary .app-side-nav__link')).toHaveLength(5)
    expect(wrapper.find('.app-side-nav__link--active').attributes('title')).toBe('Explore')
  })

  it('adds the favorites route to the primary rail for authenticated users', async () => {
    authStoreState.user = { username: 'momo' }
    authStoreState.isAuthenticated = true

    const wrapper = await createWrapper('/favorites')
    const primaryLinks = wrapper.findAll('.app-side-nav__section--primary .app-side-nav__link')
    const titles = primaryLinks.map((link) => link.attributes('title'))

    expect(primaryLinks).toHaveLength(6)
    expect(titles).toContain('Favorites')
    expect(wrapper.find('.app-side-nav__link--active').attributes('title')).toBe('Favorites')
  })
})
