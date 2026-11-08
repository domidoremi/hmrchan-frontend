<template>
  <div
    ref="containerRef"
    class="turnstile-container"
    :class="`turnstile-container--${props.size}`"
    :data-status="status"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useTemplateRef } from 'vue'
import {
  classifyTurnstileError,
  describeTurnstileError,
  extractTurnstileErrorCode,
} from '@/utils/turnstile'
import { loadTurnstileScript } from '@/utils/turnstileScript'
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

const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
const status = ref<TurnstileWidgetStatus>('idle')
let widgetId: string | null = null
let unmounted = false
let generation = 0
let initializing: Promise<void> | null = null
let pending: Promise<string> | null = null
let resolveExecution: ((token: string) => void) | null = null
let rejectExecution: ((error: Error) => void) | null = null
let executionTimer: ReturnType<typeof setTimeout> | undefined

function updateStatus(value: TurnstileWidgetStatus) {
  if (status.value === value) return
  status.value = value
  emit('status', value)
}
function settleExecution(error?: Error, token?: string) {
  clearTimeout(executionTimer)
  if (error) rejectExecution?.(error)
  else if (token) resolveExecution?.(token)
  pending = null
  resolveExecution = null
  rejectExecution = null
}
function fail(reason: unknown) {
  if (unmounted) return
  const error = new Error(describeTurnstileError(reason))
  error.name = 'TurnstileError'
  Object.assign(error, {
    code: extractTurnstileErrorCode(reason),
    kind: classifyTurnstileError(reason),
  })
  updateStatus('error')
  settleExecution(error)
  emit('error', error)
}
function startExecutionTimer() {
  clearTimeout(executionTimer)
  executionTimer = setTimeout(() => fail('110600'), 120000)
}
function removeWidget() {
  generation++
  settleExecution(new Error('Turnstile widget removed'))
  if (widgetId) window.turnstile?.remove(widgetId)
  widgetId = null
}

async function ensureWidget() {
  if (widgetId) return
  if (initializing) return initializing
  initializing = (async () => {
    await loadTurnstileScript()
    if (unmounted || !containerRef.value) return
    if (!props.siteKey) throw new Error('Turnstile siteKey is required')
    const current = ++generation
    const active = () => !unmounted && current === generation
    updateStatus(props.execution === 'render' ? 'executing' : 'idle')
    if (props.execution === 'render') startExecutionTimer()
    widgetId = window.turnstile!.render(containerRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      action: props.action,
      appearance: props.appearance,
      execution: props.execution,
      retry: 'never',
      'refresh-expired': 'manual',
      'refresh-timeout': 'manual',
      callback: (token: string) => {
        if (!active()) return
        updateStatus('verified')
        settleExecution(undefined, token)
        emit('verify', token)
      },
      'before-interactive-callback': () => {
        if (active()) updateStatus('interactive_required')
      },
      'after-interactive-callback': () => {
        if (active() && status.value === 'interactive_required') updateStatus('executing')
      },
      'expired-callback': () => {
        if (!active()) return
        updateStatus('expired')
        settleExecution(new Error('Turnstile token expired'))
        emit('expire')
      },
      'timeout-callback': () => {
        if (active()) fail('110620')
      },
      'unsupported-callback': () => {
        if (active()) fail('110500')
      },
      'error-callback': (code: unknown) => {
        if (active()) fail(code)
        return true
      },
    })
  })()
  try {
    await initializing
  } finally {
    initializing = null
  }
}

async function execute(): Promise<string> {
  if (unmounted) throw new Error('Turnstile widget is unmounted')
  try {
    await ensureWidget()
  } catch (error) {
    fail(error)
    throw error
  }
  if (unmounted || !widgetId || !window.turnstile) throw new Error('Turnstile widget is not ready')
  if (pending) return pending
  if (status.value === 'error' || status.value === 'expired') reset()
  const response = window.turnstile.getResponse(widgetId)
  if (response) return response
  const execution = new Promise<string>((resolve, reject) => {
    resolveExecution = resolve
    rejectExecution = reject
  })
  pending = execution
  updateStatus('executing')
  startExecutionTimer()
  try {
    if (props.execution === 'execute') {
      if (!window.turnstile.execute) throw new Error('Turnstile execute API is unavailable')
      void Promise.resolve(window.turnstile.execute(widgetId)).catch(fail)
    }
  } catch (error) {
    fail(error)
  }
  return execution
}
function reset() {
  settleExecution(new Error('Turnstile reset'))
  updateStatus(props.execution === 'render' ? 'executing' : 'idle')
  if (widgetId) window.turnstile?.reset(widgetId)
  if (props.execution === 'render') startExecutionTimer()
}
function getResponse() {
  return widgetId ? window.turnstile?.getResponse(widgetId) : undefined
}
async function start() {
  let attempt = generation
  try {
    await ensureWidget()
    attempt = generation
    if (!unmounted && props.autoExecute) await execute()
  } catch (error) {
    if (
      !unmounted &&
      attempt === generation &&
      status.value !== 'error' &&
      status.value !== 'expired'
    )
      fail(error)
  }
}
async function rerender() {
  removeWidget()
  await start()
}
onMounted(start)
onUnmounted(() => {
  unmounted = true
  removeWidget()
})
watch(
  () => props.siteKey,
  () => {
    void rerender()
  }
)
defineExpose({ reset, getResponse, rerender, execute })
</script>

<style scoped>
.turnstile-container {
  display: grid;
  place-items: center;
  inline-size: 100%;
  min-inline-size: 0;
  margin-inline: auto;
}
.turnstile-container :deep(iframe),
.turnstile-container :deep(div) {
  /* Third-party Turnstile DOM: retained as the only approved deep-selector exception. */
  max-inline-size: 100%;
  margin-inline: auto;
}
</style>
