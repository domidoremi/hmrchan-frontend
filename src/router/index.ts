/**
 * 路由配置文件
 *
 * 主要功能：
 * - 定义应用所有路由规则
 * - 实现路由懒加载优化首屏性能
 * - 配置路由守卫处理认证和权限
 * - 实现智能预加载提升用户体验
 * - 配置滚动行为控制页面切换效果
 */

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores'

/** 最后访问路由的 sessionStorage 存储键 */
const LAST_VISITED_ROUTE_KEY = 'hmrchan:last-route'

/**
 * 路由配置数组
 *
 * 所有路由组件采用懒加载方式导入，减少初始包体积
 * 路由按优先级分为三类：高优先级（核心页面）、中优先级（常用页面）、低优先级（辅助页面）
 */
export const routes: RouteRecordRaw[] = [
  /** ========== 核心页面路由（高优先级） ========== */
  /**
   * 首页路由
   * 应用的主入口页面，展示推荐内容
   */
  {
    path: '/',
    name: 'home',
    component: () => import(/* webpackChunkName: "page-homepage" */ '@/views/HomePage.vue'),
    meta: {
      title: 'Home',
      preload: true,
      priority: 'high',
    },
  },

  /**
   * 探索页路由
   * 用户浏览和发现新内容的页面
   */
  {
    path: '/explore',
    name: 'explore',
    component: () => import(/* webpackChunkName: "page-explorepage" */ '@/views/ExplorePage.vue'),
    meta: {
      title: 'Explore',
      preload: true,
      priority: 'high',
    },
  },

  /**
   * 帖子列表路由
   * 展示所有帖子的列表页面
   */
  {
    path: '/posts',
    name: 'posts',
    component: () => import(/* webpackChunkName: "page-postsview" */ '@/views/PostsView.vue'),
    meta: {
      title: 'Posts',
      preload: true,
      priority: 'high',
    },
  },

  /** ========== 常用功能路由（中优先级） ========== */
  /**
   * 搜索页路由
   * 提供内容搜索功能
   */
  {
    path: '/search',
    name: 'search',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/SearchPage.vue'),
    meta: {
      title: 'Search',
      preload: false,
      priority: 'medium',
    },
  },

  /**
   * 登录页路由
   * 用户登录入口，仅访客可访问
   */
  {
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/LoginPage.vue'),
    meta: {
      title: 'Login',
      guest: true,
      preload: false,
      priority: 'medium',
    },
  },

  /**
   * 帖子详情路由
   * 展示单个帖子的详细内容
   */
  {
    path: '/posts/:id',
    name: 'post-detail',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PostDetailPage.vue'),
    meta: {
      title: 'Post Detail',
      preload: false,
      priority: 'medium',
    },
  },

  /**
   * 收藏页路由
   * 展示用户收藏的内容，需要登录
   */
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/FavoritesPage.vue'),
    meta: {
      title: 'Favorites',
      requiresAuth: true,
      preload: false,
      priority: 'medium',
    },
  },

  /**
   * 个人资料路由
   * 展示和编辑用户个人信息，需要登录
   */
  {
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/ProfilePage.vue'),
    meta: {
      title: 'Profile',
      requiresAuth: true,
      preload: false,
      priority: 'medium',
    },
  },

  /** ========== 辅助功能路由（低优先级） ========== */

  /**
   * 注册页路由
   * 新用户注册入口，仅访客可访问
   */
  {
    path: '/register',
    name: 'register',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/RegisterPage.vue'),
    meta: {
      title: 'Register',
      guest: true,
      preload: false,
      priority: 'low',
    },
  },

  /**
   * 作者列表路由
   * 展示所有作者信息
   */
  {
    path: '/authors',
    name: 'authors',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/AuthorsPage.vue'),
    meta: {
      title: 'Authors',
      preload: false,
      priority: 'low',
    },
  },

  /**
   * 设置页路由
   * 应用设置和配置
   */
  {
    path: '/settings',
    name: 'settings',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      preload: false,
      priority: 'low',
    },
  },

  /**
   * 开发工具路由
   * 开发调试工具页面
   */
  {
    path: '/dev-tools',
    name: 'dev-tools',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/DevToolsPage.vue'),
    meta: {
      title: 'Developer Tools',
      preload: false,
      priority: 'low',
    },
  },

  /**
   * 偏好设置路由
   * 用户个性化偏好配置
   */
  {
    path: '/preferences',
    name: 'preferences',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PreferencesPage.vue'),
    meta: {
      title: 'Preferences',
      preload: false,
      priority: 'low',
    },
  },

  /**
   * 隐私政策路由
   * 展示应用隐私政策
   */
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/PrivacyPage.vue'),
    meta: {
      title: 'Privacy Policy',
      preload: false,
      priority: 'low',
    },
  },

  /** ========== 错误处理路由 ========== */

  /**
   * 404 页面路由
   * 捕获所有未匹配的路径
   */
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import(/* webpackChunkName: "pages-other" */ '@/views/NotFoundPage.vue'),
    meta: {
      title: '404',
      preload: false,
      priority: 'low',
    },
  },
]

/**
 * 创建路由实例
 *
 * 配置项说明：
 * - history: 使用 HTML5 History 模式
 * - routes: 路由配置数组
 * - scrollBehavior: 自定义滚动行为
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,

  /**
   * 滚动行为配置
   *
   * 控制路由切换时页面的滚动位置，提供三种场景的处理：
   * 1. 浏览器前进/后退：恢复用户之前的滚动位置
   * 2. 锚点导航：滚动到指定的页面元素
   * 3. 普通导航：滚动到页面顶部
   *
   * @param to - 目标路由对象
   * @param _from - 来源路由对象（未使用）
   * @param savedPosition - 浏览器记录的滚动位置（前进/后退时存在）
   * @returns 滚动位置配置对象
   */
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return {
        ...savedPosition,
        behavior: 'smooth',
      }
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    return {
      top: 0,
      behavior: 'smooth',
    }
  },
})

/**
 * 全局前置守卫
 *
 * 在每次路由跳转前执行，处理以下逻辑：
 * 1. 保存用户访问历史，用于登录后返回
 * 2. 为登录页自动添加重定向参数
 * 3. 更新浏览器标签页标题
 * 4. 检查需要认证的页面，未登录则跳转登录页
 * 5. 检查访客专用页面，已登录则跳转首页
 *
 * @param to - 目标路由对象
 * @param from - 来源路由对象
 * @param next - 路由导航函数，必须调用以继续导航
 */
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

  const appName = import.meta.env.VITE_APP_NAME || 'himeri chan'
  if (to.meta.title) {
    document.title = `${to.meta.title} - ${appName}`
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }

  next()
})

/**
 * 全局后置钩子
 *
 * 在路由跳转完成后执行，处理以下逻辑：
 * 1. 保存当前路由到 sessionStorage
 * 2. 触发智能预加载，提前加载用户可能访问的下一个页面
 *
 * @param to - 目标路由对象
 */
router.afterEach((to) => {
  if (to.name && to.name !== 'login') {
    sessionStorage.setItem(LAST_VISITED_ROUTE_KEY, to.fullPath)
  }

  preloadCriticalRoutes(to)
})

/**
 * 预加载关键路由组件
 *
 * 根据当前访问的页面，智能预测并预加载用户可能访问的下一个页面组件
 * 采用延迟加载策略，避免影响当前页面的性能
 *
 * 工作流程：
 * 1. 根据当前路由名称获取预加载列表
 * 2. 延迟 1 秒后开始预加载（确保当前页面已完全加载）
 * 3. 遍历预加载列表，触发组件的懒加载函数
 * 4. 预加载失败时静默处理，不影响用户体验
 *
 * @param currentRoute - 当前路由对象
 */
function preloadCriticalRoutes(currentRoute: { name?: string | symbol }) {
  const routesToPreload = getRoutesToPreload(currentRoute.name)

  setTimeout(() => {
    routesToPreload.forEach((routeName) => {
      const route = routes.find((r) => r.name === routeName)
      if (route && route.component) {
        ;(route.component as () => Promise<unknown>)().catch(() => {
          console.debug(`[路由] 预加载失败: ${routeName}`)
        })
      }
    })
  }, 1000)
}

/**
 * 获取需要预加载的路由列表
 *
 * 基于用户行为分析和页面访问模式，预测用户下一步可能访问的页面
 * 例如：用户在首页时，很可能接下来访问探索页或帖子列表
 *
 * @param currentRouteName - 当前路由名称
 * @returns 需要预加载的路由名称数组
 */
function getRoutesToPreload(currentRouteName: string | symbol | undefined): string[] {
  if (!currentRouteName || typeof currentRouteName !== 'string') return []

  const preloadMap: Record<string, string[]> = {
    home: ['explore', 'posts'],
    explore: ['home', 'search'],
    posts: ['explore', 'search'],
    search: ['explore'],
    login: ['home', 'explore'],
    register: ['login'],
    'post-detail': ['explore'],
    favorites: ['explore'],
    profile: ['settings'],
    settings: ['home'],
  }

  return preloadMap[currentRouteName] || []
}

export default router
