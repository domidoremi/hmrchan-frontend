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
import {
  getRiskMode,
  setCurrentSecurityLevel,
  type DataSensitivity,
  type SecurityLevel,
} from '@/security/runtimeState'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { isContractResourceId } from '@/utils/contractResourceId'
import { applyPageMeta } from '@/utils/pageMeta'
import { buildSensitiveReauthRedirect, isSensitiveReauthLoginRoute } from './sensitiveReauth'

// 扩展 RouteMeta 类型，提供类型安全的路由元信息访问
declare module 'vue-router' {
  interface RouteMeta {
    title?: string | ((route: RouteLocationNormalizedLoadedGeneric) => string)
    description?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    securityLevel?: SecurityLevel
    dataSensitivity?: DataSensitivity
    appUpdateMode?: 'auto' | 'prompt'
    /** Show global footer on this route */
    showFooter?: boolean
    /** Stable view key used to preserve component instance across modal/detail URL changes */
    viewKey?: string
    /** Preserve scroll position when navigating within the same stable view */
    preserveScrollOnIntraViewNav?: boolean
    /** Allow page content to render directly under the navbar without shell padding/background */
    extendContentUnderNavbar?: boolean
  }
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
    meta: { title: 'nav.home', showFooter: true, securityLevel: 'public', dataSensitivity: 'none' },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/ExplorePage.vue'),
    meta: { title: 'nav.explore', securityLevel: 'public', dataSensitivity: 'none' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/SearchPage.vue'),
    meta: {
      title: 'nav.search',
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/post/:id',
    name: 'post-detail',
    component: () => import('@/views/PostDetailPage.vue'),
    meta: {
      title: 'nav.postDetail',
      securityLevel: 'public',
      dataSensitivity: 'none',
      extendContentUnderNavbar: true,
    },
    beforeEnter: (to, _, next) => {
      const id = to.params['id'] as string | undefined
      if (id && isContractResourceId(id)) {
        next()
      } else {
        next({ path: '/explore' })
      }
    },
  },
  {
    path: '/authors',
    name: 'authors',
    component: () => import('@/views/AuthorsPage.vue'),
    meta: { title: 'nav.authors', securityLevel: 'public', dataSensitivity: 'none' },
  },
  {
    path: '/community',
    component: () => import('@/layouts/CommunityLayout.vue'),
    meta: {
      title: 'community.title',
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
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
        meta: {
          title: 'community.recentDiscussions',
          appUpdateMode: 'auto',
          securityLevel: 'public',
          dataSensitivity: 'none',
        },
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
    meta: { title: 'nav.authorDetail', securityLevel: 'public', dataSensitivity: 'none' },
  },
  {
    path: '/users/:id',
    name: 'user-public-profile',
    component: () => import('@/views/UserPublicProfilePage.vue'),
    meta: {
      title: 'nav.userProfile',
      requiresAuth: true,
      appUpdateMode: 'prompt',
      securityLevel: 'authenticated',
      dataSensitivity: 'profile',
    },
  },
  {
    path: '/profile',
    component: () => import('@/layouts/ProfileLayout.vue'),
    meta: {
      requiresAuth: true,
      appUpdateMode: 'prompt',
      securityLevel: 'authenticated',
      dataSensitivity: 'profile',
    },
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('@/views/ProfilePage.vue'),
        meta: { title: 'nav.profile', securityLevel: 'authenticated', dataSensitivity: 'profile' },
      },
      {
        path: 'notifications',
        name: 'profile-notifications',
        component: () => import('@/views/ProfileNotificationsPage.vue'),
        meta: {
          title: 'profile.tabs.notifications',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'security',
        name: 'profile-security',
        component: () => import('@/views/ProfileSecurityPage.vue'),
        meta: {
          title: 'profile.securityHubTitle',
          securityLevel: 'sensitive',
          dataSensitivity: 'security',
        },
      },
      {
        path: 'devices',
        name: 'profile-devices',
        redirect: {
          name: 'profile-security',
          hash: '#devices',
        },
        meta: {
          title: 'profile.securityHubTitle',
          securityLevel: 'sensitive',
          dataSensitivity: 'security',
        },
      },
      {
        path: 'settings',
        name: 'profile-settings',
        component: () => import('@/views/ProfileSettingsPage.vue'),
        meta: {
          title: 'nav.profileSettings',
          securityLevel: 'sensitive',
          dataSensitivity: 'security',
        },
      },
      {
        path: 'favorites',
        name: 'profile-favorites',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'favorites' },
        meta: {
          title: 'profile.tabs.favorites',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'comments',
        name: 'profile-comments',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'comments' },
        meta: {
          title: 'profile.tabs.comments',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'likes',
        name: 'profile-likes',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'likes' },
        meta: {
          title: 'profile.tabs.likes',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'comment-favorites',
        name: 'profile-comment-favorites',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'comment-favorites' },
        meta: {
          title: 'profile.tabs.commentFavorites',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'history',
        name: 'profile-history',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'history' },
        meta: {
          title: 'profile.tabs.history',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'reports',
        name: 'profile-reports',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'reports' },
        meta: {
          title: 'profile.tabs.reports',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'security-activity',
        name: 'profile-security-activity',
        redirect: {
          name: 'profile-security',
          hash: '#activity',
        },
        meta: {
          title: 'profile.securityHubTitle',
          securityLevel: 'sensitive',
          dataSensitivity: 'security',
        },
      },
      {
        path: 'followers',
        name: 'profile-followers',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'followers' },
        meta: {
          title: 'profile.tabs.followers',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'following',
        name: 'profile-following',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'following' },
        meta: {
          title: 'profile.tabs.following',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
      {
        path: 'blocked',
        name: 'profile-blocked',
        component: () => import('@/views/profile/ProfileSectionPage.vue'),
        props: { sectionId: 'blocked' },
        meta: {
          title: 'profile.tabs.blocked',
          securityLevel: 'authenticated',
          dataSensitivity: 'profile',
        },
      },
    ],
  },
  {
    path: '/favorites',
    redirect: (to) => ({
      path: '/profile/favorites',
      query: to.query,
      hash: to.hash,
    }),
  },
  {
    path: '/settings/profile',
    redirect: '/profile/settings',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: {
      title: 'nav.login',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/views/AuthCallbackPage.vue'),
    meta: {
      title: 'auth.callback.title',
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/auth/passkeys/recovery',
    name: 'passkey-recovery',
    component: () => import('@/views/PasskeyRecoveryPage.vue'),
    meta: {
      title: 'auth.passkeyRecovery.title',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/auth/passkeys/recovery/:id',
    name: 'passkey-recovery-detail',
    component: () => import('@/views/PasskeyRecoveryStatusPage.vue'),
    meta: {
      title: 'auth.passkeyRecovery.statusTitle',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterPage.vue'),
    meta: {
      title: 'nav.register',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordPage.vue'),
    meta: {
      title: 'email.forgotPasswordTitle',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordPage.vue'),
    meta: {
      title: 'email.resetPasswordTitle',
      guestOnly: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/views/VerifyEmailPage.vue'),
    meta: {
      title: 'email.verifyTitle',
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactPage.vue'),
    meta: {
      title: 'nav.contact',
      showFooter: true,
      appUpdateMode: 'prompt',
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/schedule',
    name: 'schedule',
    component: () => import('@/views/SchedulePage.vue'),
    meta: {
      title: 'nav.schedule',
      viewKey: 'schedule',
      preserveScrollOnIntraViewNav: true,
      securityLevel: 'public',
      dataSensitivity: 'none',
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
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutPage.vue'),
    meta: {
      title: 'nav.about',
      showFooter: true,
      securityLevel: 'public',
      dataSensitivity: 'none',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: { title: 'error.notFound', securityLevel: 'public', dataSensitivity: 'none' },
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
  const guardedResourceRoutes = new Set([
    'post-detail',
    'author-detail',
    'discussion-detail',
    'user-public-profile',
    'passkey-recovery-detail',
  ])
  if (typeof to.name === 'string' && guardedResourceRoutes.has(to.name)) {
    const resourceId = Array.isArray(to.params.id) ? to.params.id[0] : to.params.id
    if (!isContractResourceId(resourceId)) {
      return {
        name: 'not-found',
        params: toNotFoundParams(to.path),
        query: to.query,
        hash: to.hash,
      }
    }
  }

  const securityLevel = to.meta.securityLevel ?? (to.meta.requiresAuth ? 'authenticated' : 'public')
  const needsProtectedAuthState = securityLevel !== 'public'
  const authStore = needsProtectedAuthState
    ? await ensureAuthStoreLoaded({ initialize: true })
    : to.meta.guestOnly
      ? await ensureAuthStoreLoaded({ initialize: false })
      : null
  const isAuthenticated = authStore?.isAuthenticated ?? false

  // 需要认证的页面
  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (securityLevel === 'authenticated' && isAuthenticated) {
    await authStore.ensureFreshAuthz('authenticated')
  }

  if (securityLevel === 'sensitive') {
    if (!isAuthenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      }
    }

    if (getRiskMode() === 'degraded') {
      return buildSensitiveReauthRedirect(to)
    }

    const allowed = await authStore.ensureFreshAuthz('sensitive')
    if (!allowed) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      }
    }
  }

  // 仅游客可访问的页面（登录、注册）
  if (to.meta.guestOnly && isAuthenticated && !isSensitiveReauthLoginRoute(to)) {
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
  setCurrentSecurityLevel(
    to.meta.securityLevel ?? (to.meta.requiresAuth ? 'authenticated' : 'public')
  )
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
