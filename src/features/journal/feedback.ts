import type { useToastStore } from '@/stores/toast'
import type { JournalFeedbackAdapter } from './runtime'
import { useJournalOperationScope } from './useJournalOperationScope'

// Only ordinary request feedback is delegated to the Journal owner.
// Authentication, challenge, integrity, trust and rate handling stay in client.
export const journalFavoriteFeedback = { skipErrorToast: true } as const

export interface SessionJournalFeedbackAdapter extends JournalFeedbackAdapter {
  reset(): void
  dispose(): void
  readonly active: boolean
  readonly ownedIds: readonly string[]
}

export function useJournalFeedbackScope(
  identity: () => string | undefined,
  feedback: SessionJournalFeedbackAdapter
) {
  let principalId = identity()
  return useJournalOperationScope(identity, () => {
    const nextPrincipalId = identity()
    if (principalId !== undefined || nextPrincipalId !== undefined) feedback.reset()
    principalId = nextPrincipalId
  })
}

export function createJournalFeedbackAdapter(
  store: ReturnType<typeof useToastStore>
): SessionJournalFeedbackAdapter {
  const createSource = () => ({ active: true, ids: new Set<string>() })
  let source = createSource()
  let disposed = false

  function prune() {
    const current = new Set(store.toasts.map((toast) => toast.id))
    for (const id of source.ids) if (!current.has(id)) source.ids.delete(id)
  }
  function invalidate() {
    source.active = false
    for (const id of source.ids) store.removeToast(id)
    source.ids.clear()
  }

  return {
    get active() {
      return !disposed && source.active
    },
    get ownedIds() {
      prune()
      return [...source.ids]
    },
    show(message, action, options) {
      if (disposed) return
      prune()
      const owner = source
      const id = store.addToast(options?.type ?? 'info', message, options?.duration, {
        ...(options?.title === undefined ? {} : { title: options.title }),
        ...(action === undefined
          ? {}
          : {
              action: {
                label: action.label,
                onClick: () => (owner.active ? action.run() : undefined),
              },
            }),
      })
      owner.ids.add(id)
    },
    reset() {
      if (disposed) return
      invalidate()
      source = createSource()
    },
    dispose() {
      if (disposed) return
      disposed = true
      invalidate()
    },
  }
}
