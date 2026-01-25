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
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true

    window.onTurnstileLoad = () => {
      console.log('[Turnstile] Script loaded via callback')
      waitForTurnstile()
    }
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))

    document.head.appendChild(script)
  })
}

function renderWidget() {
  if (!containerRef.value || !window.turnstile) {
    console.warn('[Turnstile] Cannot render: missing container or API')
    return
  }

  if (!props.siteKey) {
    console.error('[Turnstile] Cannot render: missing siteKey')
    emit('error', new Error('Turnstile siteKey is required'))
    return
  }

  // 清理旧的 widget
  if (widgetId.value) {
    try {
      window.turnstile.remove(widgetId.value)
    } catch (e) {
      console.warn('[Turnstile] Failed to remove old widget:', e)
    }
    widgetId.value = null
  }

  // 确保容器为空
  containerRef.value.innerHTML = ''

  try {
    console.log('[Turnstile] Rendering widget with siteKey:', props.siteKey.substring(0, 10) + '...')

    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      action: props.action,
      appearance: props.appearance,
      callback: (token: string) => {
        console.log('[Turnstile] Verification successful')
        emit('verify', token)
      },
      'expired-callback': () => {
        console.log('[Turnstile] Token expired')
        emit('expire')
      },
      'error-callback': (errorCode: string) => {
        console.error('[Turnstile] Error:', errorCode)
        emit('error', new Error(`Turnstile error: ${errorCode}`))
      },
    })

    console.log('[Turnstile] Widget rendered with ID:', widgetId.value)
  } catch (error) {
    console.error('[Turnstile] Render failed:', error)
    emit('error', error as Error)
  }
}

function reset() {
  if (widgetId.value && window.turnstile) {
    window.turnstile.reset(widgetId.value)
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
    console.log('[Turnstile] Component mounted, loading script...')
    await loadTurnstileScript()
    console.log('[Turnstile] Script loaded, rendering widget...')

    // 等待下一个 tick 确保 DOM 完全准备好
    await new Promise((resolve) => setTimeout(resolve, 100))

    renderWidget()
  } catch (error) {
    console.error('[Turnstile] Mount failed:', error)
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  if (widgetId.value && window.turnstile) {
    window.turnstile.remove(widgetId.value)
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
  min-height: 65px;
}
</style>
