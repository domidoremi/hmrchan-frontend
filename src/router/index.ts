/**
 * Vue Router Configuration
 */

import { watch } from 'vue'
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteRecordRaw,
  type RouteLocationNormalizedLoadedGeneric,
} from 'vue-router'
import i18n from '@/i18n'
import { applyPageMeta } from '@/utils/pageMeta'
import { getStoredAuthSource } from '@/utils/authSource'
import LoginPage from '@/views/LoginPage.vue'
import OIDCCallbackPage from '@/views/OIDCCallbackPage.vue'
import OIDCLogoutCallbackPage from '@/views/OIDCLogoutCallbackPage.vue'
import RegisterPage from '@/views/RegisterPage.vue'
import ForgotPasswordPage from '@/views/ForgotPasswordPage.vue'
import ResetPasswordPage from '@/views/ResetPasswordPage.vue'
import VerifyEmailPage from '@/views/VerifyEmailPage.vue'

// 扩展 RouteMeta 类型，提供类型安全的路由元信息访问
declare module 'vue-router' {
  interface RouteMeta {
    title?: string | ((route: RouteLocationNormalizedLoadedGeneric) => string)
    description?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    /** Show global footer on this route */
    showFooter?: boolean
    /** Stable view key used to preserve component instance across modal/detail URL changes */
    viewKey?: string
    /** Preserve scroll position when navigating within the same stable view */
    preserveScrollOnIntraViewNav?: boolean
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

function resolveViewKey(route: RouteLocationNormalized): string | null {
  const viewKey = route.meta.viewKey
  if (typeof viewKey !== 'string') return null
  const trimmed = viewKey.trim()
  return trimmed.length > 0 ? trimmed : null
}

function shouldPreserveIntraViewNavigation(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): boolean {
  const toViewKey = resolveViewKey(to)
  if (!toViewKey || toViewKey !== resolveViewKey(from)) return false

  return Boolean(to.meta.preserveScrollOnIntraViewNav || from.meta.preserveScrollOnIntraViewNav)
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
    path: '/discussion/:id',
    redirect: (to) => ({
      name: 'discussion-detail',
      params: { id: to.params['id'] },
      query: to.query,
    }),
  },
  {
    path: '/author/:id',
    name: 'author-detail',
    component: () => import('@/views/AuthorDetailPage.vue'),
    meta: { title: 'nav.authorDetail' },
  },
  {
    path: '/users/:id',
    name: 'user-public-profile',
    component: () => import('@/views/UserPublicProfilePage.vue'),
    meta: { title: 'nav.userProfile', requiresAuth: true },
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
    component: LoginPage,
    meta: { title: 'nav.login', guestOnly: true },
  },
  {
    path: '/auth/callback',
    name: 'oidc-callback',
    component: OIDCCallbackPage,
    meta: { title: 'auth.oidc.callbackTitle' },
  },
  {
    path: '/auth/logout/callback',
    name: 'oidc-logout-callback',
    component: OIDCLogoutCallbackPage,
    meta: { title: 'auth.oidc.logoutTitle' },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage,
    meta: { title: 'nav.register', guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordPage,
    meta: { title: 'email.forgotPasswordTitle', guestOnly: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordPage,
    meta: { title: 'email.resetPasswordTitle', guestOnly: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: VerifyEmailPage,
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
    meta: {
      title: 'nav.schedule',
      viewKey: 'schedule',
      preserveScrollOnIntraViewNav: true,
    },
  },
  {
    path: '/schedule/:id',
    name: 'schedule-detail',
    component: () => import('@/views/SchedulePage.vue'),
    meta: {
      title: 'nav.schedule',
      viewKey: 'schedule',
      preserveScrollOnIntraViewNav: true,
    },
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
  scrollBehavior(to, from, savedPosition) {
    const smoothBehavior: ScrollBehavior =
      typeof document !== 'undefined' && document.documentElement.dataset.smoothScroll
        ? 'auto'
        : 'smooth'

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
    if (shouldPreserveIntraViewNavigation(to, from)) {
      return false
    }
    if (to.hash) {
      return { el: to.hash, behavior: smoothBehavior }
    }
    return { top: 0, behavior: smoothBehavior }
  },
})

// 路由守卫
router.beforeEach(async (to) => {
  const authStore = getAuthStore()

  // 仅在需要认证判断的路由等待初始化，避免阻塞公开页面首屏渲染
  if (to.meta.requiresAuth || to.meta.guestOnly) {
    await authStore.ensureAuthInitialized()
  }
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
    const authSource = authStore.user?.auth_source ?? getStoredAuthSource()
    if (authSource === 'oidc') {
      const result = await authStore.loginWithOIDC('web', to.fullPath)
      if (result.success) {
        return false
      }
    }

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

function syncRoutePageMeta(route: RouteLocationNormalizedLoadedGeneric): void {
  const titleValue =
    typeof route.meta.title === 'function' ? route.meta.title(route) : route.meta.title
  const rawTitle = titleValue ? String(titleValue) : ''
  const translatedTitle = rawTitle ? String(i18n.global.t(rawTitle)) : ''

  applyPageMeta({
    title: translatedTitle || undefined,
    description: typeof route.meta.description === 'string' ? route.meta.description : undefined,
    canonicalPath: route.path,
  })
}

router.afterEach((to) => {
  syncRoutePageMeta(to)

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
})

watch(
  () => i18n.global.locale.value,
  () => {
    const currentRoute = router.currentRoute.value
    if (!currentRoute.matched.length) return
    syncRoutePageMeta(currentRoute)
  }
)

export default router
