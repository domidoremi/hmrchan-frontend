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

    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      window.onTurnstileLoad = () => resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true

    window.onTurnstileLoad = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))

    document.head.appendChild(script)
  })
}

function renderWidget() {
  if (!containerRef.value || !window.turnstile) return

  if (widgetId.value) {
    window.turnstile.remove(widgetId.value)
  }

  widgetId.value = window.turnstile.render(containerRef.value, {
    sitekey: props.siteKey,
    theme: props.theme,
    size: props.size,
    action: props.action,
    appearance: props.appearance,
    callback: (token: string) => emit('verify', token),
    'expired-callback': () => emit('expire'),
    'error-callback': (error: Error) => emit('error', error),
  })
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
    await loadTurnstileScript()
    renderWidget()
  } catch (error) {
    emit('error', error as Error)
  }
})

onUnmounted(() => {
  if (widgetId.value && window.turnstile) {
    window.turnstile.remove(widgetId.value)
  }
})

watch(() => props.siteKey, () => {
  renderWidget()
})

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
