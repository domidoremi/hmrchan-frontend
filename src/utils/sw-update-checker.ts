/**
 * Service Worker update coordination and activation flow.
 *
 * Goals:
 * - only one visible tab owns update prompts and auto-refresh
 * - protected routes/forms never hard refresh automatically
 * - public reading pages can activate and refresh after an idle window
 */

import { watch, type WatchStopHandle } from 'vue'
import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import appRouter from '@/router'
import i18n from '@/i18n'
import { useSettingsStore, useToastStore } from '@/stores'
import type { AppUpdateStrategy } from '@/stores/settings'
import { AppUpdateCoordinator, type AppUpdateCoordinatorMessage } from './app-update/coordinator'
import {
  APP_UPDATE_IDLE_WINDOW_MS,
  createAppUpdatePolicySnapshot,
  isEditableElement,
  type AppUpdateMode,
  type AppUpdatePolicySnapshot,
} from './app-update/policy'
import {
  getActiveUpdateBlockerIds,
  hasActiveUpdateBlockers,
  subscribeToUpdateBlockers,
} from './app-update/updateBlockers'
import { reportClientError, reportClientEvent } from './clientReporter'

const SW_UPDATE_DEBUG = import.meta.env.DEV || import.meta.env['VITE_ENABLE_DEBUG'] === 'true'

let isInitialized = false
let isChecking = false
let checkIntervalId: ReturnType<typeof setInterval> | null = null
let visibilityHandler: (() => void) | null = null
let controllerChangeHandler: (() => void) | null = null
let interactionCleanup: (() => void) | null = null
let blockerCleanup: (() => void) | null = null
let routeWatchStop: WatchStopHandle | null = null
let strategyWatchStop: WatchStopHandle | null = null
let coordinator: AppUpdateCoordinator | null = null
let initToken = 0

let toastStore: ReturnType<typeof useToastStore> | null = null
let settingsStore: ReturnType<typeof useSettingsStore> | null = null
let routerRef: Pick<Router, 'currentRoute'> = appRouter

let lastInteractionAt = Date.now()
let lastKnownWaitingScriptUrl: string | null = null
let pendingActivationMode: 'auto' | 'manual' | null = null
let pendingActivationScriptUrl: string | null = null
let activatedScriptUrlPendingReload: string | null = null
let autoReloadTimerId: ReturnType<typeof setTimeout> | null = null
let updateToastId: string | null = null
let lastPromptDowngradeKey: string | null = null
let lastAutoReloadBlockedKey: string | null = null
let showToastEnabled = true

export interface SwUpdateOptions {
  checkInterval?: number
  autoRefresh?: boolean
  showToast?: boolean
  router?: Pick<Router, 'currentRoute'>
  pinia?: Pinia
}

let reloadPageImpl = () => {
  window.location.reload()
}

export function reloadPageForSwActivation(): void {
  reloadPageImpl()
}

export function setReloadPageForSwActivationForTest(fn: (() => void) | null): void {
  reloadPageImpl =
    fn ||
    (() => {
      window.location.reload()
    })
}

function currentRouter(): Pick<Router, 'currentRoute'> {
  return routerRef
}

function currentToastStore(): ReturnType<typeof useToastStore> | null {
  return toastStore
}

function currentSettingsStore(): ReturnType<typeof useSettingsStore> | null {
  return settingsStore
}

function currentStrategy(): AppUpdateStrategy {
  return currentSettingsStore()?.settings.appUpdateStrategy ?? 'public-idle-refresh'
}

function currentRouteMode(): AppUpdateMode | undefined {
  return currentRouter().currentRoute.value.meta.appUpdateMode
}

function millisecondsSinceLastInteraction(now = Date.now()): number {
  return Math.max(0, now - lastInteractionAt)
}

function createPolicySnapshot(): AppUpdatePolicySnapshot {
  const activeElement = typeof document !== 'undefined' ? document.activeElement : null
  return createAppUpdatePolicySnapshot({
    routeMode: currentRouteMode(),
    strategy: currentStrategy(),
    documentVisible: typeof document !== 'undefined' && document.visibilityState === 'visible',
    documentFocused: typeof document !== 'undefined' && document.hasFocus(),
    hasEditableFocus: isEditableElement(activeElement),
    hasActiveBlockers: hasActiveUpdateBlockers(),
    blockerIds: getActiveUpdateBlockerIds(),
    millisecondsSinceLastInteraction: millisecondsSinceLastInteraction(),
  })
}

function logDebug(message: string, extra?: unknown): void {
  if (!SW_UPDATE_DEBUG) return
  if (extra === undefined) {
    console.log(`[SW Update] ${message}`)
    return
  }
  console.log(`[SW Update] ${message}`, extra)
}

function dismissUpdateToast(): void {
  if (!updateToastId) return
  currentToastStore()?.removeToast(updateToastId)
  updateToastId = null
}

function clearAutoReloadTimer(): void {
  if (!autoReloadTimerId) return
  clearTimeout(autoReloadTimerId)
  autoReloadTimerId = null
}

function resetActivationState(): void {
  pendingActivationMode = null
  pendingActivationScriptUrl = null
  activatedScriptUrlPendingReload = null
  clearAutoReloadTimer()
}

function clearUpdateUiState(): void {
  dismissUpdateToast()
  clearAutoReloadTimer()
  activatedScriptUrlPendingReload = null
}

function updateNowLabel(): string {
  return String(i18n.global.t('appUpdate.updateNow'))
}

function updateTitle(): string {
  return String(i18n.global.t('appUpdate.title'))
}

function showAvailableToast(): void {
  const store = currentToastStore()
  if (!store || updateToastId) return

  updateToastId = store.info(String(i18n.global.t('appUpdate.availableMessage')), 0, {
    title: updateTitle(),
    action: {
      label: updateNowLabel(),
      onClick: () => {
        void handleManualUpdateAction()
      },
    },
  })
}

function showActivatedNextNavigationToast(): void {
  currentToastStore()?.success(String(i18n.global.t('appUpdate.activatedNextNavigation')), 5000, {
    title: updateTitle(),
  })
}

function showAutoRefreshBlockedToast(): void {
  currentToastStore()?.info(String(i18n.global.t('appUpdate.autoRefreshBlocked')), 6000, {
    title: updateTitle(),
  })
}

function reportPromptDowngrade(scriptUrl: string, snapshot: AppUpdatePolicySnapshot): void {
  if (
    snapshot.reason === 'route-prompt' ||
    snapshot.reason === 'strategy-prompt-only' ||
    snapshot.reason === 'document-hidden'
  ) {
    return
  }

  const eventKey = `${scriptUrl}:${snapshot.reason}:${snapshot.blockerIds.join(',')}`
  if (lastPromptDowngradeKey === eventKey) return
  lastPromptDowngradeKey = eventKey

  reportClientEvent('sw.update.prompt_downgraded', {
    scriptUrl,
    strategy: snapshot.strategy,
    routeMode: snapshot.routeMode,
    reason: snapshot.reason,
    blockerIds: snapshot.blockerIds,
  })
}

function reportAutoReloadBlocked(scriptUrl: string, snapshot: AppUpdatePolicySnapshot): void {
  const eventKey = `${scriptUrl}:${snapshot.reason}:${snapshot.blockerIds.join(',')}`
  if (lastAutoReloadBlockedKey === eventKey) return
  lastAutoReloadBlockedKey = eventKey

  reportClientEvent('sw.update.auto_reload_blocked', {
    scriptUrl,
    strategy: snapshot.strategy,
    routeMode: snapshot.routeMode,
    reason: snapshot.reason,
    blockerIds: snapshot.blockerIds,
    millisecondsSinceLastInteraction: snapshot.millisecondsSinceLastInteraction,
  })
}

function handleLeaderStateChange(isLeader: boolean): void {
  if (isLeader) {
    reportClientEvent('sw.update.leader_acquired', {
      tabId: coordinator?.tabId,
    })
    void maybeHandleWaitingWorker('leader-acquired')
    if (activatedScriptUrlPendingReload) {
      refreshAutoReloadPlan()
    }
    return
  }

  reportClientEvent('sw.update.leader_lost', {
    tabId: coordinator?.tabId,
  })
  clearUpdateUiState()
}

function handleCoordinatorMessage(message: AppUpdateCoordinatorMessage): void {
  switch (message.type) {
    case 'update-available':
      lastKnownWaitingScriptUrl = message.scriptUrl
      if (coordinator?.isLeader()) {
        void maybeHandleWaitingWorker('peer-update-available')
      }
      break

    case 'activation-start':
      lastKnownWaitingScriptUrl = message.scriptUrl
      clearUpdateUiState()
      resetActivationState()
      break

    case 'activation-complete':
      lastKnownWaitingScriptUrl = null
      clearUpdateUiState()
      resetActivationState()
      break

    case 'toast-release':
      if (coordinator?.isLeader()) {
        void maybeHandleWaitingWorker(`toast-release:${message.reason}`)
      }
      break

    case 'leader-heartbeat':
      break
  }
}

function attachInteractionTracking(): void {
  const markInteraction = () => {
    lastInteractionAt = Date.now()
    if (activatedScriptUrlPendingReload) {
      refreshAutoReloadPlan()
    }
  }
  const handleFocusChange = () => {
    if (activatedScriptUrlPendingReload) {
      refreshAutoReloadPlan()
    }
    if (lastKnownWaitingScriptUrl && coordinator?.isLeader()) {
      void maybeHandleWaitingWorker('focus-change')
    }
  }

  const interactionEvents: Array<keyof DocumentEventMap> = [
    'pointerdown',
    'keydown',
    'touchstart',
    'input',
  ]

  interactionEvents.forEach((eventName) => {
    document.addEventListener(eventName, markInteraction, {
      capture: true,
      passive: eventName !== 'keydown' && eventName !== 'input',
    })
  })
  document.addEventListener('focusin', handleFocusChange, true)
  document.addEventListener('focusout', handleFocusChange, true)
  window.addEventListener('focus', handleFocusChange)
  window.addEventListener('blur', handleFocusChange)

  interactionCleanup = () => {
    interactionEvents.forEach((eventName) => {
      document.removeEventListener(eventName, markInteraction, true)
    })
    document.removeEventListener('focusin', handleFocusChange, true)
    document.removeEventListener('focusout', handleFocusChange, true)
    window.removeEventListener('focus', handleFocusChange)
    window.removeEventListener('blur', handleFocusChange)
  }
}

function isInvalidStateError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'InvalidStateError'
}

function activateWaitingWorker(
  registration: ServiceWorkerRegistration,
  mode: 'auto' | 'manual',
  snapshot: AppUpdatePolicySnapshot
): boolean {
  if (!registration.waiting || !coordinator?.isLeader()) return false

  const scriptUrl = registration.waiting.scriptURL || lastKnownWaitingScriptUrl || 'waiting'
  if (pendingActivationScriptUrl === scriptUrl) {
    return true
  }

  lastKnownWaitingScriptUrl = scriptUrl
  pendingActivationMode = mode
  pendingActivationScriptUrl = scriptUrl
  lastPromptDowngradeKey = null
  lastAutoReloadBlockedKey = null
  dismissUpdateToast()
  clearAutoReloadTimer()

  coordinator.publish({
    type: 'activation-start',
    senderTabId: coordinator.tabId,
    timestamp: Date.now(),
    scriptUrl,
    mode,
  })

  reportClientEvent(
    mode === 'auto' ? 'sw.update.waiting_auto_activated' : 'sw.update.waiting_manual_activated',
    {
      scriptUrl,
      strategy: snapshot.strategy,
      routeMode: snapshot.routeMode,
      reason: snapshot.reason,
      blockerIds: snapshot.blockerIds,
    }
  )

  registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}

function handlePromptState(
  scriptUrl: string,
  snapshot: AppUpdatePolicySnapshot,
  showToast: boolean
): void {
  if (!coordinator?.isLeader()) {
    dismissUpdateToast()
    return
  }

  reportPromptDowngrade(scriptUrl, snapshot)
  if (showToast) {
    showAvailableToast()
  }
}

function scheduleAutoReload(delayMs: number): void {
  clearAutoReloadTimer()
  autoReloadTimerId = window.setTimeout(() => {
    autoReloadTimerId = null
    refreshAutoReloadPlan()
  }, delayMs)
}

function refreshAutoReloadPlan(): void {
  if (!activatedScriptUrlPendingReload) return
  if (!coordinator?.isLeader()) {
    clearUpdateUiState()
    return
  }

  const scriptUrl = activatedScriptUrlPendingReload
  const snapshot = createPolicySnapshot()

  if (!snapshot.shouldAutoActivate) {
    reportAutoReloadBlocked(scriptUrl, snapshot)
    activatedScriptUrlPendingReload = null
    clearAutoReloadTimer()
    showAutoRefreshBlockedToast()
    return
  }

  if (snapshot.canAutoReload) {
    activatedScriptUrlPendingReload = null
    clearAutoReloadTimer()
    reportClientEvent('sw.update.auto_reload_executed', {
      scriptUrl,
      strategy: snapshot.strategy,
      routeMode: snapshot.routeMode,
      millisecondsSinceLastInteraction: snapshot.millisecondsSinceLastInteraction,
    })
    reloadPageForSwActivation()
    return
  }

  const remainingDelayMs = Math.max(
    APP_UPDATE_IDLE_WINDOW_MS - snapshot.millisecondsSinceLastInteraction,
    0
  )
  scheduleAutoReload(remainingDelayMs)
}

function handleActivatedWorker(scriptUrl: string, mode: 'auto' | 'manual'): void {
  if (!coordinator?.isLeader()) {
    clearUpdateUiState()
    return
  }

  const snapshot = createPolicySnapshot()
  if (snapshot.shouldAutoActivate) {
    activatedScriptUrlPendingReload = scriptUrl
    refreshAutoReloadPlan()
    return
  }

  activatedScriptUrlPendingReload = null
  clearAutoReloadTimer()

  if (mode === 'manual') {
    showActivatedNextNavigationToast()
    return
  }

  reportAutoReloadBlocked(scriptUrl, snapshot)
  showAutoRefreshBlockedToast()
}

async function checkForUpdates(showToast: boolean): Promise<void> {
  if (isChecking || !('serviceWorker' in navigator)) return
  isChecking = true

  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
    if (!registration) return
    if (!registration.active && !registration.installing && !registration.waiting) return

    try {
      await registration.update()
    } catch (error) {
      if (isInvalidStateError(error)) {
        logDebug('Update already in progress')
        return
      }
      throw error
    }

    if (!registration.waiting) {
      if (!pendingActivationMode) {
        lastKnownWaitingScriptUrl = null
      }
      return
    }

    const scriptUrl = registration.waiting.scriptURL || 'waiting'
    const isFirstSeen = lastKnownWaitingScriptUrl !== scriptUrl
    lastKnownWaitingScriptUrl = scriptUrl

    if (coordinator?.isLeader()) {
      if (isFirstSeen) {
        coordinator.publish({
          type: 'update-available',
          senderTabId: coordinator.tabId,
          timestamp: Date.now(),
          scriptUrl,
        })
        reportClientEvent('sw.update.available', {
          scriptUrl,
          strategy: currentStrategy(),
          routeMode: currentRouteMode() ?? 'auto',
        })
      }

      const snapshot = createPolicySnapshot()
      if (snapshot.shouldAutoActivate) {
        activateWaitingWorker(registration, 'auto', snapshot)
      } else {
        handlePromptState(scriptUrl, snapshot, showToast)
      }
    }
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Check failed:', error)
    }
    reportClientError('sw.update.check_failed', error)
  } finally {
    isChecking = false
  }
}

async function maybeHandleWaitingWorker(reason: string): Promise<void> {
  if (!coordinator?.isLeader()) return
  logDebug(`Re-evaluating waiting worker (${reason})`)
  await checkForUpdates(showToastEnabled)
}

async function handleManualUpdateAction(): Promise<void> {
  if (!('serviceWorker' in navigator) || !coordinator?.isLeader()) return

  const registration =
    (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready)
  if (!registration?.waiting) return

  const snapshot = createPolicySnapshot()
  activateWaitingWorker(registration, 'manual', snapshot)
}

function attachReactiveReevaluation(showToast: boolean): void {
  routeWatchStop = watch(
    () => currentRouter().currentRoute.value.fullPath,
    () => {
      if (lastKnownWaitingScriptUrl && coordinator?.isLeader()) {
        void checkForUpdates(showToast)
      }
      if (activatedScriptUrlPendingReload) {
        refreshAutoReloadPlan()
      }
    }
  )

  strategyWatchStop = watch(
    () => currentStrategy(),
    () => {
      if (lastKnownWaitingScriptUrl && coordinator?.isLeader()) {
        void checkForUpdates(showToast)
      }
      if (activatedScriptUrlPendingReload) {
        refreshAutoReloadPlan()
      }
    }
  )

  blockerCleanup = subscribeToUpdateBlockers(() => {
    if (lastKnownWaitingScriptUrl && coordinator?.isLeader()) {
      void checkForUpdates(showToast)
    }
    if (activatedScriptUrlPendingReload) {
      refreshAutoReloadPlan()
    }
  })
}

export function disposeSwUpdateChecker(): void {
  if (!isInitialized) return
  initToken += 1

  if (checkIntervalId) {
    clearInterval(checkIntervalId)
    checkIntervalId = null
  }

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
    visibilityHandler = null
  }

  if (controllerChangeHandler && 'serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
    controllerChangeHandler = null
  }

  interactionCleanup?.()
  interactionCleanup = null
  blockerCleanup?.()
  blockerCleanup = null
  routeWatchStop?.()
  routeWatchStop = null
  strategyWatchStop?.()
  strategyWatchStop = null
  coordinator?.stop()
  coordinator = null

  clearUpdateUiState()
  resetActivationState()
  isInitialized = false
  isChecking = false
  lastKnownWaitingScriptUrl = null
  lastPromptDowngradeKey = null
  lastAutoReloadBlockedKey = null
  showToastEnabled = true
  toastStore = null
  settingsStore = null
  routerRef = appRouter
}

export function initSwUpdateChecker(options: SwUpdateOptions = {}): void {
  if (isInitialized) return
  isInitialized = true
  const token = ++initToken
  const { checkInterval = 30 * 60 * 1000, showToast = true, router, pinia } = options

  if (!('serviceWorker' in navigator)) {
    reportClientEvent('sw.update.unsupported')
    return
  }

  routerRef = router ?? appRouter
  settingsStore = useSettingsStore(pinia)
  toastStore = useToastStore(pinia)
  showToastEnabled = showToast
  lastInteractionAt = Date.now()

  coordinator = new AppUpdateCoordinator({
    onLeadershipChange: handleLeaderStateChange,
    onMessage: handleCoordinatorMessage,
  })
  coordinator.start()

  attachInteractionTracking()
  attachReactiveReevaluation(showToast)

  navigator.serviceWorker.ready
    .then(() => {
      if (!isInitialized || token !== initToken) return

      controllerChangeHandler = () => {
        const nextControllerScriptUrl = navigator.serviceWorker.controller?.scriptURL ?? null
        logDebug('controllerchange', {
          scriptUrl: nextControllerScriptUrl,
          pendingActivationMode,
          pendingActivationScriptUrl,
        })

        if (!pendingActivationMode) {
          return
        }

        const mode = pendingActivationMode
        const scriptUrl =
          pendingActivationScriptUrl ||
          nextControllerScriptUrl ||
          lastKnownWaitingScriptUrl ||
          'active'

        pendingActivationMode = null
        pendingActivationScriptUrl = null
        lastKnownWaitingScriptUrl = null
        dismissUpdateToast()

        coordinator?.publish({
          type: 'activation-complete',
          senderTabId: coordinator.tabId,
          timestamp: Date.now(),
          mode,
        })

        reportClientEvent('sw.update.activated', {
          scriptUrl,
          mode,
        })
        handleActivatedWorker(scriptUrl, mode)
      }

      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)

      checkIntervalId = setInterval(() => {
        void checkForUpdates(showToast)
      }, checkInterval)

      visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          void checkForUpdates(showToast)
        }
        if (activatedScriptUrlPendingReload) {
          refreshAutoReloadPlan()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)

      void checkForUpdates(showToast)
    })
    .catch((error) => {
      reportClientError('sw.update.ready_failed', error, undefined, { severity: 'warn' })
    })
}

export async function clearAllCaches(): Promise<boolean> {
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    return true
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Clear caches failed:', error)
    }
    return false
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false
    await registration.unregister()
    return true
  } catch (error) {
    if (SW_UPDATE_DEBUG) {
      console.error('[SW Update] Unregister failed:', error)
    }
    return false
  }
}
