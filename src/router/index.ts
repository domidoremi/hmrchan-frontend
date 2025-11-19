/**
 * 路由配置
 *
 * 功能：
 * - 路由懒加载
 * - 路由守卫（认证、权限）
 * - 智能预加载
 * - 滚动行为
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores'

/**
 * 最后访问路由的存储键
 */
const LAST_VISITED_ROUTE_KEY = 'hmrchan:last-route'

/**
 * 路由定义
 * 所有路由使用懒加载，提升首屏加载速度
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import(/* webpackChunkName: "page-homepage" */ '@/views/HomePage.vue'),
    meta: {
      title: 'Home',
      preload: true, // 关键路由：预加载首页
      priority: 'high', // 高优先级
    },
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import(/* webpackChunkName: "page-explorepage" */ '@/views/ExplorePage.vue'),
    meta: {
      title: 'Explore',
      preload: true, // 关键路由：预加载探索页
      priority: 'high', // 高优先级
    },
  },
  {
    path: '/posts',
    name: 'posts',
    component: () => import(/* webpackChunkName: "page-postsview" */ '@/views/PostsView.vue'),
    meta: {
      title: 'Posts',
      preload: true, // 关键路由：预加载帖子列表
      priority: 'high', // 高优先级
    },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/SearchPage.vue'),
    meta: {
      title: 'Search',
      preload: false,
      priority: 'medium', // 中优先级
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/LoginPage.vue'),
    meta: {
      title: 'Login',
      guest: true,
      preload: false,
      priority: 'medium', // 中优先级
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/RegisterPage.vue'),
    meta: {
      title: 'Register',
      guest: true,
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/posts/:id',
    name: 'post-detail',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PostDetailPage.vue'),
    meta: {
      title: 'Post Detail',
      preload: false,
      priority: 'medium', // 中优先级
    },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/FavoritesPage.vue'),
    meta: {
      title: 'Favorites',
      requiresAuth: true,
      preload: false,
      priority: 'medium', // 中优先级
    },
  },
  {
    path: '/authors',
    name: 'authors',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/AuthorsPage.vue'),
    meta: {
      title: 'Authors',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/ProfilePage.vue'),
    meta: {
      title: 'Profile',
      requiresAuth: true,
      preload: false,
      priority: 'medium', // 中优先级
    },
  },
  {
    path: '/dev-tools',
    name: 'dev-tools',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/DevToolsPage.vue'),
    meta: {
      title: 'Developer Tools',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/preferences',
    name: 'preferences',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PreferencesPage.vue'),
    meta: {
      title: 'Preferences',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PrivacyPage.vue'),
    meta: {
      title: 'Privacy Policy',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/NotFoundPage.vue'),
    meta: {
      title: '404',
      preload: false,
      priority: 'low', // 低优先级
    },
  },
]

/**
 * 创建路由实例
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,

  /**
   * 滚动行为配置
   * 控制路由切换时的滚动位置
   */
  scrollBehavior(to, from, savedPosition) {
    // 浏览器前进/后退：恢复之前的滚动位置
    if (savedPosition) {
      return {
        ...savedPosition,
        behavior: 'smooth',
      }
    }

    // 锚点跳转：滚动到指定元素
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    // 默认：滚动到页面顶部
    return {
      top: 0,
      behavior: 'smooth',
    }
  },
})

/**
 * 全局前置守卫
 * 处理认证、权限和页面标题
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 保存最后访问的路由（用于登录后跳转）
  if (from.name && from.name !== 'login') {
    sessionStorage.setItem(LAST_VISITED_ROUTE_KEY, from.fullPath)
  }

  // 登录页：自动添加重定向参数
  if (to.name === 'login' && !to.query.redirect) {
    const historicalRoute = sessionStorage.getItem(LAST_VISITED_ROUTE_KEY) || '/'
    const redirectTarget = from.name && from.name !== 'login' ? from.fullPath : historicalRoute

    next({
      name: 'login',
      query: {
        ...to.query,
        redirect: redirectTarget,
      },
      replace: true,
    })
    return
  }

  // 更新页面标题
  const appName = import.meta.env.VITE_APP_NAME || 'himeri chan'
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${appName}`
  }

  // 认证检查：需要登录的页面
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // 访客页面：已登录用户重定向到首页
  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

/**
 * 全局后置钩子
 * 路由切换完成后执行
 */
router.afterEach((to) => {
  // 保存当前路由
  if (to.name && to.name !== 'login') {
    sessionStorage.setItem(LAST_VISITED_ROUTE_KEY, to.fullPath)
  }

  // 智能预加载下一个可能访问的路由
  preloadCriticalRoutes(to)
})

/**
 * ============================================
 * 路由预加载逻辑
 * ============================================
 */

/**
 * 预加载关键路由组件
 * 在用户访问某个页面后，智能预加载可能访问的下一个页面
 *
 * @param currentRoute - 当前路由对象
 */
function preloadCriticalRoutes(currentRoute: { name?: string | symbol }) {
  const routesToPreload = getRoutesToPreload(currentRoute.name)

  // 延迟 1 秒后开始预加载，避免影响当前页面性能
  setTimeout(() => {
    routesToPreload.forEach((routeName) => {
      const route = routes.find((r) => r.name === routeName)
      if (route && route.component) {
        // 触发组件懒加载
        ;(route.component as () => Promise<unknown>)().catch(() => {
          // 预加载失败不影响用户体验，仅记录调试信息
          console.debug(`[路由] 预加载失败: ${routeName}`)
        })
      }
    })
  }, 1000)
}

/**
 * 根据当前路由确定需要预加载的路由
 * 基于用户行为模式预测下一步可能访问的页面
 *
 * @param currentRouteName - 当前路由名称
 * @returns 需要预加载的路由名称数组
 */
function getRoutesToPreload(currentRouteName: string | symbol | undefined): string[] {
  if (!currentRouteName || typeof currentRouteName !== 'string') return []

  /**
   * 预加载策略映射表
   * 根据用户常见的浏览路径预测下一步操作
   */
  const preloadMap: Record<string, string[]> = {
    home: ['explore', 'posts'], // 首页 → 探索页、帖子列表
    explore: ['home', 'search'], // 探索页 → 首页、搜索
    posts: ['explore', 'search'], // 帖子列表 → 探索页、搜索
    search: ['explore'], // 搜索页 → 探索页
    login: ['home', 'explore'], // 登录页 → 首页、探索页
    register: ['login'], // 注册页 → 登录页
    'post-detail': ['explore'], // 帖子详情 → 探索页
    favorites: ['explore'], // 收藏页 → 探索页
    profile: ['settings'], // 个人资料 → 设置页
    settings: ['home'], // 设置页 → 首页
  }

  return preloadMap[currentRouteName] || []
}

export default router
