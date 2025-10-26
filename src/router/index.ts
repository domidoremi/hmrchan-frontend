import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 定义路由
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: {
      title: 'Home',
    },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('@/views/ExplorePage.vue'),
    meta: {
      title: 'Explore',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginPage.vue'),
    meta: {
      title: 'Login',
      guest: true,
    },
  },
  {
    path: '/posts/:id',
    name: 'post-detail',
    component: () => import('@/views/PostDetailPage.vue'),
    meta: {
      title: 'Post Detail',
    },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/views/FavoritesPage.vue'),
    meta: {
      title: 'Favorites',
      requiresAuth: true,
    },
  },
  {
    path: '/authors',
    name: 'authors',
    component: () => import('@/views/AuthorsPage.vue'),
    meta: {
      title: 'Authors',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: {
      title: '404',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 更新页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - HMRChan`
  }

  // 需要认证的页面
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // 已登录用户访问登录页
  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router
