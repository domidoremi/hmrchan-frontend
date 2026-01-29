/**
 * 页面标题管理
 * 提供智能的浏览器 tab 标题更新
 */

import { watch, onBeforeUnmount } from 'vue'
import { useRoute, type RouteLocationNormalizedLoadedGeneric } from 'vue-router'
import { useI18n } from 'vue-i18n'

// Extend Vue Router's RouteMeta to include title
declare module 'vue-router' {
  interface RouteMeta {
    title?: string | ((route: RouteLocationNormalizedLoadedGeneric) => string)
  }
}

const APP_NAME = 'MomiChan'
const SEPARATOR = ' · '

/**
 * 设置页面标题
 */
export function usePageTitle(title?: string) {
  const route = useRoute()
  const { t } = useI18n()

  function updateTitle(newTitle?: string) {
    const pageTitle = newTitle || title

    if (pageTitle) {
      document.title = `${pageTitle}${SEPARATOR}${APP_NAME}`
    } else {
      // 根据路由自动生成标题
      const routeTitle = getRouteTitleFromMeta(route)
      if (routeTitle) {
        document.title = `${routeTitle}${SEPARATOR}${APP_NAME}`
      } else {
        document.title = `${APP_NAME} - 籾山ひめり Fan Hub`
      }
    }
  }

  function getRouteTitleFromMeta(currentRoute: typeof route): string {
    // 从路由 meta 中获取标题
    if (currentRoute.meta.title) {
      const rawTitle =
        typeof currentRoute.meta.title === 'function'
          ? currentRoute.meta.title(currentRoute)
          : String(currentRoute.meta.title)
      const translated = t(rawTitle)
      return translated !== rawTitle ? translated : rawTitle
    }

    // 根据路由名称生成标题
    const routeName = currentRoute.name?.toString()
    if (routeName) {
      const titleKey = `routes.${routeName}`
      const translated = t(titleKey)
      if (translated !== titleKey) {
        return translated
      }
    }

    return ''
  }

  // 初始设置
  updateTitle()

  // 监听路由变化
  const stopWatch = watch(
    () => route.fullPath,
    () => {
      updateTitle()
    }
  )

  onBeforeUnmount(() => {
    stopWatch()
  })

  return {
    updateTitle,
  }
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
