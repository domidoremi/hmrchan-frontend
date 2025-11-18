import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores'

const LAST_VISITED_ROUTE_KEY = 'hmrchan:last-route'

// 定义路由 - 所有路由使用懒加载
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

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 如果是浏览器前进/后退，恢复之前的位置
    if (savedPosition) {
      return {
        ...savedPosition,
        behavior: 'smooth',
      }
    }

    // 如果有hash，滚动到对应元素
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    // 默认滚动到顶部，但使用平滑滚动
    return {
      top: 0,
      behavior: 'smooth',
    }
  },
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (from.name && from.name !== 'login') {
    sessionStorage.setItem(LAST_VISITED_ROUTE_KEY, from.fullPath)
  }

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

router.afterEach((to) => {
  if (to.name && to.name !== 'login') {
    sessionStorage.setItem(LAST_VISITED_ROUTE_KEY, to.fullPath)
  }

  // 预加载关键路由
  preloadCriticalRoutes(to)
})

// ========== 路由预加载逻辑 ==========
/**
 * 预加载关键路由组件
 * 在用户访问某个页面后，智能预加载可能访问的下一个页面
 */
function preloadCriticalRoutes(currentRoute: { name?: string | symbol }) {
  // 获取需要预加载的路由
  const routesToPreload = getRoutesToPreload(currentRoute.name)

  // 延迟预加载，避免影响当前页面性能
  setTimeout(() => {
    routesToPreload.forEach((routeName) => {
      const route = routes.find((r) => r.name === routeName)
      if (route && route.component) {
        // 触发组件懒加载
        ;(route.component as () => Promise<unknown>)().catch(() => {
          // 预加载失败不影响用户体验
          console.debug(`[Router] Failed to preload route: ${routeName}`)
        })
      }
    })
  }, 1000) // 1秒后开始预加载
}

/**
 * 根据当前路由确定需要预加载的路由
 */
function getRoutesToPreload(currentRouteName: string | symbol | undefined): string[] {
  if (!currentRouteName || typeof currentRouteName !== 'string') return []

  // 预加载策略：基于用户行为预测
  const preloadMap: Record<string, string[]> = {
    // 首页 -> 探索页、帖子列表
    home: ['explore', 'posts'],
    // 探索页 -> 首页、搜索
    explore: ['home', 'search'],
    // 帖子列表 -> 探索页、搜索
    posts: ['explore', 'search'],
    // 搜索页 -> 探索页
    search: ['explore'],
    // 登录页 -> 首页、探索页
    login: ['home', 'explore'],
    // 注册页 -> 登录页
    register: ['login'],
    // 帖子详情 -> 探索页
    'post-detail': ['explore'],
    // 收藏页 -> 探索页
    favorites: ['explore'],
    // 个人资料 -> 设置页
    profile: ['settings'],
    // 设置页 -> 首页
    settings: ['home'],
  }

  return preloadMap[currentRouteName] || []
}

export default router
