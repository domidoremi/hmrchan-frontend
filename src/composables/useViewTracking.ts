import { idbDelete, idbGet, idbSet, STORES } from '@/utils/cache/idb'
import { historyService } from '@/api'

const VIEW_RECORD_TTL = 7 * 24 * 60 * 60 * 1000

interface ViewRecord {
  key: string
  postId: string
  viewedAt: number
}

async function hasViewed(postId: string): Promise<boolean> {
  const key = `viewed:${postId}`
  const record = await idbGet<ViewRecord>(STORES.META, key)

  if (!record) return false

  if (Date.now() - record.viewedAt > VIEW_RECORD_TTL) {
    await idbDelete(STORES.META, key)
    return false
  }

  return true
}

async function markAsViewed(postId: string): Promise<void> {
  const key = `viewed:${postId}`
  const record: ViewRecord = {
    key,
    postId,
    viewedAt: Date.now(),
  }
  await idbSet(STORES.META, record)
}

export async function trackPostView(postId: string, isAuthenticated: boolean): Promise<void> {
  try {
    const viewed = await hasViewed(postId)

    if (viewed) {
      return
    }

    const tasks: Promise<void>[] = [markAsViewed(postId)]

    if (isAuthenticated) {
      tasks.push(historyService.recordBrowsing('post', postId))
    }

    await Promise.allSettled(tasks)
  } catch {}
}

export async function cleanupViewRecords(): Promise<number> {
  try {
    const { idbGetAll: getAllRecords, idbDelete: deleteRecord } = await import('@/utils/cache/idb')
    const allRecords = await getAllRecords<ViewRecord>(STORES.META)
    const expireTime = Date.now() - VIEW_RECORD_TTL
    let cleaned = 0

    for (const record of allRecords) {
      if (record.key?.startsWith('viewed:') && record.viewedAt < expireTime) {
        await deleteRecord(STORES.META, record.key)
        cleaned++
      }
    }

    return cleaned
  } catch {
    return 0
  }
}
