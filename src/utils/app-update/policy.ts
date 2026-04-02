import type { AppUpdateStrategy } from '@/stores/settings'

export type AppUpdateMode = 'auto' | 'prompt'

export const APP_UPDATE_IDLE_WINDOW_MS = 15_000

export interface AppUpdatePolicyInput {
  routeMode?: AppUpdateMode
  strategy: AppUpdateStrategy
  documentVisible: boolean
  documentFocused: boolean
  hasEditableFocus: boolean
  hasActiveBlockers: boolean
  blockerIds?: string[]
  millisecondsSinceLastInteraction: number
}

export interface AppUpdatePolicySnapshot {
  routeMode: AppUpdateMode
  strategy: AppUpdateStrategy
  documentVisible: boolean
  documentFocused: boolean
  hasEditableFocus: boolean
  hasActiveBlockers: boolean
  blockerIds: string[]
  millisecondsSinceLastInteraction: number
  shouldAutoActivate: boolean
  shouldPrompt: boolean
  canAutoReload: boolean
  reason:
    | 'strategy-prompt-only'
    | 'route-prompt'
    | 'document-hidden'
    | 'document-unfocused'
    | 'editable-focus'
    | 'active-blockers'
    | 'idle-window-pending'
    | 'auto-ready'
}

export function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false
  if (element.isContentEditable) return true

  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function createAppUpdatePolicySnapshot(
  input: AppUpdatePolicyInput
): AppUpdatePolicySnapshot {
  const routeMode = input.routeMode ?? 'auto'
  const blockerIds = [...(input.blockerIds ?? [])].sort()
  let reason: AppUpdatePolicySnapshot['reason'] = 'auto-ready'
  let shouldAutoActivate = false

  if (input.strategy === 'prompt-only') {
    reason = 'strategy-prompt-only'
  } else if (routeMode === 'prompt') {
    reason = 'route-prompt'
  } else if (!input.documentVisible) {
    reason = 'document-hidden'
  } else if (!input.documentFocused) {
    reason = 'document-unfocused'
  } else if (input.hasEditableFocus) {
    reason = 'editable-focus'
  } else if (input.hasActiveBlockers) {
    reason = 'active-blockers'
  } else {
    shouldAutoActivate = true
  }

  let canAutoReload = false
  if (shouldAutoActivate) {
    if (input.millisecondsSinceLastInteraction < APP_UPDATE_IDLE_WINDOW_MS) {
      reason = 'idle-window-pending'
    } else {
      canAutoReload = true
      reason = 'auto-ready'
    }
  }

  return {
    routeMode,
    strategy: input.strategy,
    documentVisible: input.documentVisible,
    documentFocused: input.documentFocused,
    hasEditableFocus: input.hasEditableFocus,
    hasActiveBlockers: input.hasActiveBlockers,
    blockerIds,
    millisecondsSinceLastInteraction: input.millisecondsSinceLastInteraction,
    shouldAutoActivate,
    shouldPrompt: !shouldAutoActivate,
    canAutoReload,
    reason,
  }
}
