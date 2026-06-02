import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'

import { useHmrShellNavigation } from '@/hmr/composables/useHmrShellNavigation'
import { localeBadges } from '@/i18n/locales'

function makeI18n(locale = 'zh-CN') {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      'zh-CN': {
        nav: {
          community: '社区',
          explore: '探索',
          home: '首页',
          schedule: '日程',
        },
      },
      'en-US': {
        nav: {
          community: 'Community',
          explore: 'Explore',
          home: 'Home',
          schedule: 'Schedule',
        },
      },
      'ja-JP': {
        nav: {
          community: 'コミュニティ',
          explore: '探す',
          home: 'ホーム',
          schedule: '予定',
        },
      },
    },
  })
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'hmr-home',
    component: { template: '<div />' },
    meta: { pageKey: 'home', navKey: 'home' },
  },
  {
    path: '/explore',
    name: 'hmr-explore',
    component: { template: '<div />' },
    meta: { pageKey: 'explore', navKey: 'explore' },
  },
  {
    path: '/posts/:id',
    name: 'hmr-post-detail',
    component: { template: '<div />' },
    meta: { pageKey: 'post', navKey: 'explore' },
  },
  {
    path: '/about',
    name: 'hmr-about',
    component: { template: '<div />' },
    meta: { pageKey: 'about' },
  },
  {
    path: '/login',
    name: 'hmr-login',
    component: { template: '<div />' },
    meta: { pageKey: 'login' },
  },
  {
    path: '/register',
    name: 'hmr-register',
    component: { template: '<div />' },
    meta: { pageKey: 'register' },
  },
]

async function mountNavigation(path = '/', locale = 'zh-CN') {
  let navigation: ReturnType<typeof useHmrShellNavigation> | undefined
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  const app = createApp({
    setup() {
      navigation = useHmrShellNavigation()
      return () => null
    },
  })

  app.use(createPinia())
  app.use(makeI18n(locale))
  app.use(router)
  await router.push(path)
  await router.isReady()
  app.mount(document.createElement('div'))

  if (!navigation) {
    throw new Error('navigation composable did not initialize')
  }

  return { app, navigation, router }
}

describe('useHmrShellNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('builds translated primary navigation and locale badge state', async () => {
    const { app, navigation } = await mountNavigation('/', 'en-US')

    expect(navigation.primaryNav.value.map((item) => item.label)).toEqual([
      'Home',
      'Explore',
      'Community',
      'Schedule',
    ])
    expect(navigation.localeBadge.value).toBe(localeBadges['en-US'])
    expect(navigation.keepAliveNames).toEqual([
      'HomePage',
      'ExplorePage',
      'CommunityPage',
      'SchedulePage',
      'PostDetailPage',
    ])

    app.unmount()
  })

  it('resolves active navigation from route metadata and keeps posts under explore', async () => {
    const { app, navigation, router } = await mountNavigation('/')

    expect(navigation.activeNavKey.value).toBe('home')

    await router.push('/posts/123')
    await nextTick()

    expect(navigation.activeNavKey.value).toBe('explore')

    await router.push('/about')
    await nextTick()

    expect(navigation.activeNavKey.value).toBeNull()
    app.unmount()
  })

  it('creates auth redirect targets without redirecting login and register to themselves', async () => {
    const { app, navigation, router } = await mountNavigation('/posts/123?from=feed')

    expect(navigation.loginTarget.value).toEqual({
      path: '/login',
      query: { redirect: '/posts/123?from=feed' },
    })
    expect(navigation.registerTarget.value).toEqual({
      path: '/register',
      query: { redirect: '/posts/123?from=feed' },
    })

    await router.push('/login')
    await nextTick()
    expect(navigation.loginTarget.value).toEqual({
      path: '/login',
      query: { redirect: '/' },
    })

    await router.push('/register')
    await nextTick()
    expect(navigation.registerTarget.value).toEqual({
      path: '/register',
      query: { redirect: '/' },
    })

    app.unmount()
  })

  it('controls mobile menu state and closes it after navigation', async () => {
    const { app, navigation } = await mountNavigation()
    const event = new MouseEvent('click')
    const navigate = vi.fn()

    expect(navigation.menuOpen.value).toBe(false)
    navigation.toggleMenu()
    expect(navigation.menuOpen.value).toBe(true)
    navigation.handleNavClick(event, navigate)

    expect(navigate).toHaveBeenCalledExactlyOnceWith(event)
    expect(navigation.menuOpen.value).toBe(false)
    app.unmount()
  })

  it('limits keep-alive routing to public cached page keys', async () => {
    const { app, navigation } = await mountNavigation()

    expect(navigation.shouldKeepAlive('home')).toBe(true)
    expect(navigation.shouldKeepAlive('post')).toBe(true)
    expect(navigation.shouldKeepAlive('settings')).toBe(false)
    expect(navigation.shouldKeepAlive(undefined)).toBe(false)

    app.unmount()
  })
})
