<template>
  <div ref="containerRef" class="turnstile-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import {
  extractTurnstileErrorCode,
  isRetryableTurnstileError,
  TURNSTILE_HOSTNAME_MISMATCH_CODE,
} from '@/utils/turnstile'

export interface TurnstileWidgetProps {
  siteKey: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  action?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
}

const props = withDefaults(defineProps<TurnstileWidgetProps>(), {
  theme: 'auto',
  size: 'normal',
  appearance: 'always',
})

const emit = defineEmits<{
  verify: [token: string]
  expire: []
  error: [error: Error]
}>()

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const widgetId = ref<string | null>(null)
let isUnmounted = false
let previousOnloadHandler: (() => void) | null = null
let turnstileOnloadHandler: (() => void) | null = null
let mountDelayTimer: ReturnType<typeof setTimeout> | null = null
let mountDelayResolve: (() => void) | null = null
let turnstilePollRaf: number | null = null
let turnstilePollReject: ((reason?: Error) => void) | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryCount = 0

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
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
const MAX_AUTO_RETRIES = 2
const RETRY_DELAY_MS = 900
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

function clearRetryTimer() {
  if (!retryTimer) return
  clearTimeout(retryTimer)
  retryTimer = null
}

function resetRetryState() {
  retryCount = 0
  clearRetryTimer()
}

function scheduleRetry(errorCode: string | null): boolean {
  if (!isRetryableTurnstileError(errorCode) || isUnmounted || retryCount >= MAX_AUTO_RETRIES) {
    return false
  }

  retryCount += 1
  clearRetryTimer()
  retryTimer = window.setTimeout(() => {
    retryTimer = null
    if (isUnmounted) return
    renderWidget()
  }, RETRY_DELAY_MS * retryCount)
  logDebug('warn', `Retrying widget render after transient error ${errorCode}.`, {
    retryCount,
  })
  return true
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
    retry: 'never',
    callback: (token: string) => {
      resetRetryState()
      logDebug('log', 'Verification successful')
      emit('verify', token)
    },
    'expired-callback': () => {
      resetRetryState()
      logDebug('log', 'Token expired')
      emit('expire')
    },
    'error-callback': (errorCode: unknown) => {
      const code = extractTurnstileErrorCode(errorCode)

      if (scheduleRetry(code)) {
        return true
      }

      if (code === TURNSTILE_HOSTNAME_MISMATCH_CODE) {
        logDebug('error', 'Hostname is not authorized for this site key:', {
          hostname: window.location.hostname,
          siteKey: maskSiteKey(props.siteKey),
        })
      }

      const error = new Error(code ? `Turnstile error: ${code}` : 'Turnstile error occurred')
      error.name = 'TurnstileError'
      emit('error', error)
      return true
    },
  }
}

function renderWidget() {
  if (!validateRenderConditions()) return

  cleanupWidget()

  // Clear container only if needed
  if (containerRef.value!.innerHTML) {
    containerRef.value!.innerHTML = ''
  }

  try {
    logDebug('log', 'Rendering widget with siteKey:', maskSiteKey(props.siteKey))
    widgetId.value = window.turnstile!.render(containerRef.value!, createTurnstileConfig())
    logDebug('log', 'Widget rendered with ID:', widgetId.value)
  } catch (error) {
    logDebug('error', 'Render failed:', error)
    widgetId.value = null // Ensure clean state on error
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
    window.turnstile.reset(widgetId.value)
    logDebug('log', 'Widget reset')
  }
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

    renderWidget()
  } catch (error) {
    logDebug('error', 'Mount failed:', error)
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  isUnmounted = true
  if (turnstilePollRaf !== null) {
    cancelAnimationFrame(turnstilePollRaf)
    turnstilePollRaf = null
  }
  if (turnstilePollReject) {
    turnstilePollReject(new Error('Turnstile widget unmounted'))
    turnstilePollReject = null
  }
  if (mountDelayTimer) {
    clearTimeout(mountDelayTimer)
    mountDelayTimer = null
  }
  if (mountDelayResolve) {
    mountDelayResolve()
    mountDelayResolve = null
  }
  resetRetryState()
  cleanupWidget()
  if (turnstileOnloadHandler && window.onTurnstileLoad === turnstileOnloadHandler) {
    window.onTurnstileLoad = previousOnloadHandler ?? undefined
  }
})

watch(
  () => props.siteKey,
  () => {
    renderWidget()
  }
)

defineExpose({
  reset,
  getResponse,
})
</script>

<style scoped>
.turnstile-container {
  display: flex;
  justify-content: center;
  min-height: 4.0625rem;
}
</style>
