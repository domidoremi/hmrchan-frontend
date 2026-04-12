<template>
  <div
    ref="containerRef"
    class="turnstile-container"
    :class="[`turnstile-container--${props.size}`, containerClass]"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import {
  classifyTurnstileError,
  describeTurnstileError,
  extractTurnstileErrorCode,
  TURNSTILE_HOSTNAME_MISMATCH_CODE,
} from '@/utils/turnstile'
import type { TurnstileWidgetStatus } from '@/utils/turnstileWidgetStatus'

export interface TurnstileWidgetProps {
  siteKey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  action?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
  execution?: 'render' | 'execute'
  autoExecute?: boolean
}

const props = withDefaults(defineProps<TurnstileWidgetProps>(), {
  theme: 'auto',
  size: 'normal',
  appearance: 'always',
  execution: 'render',
  autoExecute: false,
})

const emit = defineEmits<{
  verify: [token: string]
  expire: []
  error: [error: Error]
  status: [status: TurnstileWidgetStatus]
}>()

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const widgetId = ref<string | null>(null)
const containerClass = computed(() =>
  props.execution === 'execute' || props.appearance === 'execute'
    ? 'turnstile-container--invisible'
    : ''
)
let isUnmounted = false
let previousOnloadHandler: (() => void) | null = null
let turnstileOnloadHandler: (() => void) | null = null
let mountDelayTimer: ReturnType<typeof setTimeout> | null = null
let mountDelayResolve: (() => void) | null = null
let turnstilePollRaf: number | null = null
let turnstilePollReject: ((reason?: Error) => void) | null = null
let isReady = false
let pendingExecutionResolve: ((token: string) => void) | null = null
let pendingExecutionReject: ((reason?: Error) => void) | null = null
let interactiveFallbackTimer: ReturnType<typeof setTimeout> | null = null
const status = ref<TurnstileWidgetStatus>('idle')

const INTERACTIVE_REQUIRED_DELAY_MS = 1200

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      execute?: (widgetId: string) => void | Promise<void>
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
    }
    onTurnstileLoad?: () => void
  }
}

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }

    const waitForTurnstile = (timeoutMs = 2000) => {
      const start = Date.now()
      turnstilePollReject = reject
      const check = () => {
        if (isUnmounted) {
          const err = new Error('Turnstile widget unmounted before API became available')
          turnstilePollReject?.(err)
          turnstilePollReject = null
          turnstilePollRaf = null
          return
        }
        if (window.turnstile) {
          turnstilePollReject = null
          turnstilePollRaf = null
          resolve()
          return
        }
        if (Date.now() - start >= timeoutMs) {
          turnstilePollReject?.(new Error('Turnstile script loaded but API is unavailable'))
          turnstilePollReject = null
          turnstilePollRaf = null
          return
        }
        turnstilePollRaf = requestAnimationFrame(check)
      }
      turnstilePollRaf = requestAnimationFrame(check)
    }

    const existingScript = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
    )
    if (existingScript) {
      if (window.turnstile) {
        resolve()
        return
      }
      if ((existingScript as HTMLScriptElement).readyState === 'complete') {
        waitForTurnstile()
        return
      }
      const handleLoad = () => {
        existingScript.removeEventListener('load', handleLoad)
        existingScript.removeEventListener('error', handleError)
        waitForTurnstile()
      }
      const handleError = () => {
        existingScript.removeEventListener('load', handleLoad)
        existingScript.removeEventListener('error', handleError)
        reject(new Error('Failed to load Turnstile script'))
      }
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'

    previousOnloadHandler = window.onTurnstileLoad ?? null
    turnstileOnloadHandler = () => {
      previousOnloadHandler?.()
      waitForTurnstile()
    }
    window.onTurnstileLoad = turnstileOnloadHandler
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))

    document.head.appendChild(script)
  })
}

// Constants
const LOG_PREFIX = '[Turnstile]'
const SITE_KEY_PREVIEW_LENGTH = 10
const IS_DEV = import.meta.env.DEV

// Helper functions
function maskSiteKey(key: string): string {
  return key.length > SITE_KEY_PREVIEW_LENGTH
    ? `${key.substring(0, SITE_KEY_PREVIEW_LENGTH)}...`
    : key
}

function logDebug(method: 'log' | 'warn' | 'error', ...args: unknown[]) {
  if (!IS_DEV) return
  console[method](LOG_PREFIX, ...args)
}

function resetRetryState() {
  // 保持接口稳定，但不再自动重试，避免 challenge 反复重建导致抖动和噪音。
}

function clearInteractiveFallbackTimer() {
  if (!interactiveFallbackTimer) return
  clearTimeout(interactiveFallbackTimer)
  interactiveFallbackTimer = null
}

function updateStatus(nextStatus: TurnstileWidgetStatus) {
  if (status.value === nextStatus) return
  status.value = nextStatus
  emit('status', nextStatus)
}

function scheduleInteractiveFallback() {
  clearInteractiveFallbackTimer()

  if (!(props.execution === 'execute' || props.appearance === 'execute')) {
    return
  }

  interactiveFallbackTimer = window.setTimeout(() => {
    if (pendingExecutionResolve && status.value === 'executing') {
      updateStatus('interactive_required')
    }
  }, INTERACTIVE_REQUIRED_DELAY_MS)
}

function clearPendingExecution() {
  pendingExecutionResolve = null
  pendingExecutionReject = null
  clearInteractiveFallbackTimer()
}

function rejectPendingExecution(error: Error) {
  pendingExecutionReject?.(error)
  clearPendingExecution()
}

function validateRenderConditions(): boolean {
  if (!containerRef.value || !window.turnstile) {
    logDebug('warn', 'Cannot render: missing container or API')
    return false
  }

  if (!props.siteKey) {
    logDebug('error', 'Cannot render: missing siteKey')
    emit('error', new Error('Turnstile siteKey is required'))
    return false
  }

  return true
}

function cleanupWidget(): void {
  if (!widgetId.value || !window.turnstile) return

  try {
    rejectPendingExecution(new Error('Turnstile widget removed'))
    window.turnstile.remove(widgetId.value)
  } catch (e) {
    logDebug('warn', 'Failed to remove old widget:', e)
  } finally {
    widgetId.value = null
  }
}

function createTurnstileConfig() {
  return {
    sitekey: props.siteKey,
    theme: props.theme,
    size: props.size,
    action: props.action,
    appearance: props.appearance,
    execution: props.execution,
    retry: 'never',
    callback: (token: string) => {
      resetRetryState()
      logDebug('log', 'Verification successful')
      updateStatus('verified')
      pendingExecutionResolve?.(token)
      clearPendingExecution()
      emit('verify', token)
    },
    'expired-callback': () => {
      resetRetryState()
      logDebug('log', 'Token expired')
      updateStatus('expired')
      rejectPendingExecution(new Error('Turnstile token expired'))
      emit('expire')
    },
    'error-callback': (errorCode: unknown) => {
      const code = extractTurnstileErrorCode(errorCode)
      const kind = classifyTurnstileError(errorCode)

      if (code === TURNSTILE_HOSTNAME_MISMATCH_CODE) {
        logDebug('error', 'Hostname is not authorized for this site key:', {
          hostname: window.location.hostname,
          siteKey: maskSiteKey(props.siteKey),
        })
      } else {
        logDebug('warn', 'Challenge widget reported an error:', {
          kind,
          code: code ?? 'unknown',
        })
      }

      const error = new Error(describeTurnstileError(errorCode))
      error.name = 'TurnstileError'
      Object.assign(error, { code, kind })
      updateStatus('error')
      rejectPendingExecution(error)
      emit('error', error)
      return true
    },
  }
}

function renderWidget() {
  if (!isReady) return
  if (!validateRenderConditions()) return

  cleanupWidget()

  // Clear container only if needed
  if (containerRef.value!.innerHTML) {
    containerRef.value!.innerHTML = ''
  }

  try {
    logDebug('log', 'Rendering widget with siteKey:', maskSiteKey(props.siteKey))
    widgetId.value = window.turnstile!.render(containerRef.value!, createTurnstileConfig())
    updateStatus('idle')
    logDebug('log', 'Widget rendered with ID:', widgetId.value)
    if (props.autoExecute || props.execution === 'execute') {
      void execute().catch((error) => {
        logDebug('warn', 'Auto execute failed:', error)
      })
    }
  } catch (error) {
    logDebug('error', 'Render failed:', error)
    widgetId.value = null // Ensure clean state on error
    updateStatus('error')
    emit('error', error as Error)
  }
}

async function rerender() {
  try {
    await loadTurnstileScript()
    if (isUnmounted) return
    renderWidget()
  } catch (error) {
    logDebug('error', 'Rerender failed:', error)
    updateStatus('error')
    emit('error', error as Error)
  }
}

function waitForMountDelay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    mountDelayResolve = resolve
    mountDelayTimer = window.setTimeout(() => {
      mountDelayTimer = null
      mountDelayResolve = null
      resolve()
    }, ms)
  })
}
function reset() {
  if (widgetId.value && window.turnstile) {
    resetRetryState()
    rejectPendingExecution(new Error('Turnstile reset'))
    window.turnstile.reset(widgetId.value)
    updateStatus('idle')
    logDebug('log', 'Widget reset')
  }
}

async function execute(): Promise<string> {
  if (isUnmounted) {
    throw new Error('Turnstile widget is unmounted')
  }

  await loadTurnstileScript()
  if (!isReady) {
    isReady = true
  }
  if (!widgetId.value) {
    renderWidget()
  }

  if (!widgetId.value || !window.turnstile) {
    throw new Error('Turnstile widget is not ready')
  }

  const existingResponse = window.turnstile.getResponse(widgetId.value)
  if (existingResponse) {
    updateStatus('verified')
    return existingResponse
  }

  return await new Promise<string>((resolve, reject) => {
    pendingExecutionResolve = resolve
    pendingExecutionReject = reject
    updateStatus('executing')
    scheduleInteractiveFallback()

    if (!window.turnstile?.execute) {
      rejectPendingExecution(new Error('Turnstile execute API is unavailable'))
      return
    }

    try {
      const result = window.turnstile.execute(widgetId.value)
      Promise.resolve(result).catch((error) => {
        rejectPendingExecution(error instanceof Error ? error : new Error(String(error)))
      })
    } catch (error) {
      rejectPendingExecution(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

function getResponse(): string | undefined {
  if (widgetId.value && window.turnstile) {
    return window.turnstile.getResponse(widgetId.value)
  }
  return undefined
}

onMounted(async () => {
  try {
    logDebug('log', 'Component mounted, loading script...')
    await loadTurnstileScript()
    logDebug('log', 'Script loaded, rendering widget...')

    // 等待下一个 tick 确保 DOM 完全准备好
    await waitForMountDelay(100)
    if (isUnmounted) return

    isReady = true
    renderWidget()
  } catch (error) {
    logDebug('error', 'Mount failed:', error)
    updateStatus('error')
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  isUnmounted = true
  isReady = false
  if (turnstilePollRaf !== null) {
    cancelAnimationFrame(turnstilePollRaf)
    turnstilePollRaf = null
  }
  if (turnstilePollReject) {
    turnstilePollReject(new Error('Turnstile widget unmounted'))
    turnstilePollReject = null
  }
  rejectPendingExecution(new Error('Turnstile widget unmounted'))
  if (mountDelayTimer) {
    clearTimeout(mountDelayTimer)
    mountDelayTimer = null
  }
  if (mountDelayResolve) {
    mountDelayResolve()
    mountDelayResolve = null
  }
  clearInteractiveFallbackTimer()
  resetRetryState()
  cleanupWidget()
  if (turnstileOnloadHandler && window.onTurnstileLoad === turnstileOnloadHandler) {
    window.onTurnstileLoad = previousOnloadHandler ?? undefined
  }
})

watch(
  () => props.siteKey,
  (nextSiteKey, previousSiteKey) => {
    if (!isReady || nextSiteKey === previousSiteKey) return
    renderWidget()
  }
)

defineExpose({
  reset,
  getResponse,
  rerender,
  execute,
})
</script>

<style scoped>
.turnstile-container {
  display: grid;
  place-items: center;
  inline-size: min(100%, clamp(18rem, 88vw, 20rem));
  min-inline-size: 0;
  margin-inline: auto;
  padding-inline: clamp(0.2rem, 0.8vw, 0.4rem);
  min-block-size: 0;
}

.turnstile-container--normal {
  min-block-size: clamp(4.35rem, 6vw, 4.9rem);
}

.turnstile-container--compact {
  min-block-size: clamp(4rem, 5vw, 4.45rem);
}

.turnstile-container--invisible {
  position: absolute;
  inline-size: 0.0625rem;
  block-size: 0.0625rem;
  min-block-size: 0;
  min-inline-size: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.turnstile-container :deep(iframe),
.turnstile-container :deep(div) {
  /* Third-party Turnstile DOM: retained as the only approved deep-selector exception. */
  max-inline-size: 100%;
  margin-inline: auto;
}
</style>
