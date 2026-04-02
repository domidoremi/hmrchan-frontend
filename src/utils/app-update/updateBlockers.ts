import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'

const activeUpdateBlockers = new Set<string>()
const blockerListeners = new Set<() => void>()

function normalizeBlockerId(value: string): string {
  return value.trim()
}

function notifyBlockerListeners(): void {
  blockerListeners.forEach((listener) => listener())
}

export function setUpdateBlockerActive(id: string, active: boolean): void {
  const normalizedId = normalizeBlockerId(id)
  if (!normalizedId) return

  if (active) {
    const sizeBefore = activeUpdateBlockers.size
    activeUpdateBlockers.add(normalizedId)
    if (activeUpdateBlockers.size !== sizeBefore) {
      notifyBlockerListeners()
    }
    return
  }

  if (activeUpdateBlockers.delete(normalizedId)) {
    notifyBlockerListeners()
  }
}

export function hasActiveUpdateBlockers(): boolean {
  return activeUpdateBlockers.size > 0
}

export function getActiveUpdateBlockerIds(): string[] {
  return Array.from(activeUpdateBlockers).sort()
}

export function subscribeToUpdateBlockers(listener: () => void): () => void {
  blockerListeners.add(listener)
  return () => {
    blockerListeners.delete(listener)
  }
}

export function resetUpdateBlockersForTest(): void {
  activeUpdateBlockers.clear()
  blockerListeners.clear()
}

export function useUpdateBlocker(
  id: MaybeRefOrGetter<string>,
  active: MaybeRefOrGetter<boolean>
): void {
  let currentId = ''

  const stop = watch(
    () => ({ id: normalizeBlockerId(toValue(id)), active: Boolean(toValue(active)) }),
    (next, previous) => {
      if (previous?.id && previous.id !== next.id) {
        setUpdateBlockerActive(previous.id, false)
      }

      currentId = next.id
      if (!currentId) return
      setUpdateBlockerActive(currentId, next.active)
    },
    { immediate: true }
  )

  onScopeDispose(() => {
    stop()
    if (currentId) {
      setUpdateBlockerActive(currentId, false)
    }
  })
}
