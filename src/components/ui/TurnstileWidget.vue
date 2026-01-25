<template>
  <div ref="containerRef" class="turnstile-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

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

const containerRef = ref<HTMLDivElement | null>(null)
const widgetId = ref<string | null>(null)

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
      const check = () => {
        if (window.turnstile) {
          resolve()
          return
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error('Turnstile script loaded but API is unavailable'))
          return
        }
        requestAnimationFrame(check)
      }
      requestAnimationFrame(check)
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

    window.onTurnstileLoad = () => {
      waitForTurnstile()
    }
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))

    document.head.appendChild(script)
  })
}

// Constants
const LOG_PREFIX = '[Turnstile]'
const SITE_KEY_PREVIEW_LENGTH = 10

// Helper functions
function maskSiteKey(key: string): string {
  return key.length > SITE_KEY_PREVIEW_LENGTH
    ? `${key.substring(0, SITE_KEY_PREVIEW_LENGTH)}...`
    : key
}

function validateRenderConditions(): boolean {
  if (!containerRef.value || !window.turnstile) {
    console.warn(`${LOG_PREFIX} Cannot render: missing container or API`)
    return false
  }

  if (!props.siteKey) {
    console.error(`${LOG_PREFIX} Cannot render: missing siteKey`)
    emit('error', new Error('Turnstile siteKey is required'))
    return false
  }

  return true
}

function cleanupWidget(): void {
  if (!widgetId.value || !window.turnstile) return

  try {
    window.turnstile.remove(widgetId.value)
    console.log(`${LOG_PREFIX} Widget removed:`, widgetId.value)
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to remove old widget:`, e)
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
    callback: (token: string) => {
      console.log(`${LOG_PREFIX} Verification successful`)
      emit('verify', token)
    },
    'expired-callback': () => {
      console.log(`${LOG_PREFIX} Token expired`)
      emit('expire')
    },
    'error-callback': (errorCode: unknown) => {
      console.error(`${LOG_PREFIX} Error:`, errorCode)
      const message =
        typeof errorCode === 'string' ? `Turnstile error: ${errorCode}` : 'Turnstile error occurred'
      emit('error', new Error(message))
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
    console.log(`${LOG_PREFIX} Rendering widget with siteKey:`, maskSiteKey(props.siteKey))

    widgetId.value = window.turnstile!.render(containerRef.value!, createTurnstileConfig())

    console.log(`${LOG_PREFIX} Widget rendered with ID:`, widgetId.value)
  } catch (error) {
    console.error(`${LOG_PREFIX} Render failed:`, error)
    widgetId.value = null // Ensure clean state on error
    emit('error', error as Error)
  }
}

function reset() {
  if (widgetId.value && window.turnstile) {
    window.turnstile.reset(widgetId.value)
    console.log(`${LOG_PREFIX} Widget reset`)
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
    console.log(`${LOG_PREFIX} Component mounted, loading script...`)
    await loadTurnstileScript()
    console.log(`${LOG_PREFIX} Script loaded, rendering widget...`)

    // 等待下一个 tick 确保 DOM 完全准备好
    await new Promise((resolve) => setTimeout(resolve, 100))

    renderWidget()
  } catch (error) {
    console.error(`${LOG_PREFIX} Mount failed:`, error)
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  cleanupWidget()
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
  min-height: 65px;
}
</style>
