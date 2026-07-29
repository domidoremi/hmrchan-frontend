import {
  idbClear,
  idbDelete,
  idbGet,
  idbGetAll,
  idbMutate,
  idbSet,
  idbUpdateFirst,
  STORES,
} from './idb'

export interface OfflineAction {
  id: string
  idempotencyKey: string
  ownerId: string
  type: 'like' | 'unlike' | 'favorite' | 'unfavorite' | 'comment'
  resourceId: string
  data?: Record<string, unknown>
  timestamp: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
  leaseId?: string
  leaseExpiresAt?: number
}

const QUEUE_STORE = STORES.OFFLINE_QUEUE
const MAX_RETRY = 3
export const OFFLINE_ACTION_LEASE_MS = 2 * 60 * 1000
let fallbackIdSequence = 0

function createOfflineActionId(type: OfflineAction['type'], resourceId: string): string {
  const timestamp = Date.now()
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${timestamp}-${(fallbackIdSequence = (fallbackIdSequence + 1) % Number.MAX_SAFE_INTEGER)}`

  return `${type}-${resourceId}-${timestamp}-${suffix}`
}

export async function addOfflineAction(
  type: OfflineAction['type'],
  resourceId: string,
  ownerId: string,
  data?: Record<string, unknown>
): Promise<string> {
  if (!ownerId.trim()) {
    throw new Error('Offline actions require an authenticated owner')
  }

  const id = createOfflineActionId(type, resourceId)

  const action: OfflineAction = {
    id,
    idempotencyKey: id,
    ownerId,
    type,
    resourceId,
    ...(data && { data }), // Only include data if defined
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  }

  await idbSet(QUEUE_STORE, action)

  if (
    'serviceWorker' in navigator &&
    'sync' in ServiceWorkerRegistration.prototype &&
    navigator.serviceWorker.controller
  ) {
    try {
      const registration = await navigator.serviceWorker.ready
      // @ts-expect-error - Background Sync API not fully typed
      await registration.sync.register('sync-offline-actions')
    } catch (error) {
      console.warn('[OfflineQueue] Background sync registration failed:', error)
    }
  }

  return id
}

export async function getPendingActions(
  ownerId: string,
  now = Date.now()
): Promise<OfflineAction[]> {
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)
  return actions.filter(
    (action) =>
      action.ownerId === ownerId &&
      action.retryCount < MAX_RETRY &&
      (action.status === 'pending' ||
        action.status === 'failed' ||
        (action.status === 'syncing' &&
          (typeof action.leaseExpiresAt !== 'number' || action.leaseExpiresAt <= now)))
  )
}

export async function claimNextOfflineAction(
  ownerId: string,
  options: { now?: number; excludeIds?: ReadonlySet<string> } = {}
): Promise<OfflineAction | undefined> {
  if (!ownerId.trim()) return undefined

  const now = options.now ?? Date.now()
  const excludedIds = options.excludeIds ?? new Set<string>()
  const leaseId = createOfflineActionId('lease' as OfflineAction['type'], ownerId)

  return idbUpdateFirst<OfflineAction>(
    QUEUE_STORE,
    (action) =>
      action.ownerId === ownerId &&
      action.retryCount < MAX_RETRY &&
      !excludedIds.has(action.id) &&
      (action.status === 'pending' ||
        action.status === 'failed' ||
        (action.status === 'syncing' &&
          (typeof action.leaseExpiresAt !== 'number' || action.leaseExpiresAt <= now))),
    (action) => ({
      ...action,
      status: 'syncing',
      leaseId,
      leaseExpiresAt: now + OFFLINE_ACTION_LEASE_MS,
    })
  )
}

export async function completeClaimedAction(id: string, leaseId: string): Promise<boolean> {
  return idbMutate<OfflineAction>(QUEUE_STORE, id, (action) => {
    if (!action || action.status !== 'syncing' || action.leaseId !== leaseId) return undefined
    return null
  })
}

export async function failClaimedAction(id: string, leaseId: string): Promise<boolean> {
  return idbMutate<OfflineAction>(QUEUE_STORE, id, (action) => {
    if (!action || action.status !== 'syncing' || action.leaseId !== leaseId) return undefined

    const nextAction = { ...action }
    delete nextAction.leaseId
    delete nextAction.leaseExpiresAt
    nextAction.status = 'failed'
    nextAction.retryCount += 1
    return nextAction
  })
}

export async function releaseClaimedAction(id: string, leaseId: string): Promise<boolean> {
  return idbMutate<OfflineAction>(QUEUE_STORE, id, (action) => {
    if (!action || action.status !== 'syncing' || action.leaseId !== leaseId) return undefined

    const nextAction = { ...action }
    delete nextAction.leaseId
    delete nextAction.leaseExpiresAt
    nextAction.status = 'pending'
    return nextAction
  })
}

export async function clearOfflineActions(): Promise<void> {
  await idbClear(QUEUE_STORE)
}

export async function updateActionStatus(
  id: string,
  status: OfflineAction['status'],
  incrementRetry = false
): Promise<void> {
  const action = await idbGet<OfflineAction>(QUEUE_STORE, id)

  if (action) {
    action.status = status
    if (incrementRetry) {
      action.retryCount++
    }
    await idbSet(QUEUE_STORE, action)
  }
}

export async function removeAction(id: string): Promise<void> {
  await idbDelete(QUEUE_STORE, id)
}

export async function cleanupFailedActions(ownerId?: string): Promise<number> {
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)
  let cleaned = 0

  const deletePromises = actions
    .filter((action) => action.retryCount >= MAX_RETRY && (!ownerId || action.ownerId === ownerId))
    .map((action) => idbDelete(QUEUE_STORE, action.id))

  await Promise.all(deletePromises)
  cleaned = deletePromises.length

  return cleaned
}

export async function getQueueStats(): Promise<{
  total: number
  pending: number
  failed: number
}> {
  const actions = await idbGetAll<OfflineAction>(QUEUE_STORE)

  return {
    total: actions.length,
    pending: actions.filter((a) => a.status === 'pending').length,
    failed: actions.filter((a) => a.status === 'failed').length,
  }
}

export async function hasPendingActions(): Promise<boolean> {
  const stats = await getQueueStats()
  return stats.pending > 0 || stats.failed > 0
}
