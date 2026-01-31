/**
 * 帖子详情页导航上下文管理
 * 用于在详情页实现上下滑切换帖子
 */

export interface PostNavigationContext {
  ids: string[]
  index: number
  source?: string
  timestamp: number
}

type PostIdSource = {
  id?: string | null
  uuid?: string | null
  post_id?: string | null
}

const STORAGE_KEY = 'post-navigation-context'
const MAX_IDS = 200
const EXPIRY_MS = 30 * 60 * 1000

function extractPostId(item: PostIdSource): string | null {
  const id = item.id ?? item.uuid ?? item.post_id
  return typeof id === 'string' ? id : null
}

function normalizeIds(items: PostIdSource[]): string[] {
  return items
    .map((item) => extractPostId(item))
    .filter((id): id is string => Boolean(id))
}

export function storePostNavigationContext(
  items: PostIdSource[],
  currentId: string,
  source?: string
): void {
  if (typeof sessionStorage === 'undefined') return

  try {
    const ids = normalizeIds(items)
    if (ids.length === 0) return

    const currentIndex = ids.indexOf(currentId)
    if (currentIndex < 0) return

    let start = 0
    let end = ids.length

    if (ids.length > MAX_IDS) {
      const halfWindow = Math.floor(MAX_IDS / 2)
      start = Math.max(0, currentIndex - halfWindow)
      end = Math.min(ids.length, start + MAX_IDS)
      start = Math.max(0, end - MAX_IDS)
    }

    const trimmedIds = ids.slice(start, end)

    const context: PostNavigationContext = {
      ids: trimmedIds,
      index: currentIndex - start,
      ...(source ? { source } : {}),
      timestamp: Date.now(),
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context))
  } catch (error) {
    console.warn('[postNavigation] Failed to store context:', error)
  }
}

export function getPostNavigationContext(): PostNavigationContext | null {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PostNavigationContext>
    if (!Array.isArray(parsed.ids) || typeof parsed.index !== 'number') return null

    if (parsed.ids.length === 0 || parsed.index < 0 || parsed.index >= parsed.ids.length) {
      return null
    }

    const timestamp = parsed.timestamp ?? Date.now()
    if (Date.now() - timestamp > EXPIRY_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      ids: parsed.ids as string[],
      index: parsed.index,
      ...(parsed.source ? { source: parsed.source } : {}),
      timestamp,
    }
  } catch (error) {
    console.warn('[postNavigation] Failed to load context:', error)
    return null
  }
}

export function updatePostNavigationIndex(nextIndex: number): void {
  const context = getPostNavigationContext()
  if (!context) return

  if (nextIndex < 0 || nextIndex >= context.ids.length) return

  try {
    const updated: PostNavigationContext = {
      ...context,
      index: nextIndex,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.warn('[postNavigation] Failed to update context:', error)
  }
}

export function clearPostNavigationContext(): void {
  if (typeof sessionStorage === 'undefined') return

  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('[postNavigation] Failed to clear context:', error)
  }
}
