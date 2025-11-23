import type { Router } from 'vue-router'

/**
 * 统一的 Router 存取模块
 *
 * 作用：
 * - 避免在 api 客户端等底层模块直接引用 router，产生循环依赖
 * - 通过 setRouter 在应用初始化时注入 router 实例
 * - 通过 getRouter 在任意模块中安全获取 router 并进行导航
 */
let routerInstance: Router | null = null

export function setRouter(router: Router) {
  routerInstance = router
}

export function getRouter(): Router | null {
  return routerInstance
}
