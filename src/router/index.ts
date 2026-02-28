/**
 * Vue Router Configuration
 */

import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouteLocationNormalizedLoadedGeneric,
} from 'vue-router'
import i18n from '@/i18n'

// 扩展 RouteMeta 类型，提供类型安全的路由元信息访问
declare module 'vue-router' {
  interface RouteMeta {
    title?: string | ((route: RouteLocationNormalizedLoadedGeneric) => string)
    description?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    /** Show global footer on this route */
    showFooter?: boolean
  }
}

// auth store 已在 main.ts 同步加载，此处直接静态导入消除 Rolldown 警告
import { useAuthStore } from '@/stores/auth'

function getAuthStore() {
  return useAuthStore()
}

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/

function isValidPostRouteId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const id = value.trim()
  if (!id) return false
  const lower = id.toLowerCase()
  if (lower === 'undefined' || lower === 'null' || lower === 'nan') return false
  return UUID_LIKE_RE.test(id) || ULID_RE.test(id)
}

function toNotFoundParams(path: string): { pathMatch: string[] } {
  return { pathMatch: path.replace(/^\/+/, '').split('/').filter(Boolean) }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'nav.home', showFooter: true },
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
    component: () => import('@/layouts/CommunityLayout.vue'),
    meta: { title: 'community.title' },
    children: [
      {
        path: '',
        name: 'community',
        component: () => import('@/views/CommunityPage.vue'),
      },
      {
        path: 'discussions/:id',
        name: 'discussion-detail',
        component: () => import('@/views/DiscussionDetailPage.vue'),
        meta: { title: 'community.recentDiscussions' },
      },
    ],
  },
  {
    path: '/author/:id',
    name: 'author-detail',
    component: () => import('@/views/AuthorDetailPage.vue'),
    meta: { title: 'nav.authorDetail' },
  },
  {
    path: '/profile',
    component: () => import('@/layouts/ProfileLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('@/views/ProfilePage.vue'),
        meta: { title: 'nav.profile' },
      },
      {
        path: 'notifications',
        name: 'profile-notifications',
        component: () => import('@/views/ProfileNotificationsPage.vue'),
        meta: { title: 'profile.tabs.notifications' },
      },
      {
        path: 'devices',
        name: 'profile-devices',
        component: () => import('@/views/ProfileDevicesPage.vue'),
        meta: { title: 'profile.tabs.devices' },
      },
      {
        path: 'settings',
        name: 'profile-settings',
        component: () => import('@/views/ProfileSettingsPage.vue'),
        meta: { title: 'nav.profileSettings' },
      },
    ],
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: { title: 'nav.favorites', requiresAuth: true },
  },
  {
    path: '/settings/profile',
    redirect: '/profile/settings',
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
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordPage.vue'),
    meta: { title: 'email.forgotPasswordTitle', guestOnly: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordPage.vue'),
    meta: { title: 'email.resetPasswordTitle', guestOnly: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/views/VerifyEmailPage.vue'),
    meta: { title: 'email.verifyTitle' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactPage.vue'),
    meta: { title: 'nav.contact', showFooter: true },
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('@/views/SchedulePage.vue'),
    meta: { title: 'nav.schedule' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutPage.vue'),
    meta: { title: 'nav.about', showFooter: true },
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
router.beforeEach((to) => {
  const authStore = getAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  // 帖子详情仅接受 UUID/ULID，非法参数直接转 404，避免无效请求噪音
  if (to.name === 'post-detail') {
    const postId = Array.isArray(to.params.id) ? to.params.id[0] : to.params.id
    if (!isValidPostRouteId(postId)) {
      return {
        name: 'not-found',
        params: toNotFoundParams(to.path),
        query: to.query,
        hash: to.hash,
      }
    }
  }

  // 需要认证的页面
  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  // 仅游客可访问的页面（登录、注册）
  if (to.meta.guestOnly && isAuthenticated) {
    return '/'
  }

  return true
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
  const titleValue = typeof to.meta.title === 'function' ? to.meta.title(to) : to.meta.title
  const rawTitle = titleValue ? String(titleValue) : ''
  const translatedTitle = rawTitle ? String(i18n.global.t(rawTitle)) : ''
  const nextTitle =
    translatedTitle && translatedTitle !== SITE_NAME
      ? `${translatedTitle} · ${SITE_NAME}`
      : SITE_NAME

  document.title = nextTitle

  // 记录访问历史（用于智能预缓存）
  if (to.name === 'post-detail' && to.params.id) {
    import('@/utils/cache/smartPrefetch').then(({ recordAccess }) => {
      recordAccess('post', String(to.params.id)).catch(() => {
        // 忽略错误
      })
    })
  } else if (to.name === 'author-detail' && to.params.id) {
    import('@/utils/cache/smartPrefetch').then(({ recordAccess }) => {
      recordAccess('author', String(to.params.id)).catch(() => {
        // 忽略错误
      })
    })
  }

  const canonicalUrl = new URL(to.path, SITE_ORIGIN).toString()
  ensureLinkRel('canonical').setAttribute('href', canonicalUrl)
  ensureMetaProperty('og:url').setAttribute('content', canonicalUrl)
  ensureMetaName('twitter:url').setAttribute('content', canonicalUrl)

  ensureMetaProperty('og:title').setAttribute('content', nextTitle)
  ensureMetaName('twitter:title').setAttribute('content', nextTitle)

  if (defaultDescription === undefined) {
    defaultDescription = (
      document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    )?.content
  }

  const description =
    typeof to.meta.description === 'string' ? to.meta.description : defaultDescription
  if (description) {
    ensureMetaName('description').setAttribute('content', description)
    ensureMetaProperty('og:description').setAttribute('content', description)
    ensureMetaName('twitter:description').setAttribute('content', description)
  }
})

export default router
