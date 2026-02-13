/**
 * 页面标题管理
 *
 * 路由级标题由 router/index.ts afterEach 统一管理。
 * 本 composable 仅供需要动态覆盖标题的页面使用（如 PostDetailPage）。
 */

const APP_NAME = 'MomiChan'
const SEPARATOR = ' · '

/**
 * 提供 updateTitle 方法，用于在页面内动态设置标题
 * （例如帖子详情页加载完数据后更新标题）
 */
export function usePageTitle() {
  function updateTitle(pageTitle?: string) {
    if (pageTitle) {
      document.title = `${pageTitle}${SEPARATOR}${APP_NAME}`
    }
  }

  return { updateTitle }
}

/**
 * 设置带有未读数量的标题（用于通知）
 */
export function usePageTitleWithBadge() {
  let unreadCount = 0

  function setUnreadCount(count: number) {
    unreadCount = Math.max(0, count)
    updateTitleWithBadge()
  }

  function updateTitleWithBadge(baseTitle?: string) {
    const prefix = unreadCount > 0 ? `(${unreadCount}) ` : ''
    const title = baseTitle || document.title.replace(/^\(\d+\)\s/, '')
    document.title = `${prefix}${title}`
  }

  return {
    setUnreadCount,
    updateTitle: updateTitleWithBadge,
  }
}
