/**
 * Vue Router Configuration
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

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
router.beforeEach((to, _from, next) => {
  // 延迟导入以避免循环依赖
  import('@/stores/auth').then(({ useAuthStore }) => {
    const authStore = useAuthStore()
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
})

export default router
