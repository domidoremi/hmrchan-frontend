import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import vClickOutside from '@/directives/clickOutside'

vi.mock('@/components/ui/Avatar.vue', () => ({
  default: {
    name: 'Avatar',
    props: ['src', 'alt', 'fallback'],
    template: `
      <span class="ui-avatar">
        <img v-if="src" :src="src" :alt="alt" />
        <span v-else>{{ fallback }}</span>
      </span>
    `,
  },
}))

import AppNavbar from '../AppNavbar.vue'

const MOBILE_NAV_QUERY = '(max-width: 960px)'
const navbarMocks = vi.hoisted(() => {
  const idleTasks: Array<{ task: () => void; cancel: ReturnType<typeof vi.fn> }> = []
  const prefetchExploreDataMock = vi.fn()
  const prefetchAuthorsDataMock = vi.fn()
  const runWhenIdleMock = vi.fn((task: () => void) => {
    const cancel = vi.fn()
    idleTasks.push({ task, cancel })
    return cancel
  })

  return {
    idleTasks,
    prefetchExploreDataMock,
    prefetchAuthorsDataMock,
    runWhenIdleMock,
  }
})

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
  user: null as { username: string; full_name?: string | null; email?: string } | null,
  isAuthenticated: false,
  logout: vi.fn(),
})

const settingsStoreState = reactive({
  settings: {
    enableAnimations: true,
  },
})

const scheduleStoreState = reactive({
  hasNew: false,
  checkForNew: vi.fn(),
})

vi.mock('@/stores', () => ({
  useAuthStore: () => authStoreState,
  useSettingsStore: () => settingsStoreState,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreState,
}))

vi.mock('@/composables/useUserAvatar', () => ({
  useUserAvatar: () => ({
    avatarUrl: computed(() => '/images/avatar.webp'),
  }),
  preloadUserAvatar: vi.fn(),
}))

vi.mock('@/utils/prefetch', () => ({
  prefetchExploreData: navbarMocks.prefetchExploreDataMock,
  prefetchAuthorsData: navbarMocks.prefetchAuthorsDataMock,
}))

vi.mock('@/utils/performance', () => ({
  runWhenIdle: navbarMocks.runWhenIdleMock,
  prefersReducedMotion: () => false,
  scheduleDOMUpdate: (read: () => unknown, write: (value: unknown) => void) => {
    write(read())
  },
  throttleRAF: (fn: (...args: unknown[]) => void) => {
    const wrapped = (...args: unknown[]) => fn(...args)
    ;(wrapped as typeof wrapped & { cancel?: () => void }).cancel = vi.fn()
    return wrapped
  },
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
        search: 'Search',
        primaryNavigation: 'Primary navigation',
      },
      home: {
        hero: {
          primaryAction: 'Start Exploring',
        },
      },
      nav: {
        home: 'Home',
        explore: 'Explore',
        favorites: 'Favorites',
        authors: 'Authors',
        community: 'Community',
        schedule: 'Schedule',
        about: 'About',
        settings: 'Settings',
        login: 'Login',
        profile: 'Profile',
        logout: 'Logout',
        profileSettings: 'Profile Settings',
      },
      profile: {
        summary: 'Account summary',
        tabs: {
          notifications: 'Notifications',
          devices: 'Devices',
        },
      },
    },
  },
})

async function createWrapper(initialPath = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>home</div>' } },
      { path: '/explore', component: { template: '<div>explore</div>' } },
      { path: '/search', component: { template: '<div>search</div>' } },
      { path: '/post/:id', name: 'post-detail', component: { template: '<div>post detail</div>' } },
      { path: '/favorites', component: { template: '<div>favorites</div>' } },
      { path: '/authors', component: { template: '<div>authors</div>' } },
      { path: '/community', component: { template: '<div>community</div>' } },
      { path: '/schedule', component: { template: '<div>schedule</div>' } },
      { path: '/about', component: { template: '<div>about</div>' } },
      { path: '/profile', component: { template: '<div>profile</div>' } },
      { path: '/profile/settings', component: { template: '<div>profile settings</div>' } },
      {
        path: '/profile/notifications',
        component: { template: '<div>profile notifications</div>' },
      },
      { path: '/profile/devices', component: { template: '<div>profile devices</div>' } },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div>fallback</div>' } },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  const wrapper = mount(AppNavbar, {
    attachTo: document.body,
    props: {
      chromeless: true,
    },
    global: {
      plugins: [router, i18n],
      directives: {
        'click-outside': vClickOutside,
      },
      stubs: {
        transition: true,
        AnimatedIcon: {
          template: '<span aria-hidden="true" />',
        },
        Avatar: {
          props: ['src', 'alt', 'fallback'],
          template: `
            <span class="ui-avatar">
              <img v-if="src" :src="src" :alt="alt" />
              <span v-else>{{ fallback }}</span>
            </span>
          `,
        },
        Separator: {
          template: '<hr />',
        },
        SettingsPanel: {
          props: ['externalScroll'],
          template:
            '<div class="settings-panel-stub" :data-external-scroll="String(externalScroll)"><button type="button" class="settings-panel-focus">Settings panel</button></div>',
        },
      },
    },
  })

  mountedWrappers.push(wrapper)
  return { wrapper, router }
}

const mountedWrappers: Array<VueWrapper> = []

function stubMatchMedia(isMobile: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === MOBILE_NAV_QUERY ? isMobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

function setNavigatorOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  })
}

function setDocumentVisibilityState(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  })
}

describe('AppNavbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    navbarMocks.idleTasks.length = 0
    navbarMocks.runWhenIdleMock.mockClear()
    navbarMocks.prefetchExploreDataMock.mockClear()
    navbarMocks.prefetchAuthorsDataMock.mockClear()
    authStoreState.user = null
    authStoreState.isAuthenticated = false
    authStoreState.logout.mockClear()
    scheduleStoreState.hasNew = false
    scheduleStoreState.checkForNew.mockClear()
    stubMatchMedia(false)
    setNavigatorOnline(true)
    setDocumentVisibilityState('visible')
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      const wrapper = mountedWrappers.pop()
      try {
        wrapper?.unmount()
      } catch {
        // ignore wrappers already unmounted inside the test body
      }
    }
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('closes settings dropdown when clicking outside', async () => {
    const { wrapper } = await createWrapper()

    const settingsButton = wrapper.find('button[aria-label="Settings"]')
    await settingsButton.trigger('click')
    await nextTick()

    expect(wrapper.find('#navbar-settings-panel').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('#navbar-settings-panel').exists()).toBe(false)

    wrapper.unmount()
  })

  it('expands desktop search before routing and submits the typed query', async () => {
    const { wrapper, router } = await createWrapper()

    const searchForm = wrapper.find('.nav-search-shell')
    expect(searchForm.exists()).toBe(true)

    await searchForm.trigger('submit')
    await nextTick()

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(searchForm.classes()).toContain('nav-search-shell--expanded')

    const searchInput = wrapper.find('#navbar-desktop-search')
    await searchInput.setValue('momo')
    await searchForm.trigger('submit')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.fullPath).toBe('/search?q=momo')

    wrapper.unmount()
  })

  it('renders the desktop transparent shell without top-level route links', async () => {
    const { wrapper } = await createWrapper()

    expect(wrapper.find('.brand-mark').exists()).toBe(false)
    expect(wrapper.find('.brand-tagline').exists()).toBe(false)
    expect(wrapper.find('.navbar-brand').exists()).toBe(false)
    expect(wrapper.find('.navbar-shell').exists()).toBe(true)
    expect(wrapper.find('.navbar-shell--actions-only').exists()).toBe(true)
    expect(wrapper.find('.glass-navbar').exists()).toBe(false)
    expect(wrapper.find('.navbar-links').exists()).toBe(false)
    expect(wrapper.find('.mobile-nav').exists()).toBe(false)
    expect(wrapper.find('.navbar-cta').exists()).toBe(false)

    wrapper.unmount()
  })

  it('adds the post-detail chromeless class on post routes', async () => {
    const { wrapper } = await createWrapper('/post/post-1')

    expect(wrapper.classes()).toContain('navbar--chromeless')
    expect(wrapper.classes()).toContain('navbar--post-detail')

    wrapper.unmount()
  })

  it('keeps brand and omits the legacy mobile route trigger', async () => {
    stubMatchMedia(true)
    const { wrapper } = await createWrapper()

    expect(wrapper.find('.navbar-brand .brand-name').text()).toContain('MomiChan')
    expect(wrapper.find('.navbar-shell--actions-only').exists()).toBe(false)
    expect(wrapper.find('.navbar-cta').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Primary navigation"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('closes settings dropdown on Escape and restores focus to the trigger', async () => {
    const { wrapper } = await createWrapper()

    const settingsButton = wrapper.find('button[aria-label="Settings"]')
    await settingsButton.trigger('click')
    await nextTick()

    const panelButton = wrapper.find('.settings-panel-focus')
    ;(panelButton.element as HTMLButtonElement).focus()
    expect(document.activeElement).toBe(panelButton.element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    await nextTick()

    expect(wrapper.find('#navbar-settings-panel').exists()).toBe(false)
    expect(document.activeElement).toBe(settingsButton.element)

    wrapper.unmount()
  })

  it('passes external scrolling mode to the navbar settings panel', async () => {
    const { wrapper } = await createWrapper()

    await wrapper.get('button[aria-label="Settings"]').trigger('click')
    await nextTick()

    expect(
      wrapper.find('.settings-panel-stub').attributes('data-external-scroll')
    ).not.toBeUndefined()

    wrapper.unmount()
  })

  it('keeps the navbar visible while the settings panel is open during scroll', async () => {
    const { wrapper } = await createWrapper()

    await wrapper.get('button[aria-label="Settings"]').trigger('click')
    await nextTick()

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 240,
    })
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.classes()).not.toContain('navbar-hidden')

    wrapper.unmount()
  })

  it('cancels pending idle prefetch on route change and only executes once per visible cycle', async () => {
    authStoreState.isAuthenticated = true
    authStoreState.user = { username: 'momo', email: 'momo@example.com' }
    const { wrapper, router } = await createWrapper()

    await vi.advanceTimersByTimeAsync(8000)
    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(1)
    expect(navbarMocks.idleTasks).toHaveLength(1)

    await router.push('/search')
    await nextTick()

    expect(navbarMocks.idleTasks[0]?.cancel).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(8000)
    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(2)

    navbarMocks.idleTasks[1]?.task()
    await nextTick()

    expect(navbarMocks.prefetchExploreDataMock).toHaveBeenCalledTimes(1)
    expect(navbarMocks.prefetchAuthorsDataMock).toHaveBeenCalledTimes(1)

    await router.push('/')
    await nextTick()
    await vi.advanceTimersByTimeAsync(8000)

    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })

  it('cancels pending idle prefetch while hidden and reschedules after becoming visible again', async () => {
    authStoreState.isAuthenticated = true
    authStoreState.user = { username: 'momo', email: 'momo@example.com' }
    const { wrapper } = await createWrapper()

    await vi.advanceTimersByTimeAsync(8000)
    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(1)
    expect(navbarMocks.idleTasks).toHaveLength(1)

    setDocumentVisibilityState('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()

    expect(navbarMocks.idleTasks[0]?.cancel).toHaveBeenCalledTimes(1)

    setDocumentVisibilityState('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(8000)

    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(2)

    navbarMocks.idleTasks[1]?.task()
    await nextTick()

    expect(navbarMocks.prefetchExploreDataMock).toHaveBeenCalledTimes(1)
    expect(navbarMocks.prefetchAuthorsDataMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('schedules idle prefetch after the browser comes back online', async () => {
    authStoreState.isAuthenticated = true
    authStoreState.user = { username: 'momo', email: 'momo@example.com' }
    setNavigatorOnline(false)
    const { wrapper } = await createWrapper()

    await vi.advanceTimersByTimeAsync(8000)
    expect(navbarMocks.runWhenIdleMock).not.toHaveBeenCalled()

    setNavigatorOnline(true)
    window.dispatchEvent(new Event('online'))
    await nextTick()
    await vi.advanceTimersByTimeAsync(8000)

    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(1)

    navbarMocks.idleTasks[0]?.task()
    await nextTick()

    expect(navbarMocks.prefetchExploreDataMock).toHaveBeenCalledTimes(1)
    expect(navbarMocks.prefetchAuthorsDataMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('cancels pending idle prefetch on unmount', async () => {
    authStoreState.isAuthenticated = true
    authStoreState.user = { username: 'momo', email: 'momo@example.com' }
    const { wrapper } = await createWrapper()

    await vi.advanceTimersByTimeAsync(8000)
    expect(navbarMocks.runWhenIdleMock).toHaveBeenCalledTimes(1)

    wrapper.unmount()

    expect(navbarMocks.idleTasks[0]?.cancel).toHaveBeenCalledTimes(1)
  })

  it('uses deterministic profile return links inside the authenticated user menu', async () => {
    authStoreState.isAuthenticated = true
    authStoreState.user = { username: 'momo', email: 'momo@example.com' }

    const { wrapper } = await createWrapper('/search?q=anime')

    await wrapper.get('.nav-user-btn').trigger('click')
    await nextTick()

    const userMenuLinks = wrapper.findAll('#navbar-user-menu .user-menu-card')
    const hrefs = userMenuLinks.map((link) => decodeURIComponent(link.attributes('href') ?? ''))

    expect(hrefs).toContain('/profile')
    expect(hrefs).toContain('/profile/settings?returnTo=/search?q=anime')
    expect(hrefs).toContain('/profile/notifications?returnTo=/search?q=anime')
    expect(hrefs).toContain('/profile/devices?returnTo=/search?q=anime')
  })
})
