/**
 * Vue Router Configuration
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import i18n from '@/i18n'

// 缓存 auth store 模块，避免每次路由切换都动态导入
let authStoreModule: typeof import('@/stores/auth') | null = null

async function getAuthStore() {
  if (!authStoreModule) {
    authStoreModule = await import('@/stores/auth')
  }
  return authStoreModule.useAuthStore()
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'nav.home' },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/ExplorePage.vue'),
    meta: { title: 'nav.explore' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchPage.vue'),
    meta: { title: 'nav.search' },
  },
  {
    path: '/post/:id',
    name: 'post-detail',
    component: () => import('@/views/PostDetailPage.vue'),
    meta: { title: 'nav.postDetail' },
  },
  {
    path: '/authors',
    name: 'authors',
    component: () => import('@/views/AuthorsPage.vue'),
    meta: { title: 'nav.authors' },
  },
  {
    path: '/community',
    name: 'community',
    component: () => import('@/views/CommunityPage.vue'),
    meta: { title: 'community.title' },
  },
  {
    path: '/author/:id',
    name: 'author-detail',
    component: () => import('@/views/AuthorDetailPage.vue'),
    meta: { title: 'nav.authorDetail' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { title: 'nav.profile', requiresAuth: true },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: { title: 'nav.favorites', requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: { title: 'nav.settings' },
  },
  {
    path: '/settings/profile',
    name: 'profile-settings',
    component: () => import('@/views/ProfileSettingsPage.vue'),
    meta: { title: 'nav.profileSettings', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { title: 'nav.login', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterPage.vue'),
    meta: { title: 'nav.register', guestOnly: true },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactPage.vue'),
    meta: { title: 'nav.contact' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: { title: 'error.notFound' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return new Promise((resolve) => {
        const targetLeft = savedPosition.left ?? 0
        const targetTop = savedPosition.top ?? 0
        const maxWaitMs = 2000
        const startTime = Date.now()

        const check = () => {
          const maxScrollable = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight
          )
          const waitedTooLong = Date.now() - startTime > maxWaitMs

          if (maxScrollable >= targetTop || waitedTooLong) {
            resolve({ left: targetLeft, top: targetTop, behavior: 'auto' })
            return
          }

          requestAnimationFrame(check)
        }

        requestAnimationFrame(check)
      })
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0, behavior: 'smooth' }
  },
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  // 使用缓存的 auth store 模块
  const authStore = await getAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // 需要认证的页面
  if (to.meta['requiresAuth'] && !isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // 仅游客可访问的页面（登录、注册）
  if (to.meta['guestOnly'] && isAuthenticated) {
    next('/')
    return
  }

  next()
})

const SITE_NAME = 'MomiChan'
const SITE_ORIGIN = 'https://momichan.xyz'
let defaultDescription: string | undefined

function ensureMetaName(name: string): HTMLMetaElement {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  return el
}

function ensureMetaProperty(property: string): HTMLMetaElement {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  return el
}

function ensureLinkRel(rel: string): HTMLLinkElement {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  return el
}

router.afterEach((to) => {
  const titleKey = to.meta['title']
  const translatedTitle = typeof titleKey === 'string' ? String(i18n.global.t(titleKey)) : ''
  const nextTitle = translatedTitle && translatedTitle !== SITE_NAME ? `${translatedTitle} - ${SITE_NAME}` : SITE_NAME

  document.title = nextTitle

  const canonicalUrl = new URL(to.path, SITE_ORIGIN).toString()
  ensureLinkRel('canonical').setAttribute('href', canonicalUrl)
  ensureMetaProperty('og:url').setAttribute('content', canonicalUrl)
  ensureMetaName('twitter:url').setAttribute('content', canonicalUrl)

  ensureMetaProperty('og:title').setAttribute('content', nextTitle)
  ensureMetaName('twitter:title').setAttribute('content', nextTitle)

  if (defaultDescription === undefined) {
    defaultDescription = (document.querySelector('meta[name="description"]') as HTMLMetaElement | null)?.content
  }

  const description = typeof to.meta['description'] === 'string' ? to.meta['description'] : defaultDescription
  if (description) {
    ensureMetaName('description').setAttribute('content', description)
    ensureMetaProperty('og:description').setAttribute('content', description)
    ensureMetaName('twitter:description').setAttribute('content', description)
  }
})

export default router
