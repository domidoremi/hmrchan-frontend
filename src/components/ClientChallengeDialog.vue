<template>
  <Teleport to="body">
    <div class="hmr-client-challenge" role="presentation">
      <section
        class="hmr-client-challenge__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hmr-client-challenge-title"
      >
        <p class="hmr-client-challenge__eyebrow">Security</p>
        <h2 id="hmr-client-challenge-title">继续前请完成验证</h2>
        <p class="hmr-client-challenge__body">{{ statusText }}</p>
        <div ref="containerRef" class="hmr-client-challenge__widget"></div>
        <button class="hmr-client-challenge__secondary" type="button" @click="dismiss">
          稍后再试
        </button>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  clientChallengeState,
  dismissClientChallenge,
  resolveClientChallenge,
} from '@/api/clientChallengeBridge'
import { clientSecurityService } from '@/api/clientSecurityService'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback': () => void
          'expired-callback': () => void
        }
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SCRIPT_ID = 'hmr-turnstile-script'
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const containerRef = ref<HTMLElement | null>(null)
const widgetId = ref<string | null>(null)
const status = ref<'loading' | 'ready' | 'verifying' | 'error'>('loading')

const siteKey = computed(
  () => clientChallengeState.turnstileSiteKey.value || import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
)

const statusText = computed(() => {
  if (status.value === 'verifying') return '验证结果正在提交。'
  if (status.value === 'error') return '验证暂时不可用，请稍后重试。'
  return '这一步用于保护登录、注册和会话刷新。'
})

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()

  const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID)
  if (existingScript) {
    return waitForTurnstile()
  }

  const script = document.createElement('script')
  script.id = TURNSTILE_SCRIPT_ID
  script.src = TURNSTILE_SCRIPT_SRC
  script.async = true
  script.defer = true
  document.head.append(script)
  return waitForTurnstile()
}

function waitForTurnstile(timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (window.turnstile) {
        resolve()
        return
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Turnstile API unavailable'))
        return
      }
      window.setTimeout(tick, 80)
    }
    tick()
  })
}

function removeWidget(): void {
  if (!widgetId.value || !window.turnstile) return
  try {
    window.turnstile.remove(widgetId.value)
  } catch {
    // Third-party widget cleanup is best-effort.
  }
  widgetId.value = null
}

async function handleVerify(token: string): Promise<void> {
  status.value = 'verifying'
  try {
    await clientSecurityService.verify(token)
    resolveClientChallenge()
  } catch {
    status.value = 'error'
    if (widgetId.value && window.turnstile) {
      window.turnstile.reset(widgetId.value)
    }
  }
}

async function renderWidget(): Promise<void> {
  removeWidget()
  if (!siteKey.value) {
    status.value = 'error'
    return
  }

  try {
    status.value = 'loading'
    await loadTurnstileScript()
    await nextTick()
    if (!containerRef.value || !window.turnstile) return
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey.value,
      callback: (token) => void handleVerify(token),
      'error-callback': () => {
        status.value = 'error'
      },
      'expired-callback': () => {
        status.value = 'ready'
        if (widgetId.value && window.turnstile) {
          window.turnstile.reset(widgetId.value)
        }
      },
    })
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

function dismiss(): void {
  dismissClientChallenge()
}

watch(siteKey, () => {
  if (clientChallengeState.isOpen.value) {
    void renderWidget()
  }
})

onMounted(() => {
  void renderWidget()
})

onBeforeUnmount(removeWidget)
</script>

<style scoped>
.hmr-client-challenge {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgb(17 16 15 / 72%);
  backdrop-filter: blur(0.75rem);
}

.hmr-client-challenge__panel {
  width: min(26rem, 100%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--hmr-base-rgb) / 14%);
  border-radius: var(--hmr-radius);
  background: var(--hmr-bg);
  color: var(--hmr-base);
  box-shadow: 0 1.25rem 4rem rgb(0 0 0 / 28%);
}

.hmr-client-challenge__eyebrow {
  margin: 0 0 0.5rem;
  color: var(--hmr-orange);
  font-family: var(--hmr-font-mono);
  font-size: 0.75rem;
  text-transform: uppercase;
}

.hmr-client-challenge__panel h2 {
  margin: 0;
  font-family: var(--hmr-font-display);
  font-size: clamp(1.75rem, 7vw, 3rem);
  line-height: 0.95;
}

.hmr-client-challenge__body {
  margin: 0.75rem 0 1rem;
  color: var(--hmr-text-muted);
}

.hmr-client-challenge__widget {
  min-height: 4.5rem;
}

.hmr-client-challenge__secondary {
  width: 100%;
  margin-block-start: 0.875rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgb(var(--hmr-base-rgb) / 18%);
  border-radius: 999rem;
  background: transparent;
  color: var(--hmr-base);
  cursor: pointer;
}
</style>
