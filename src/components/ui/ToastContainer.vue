<template>
  <Teleport :to="portalTarget">
    <aside
      v-if="current"
      ref="region"
      class="toast-viewport"
      :class="{ 'toast-viewport--bottom': dock === 'bottom' }"
      :data-edition="designEdition"
      :data-preset="settings.appearancePreset"
      :data-color-mode="resolvedTheme"
      :data-motion="motionMode"
      :aria-label="t('toast.region')"
      data-scene-role="utility"
      @pointerenter="onPointerEnter"
      @pointerleave="toastStore.resumeTimer(current.id, 'pointer')"
      @focusin="toastStore.pauseTimer(current.id, 'focus')"
      @focusout="onFocusOut"
      @keydown.esc.stop.prevent="dismiss"
    >
      <section
        :key="current.id"
        class="toast-card"
        :class="['toast-card--' + current.type, { 'is-collapsed': collapsed }]"
      >
        <div class="toast-card__heading">
          <component :is="icon" :size="18" aria-hidden="true" />
          <span class="toast-card__kind">{{ t('toast.' + current.type) }}</span>
          <span v-if="queued" class="toast-card__queue">{{
            t('toast.queued', { count: queued })
          }}</span>
          <button
            class="toast-card__collapse"
            type="button"
            :aria-label="t(collapsed ? 'toast.expand' : 'toast.collapse')"
            :aria-expanded="!collapsed"
            aria-controls="toast-message"
            @click="toggleCollapsed"
          >
            <ChevronDown v-if="collapsed" :size="16" /><Minus v-else :size="16" />
          </button>
          <button
            class="toast-card__close"
            type="button"
            :disabled="acting"
            :aria-label="t('toast.close')"
            @click="dismiss"
          >
            <X :size="18" />
          </button>
        </div>
        <div v-show="!collapsed" id="toast-message" class="toast-card__body">
          <p v-if="current.title" class="toast-card__title">{{ current.title }}</p>
          <p class="toast-card__message">{{ current.message }}</p>
          <p v-if="actionError" class="toast-card__message">{{ actionError }}</p>
          <div class="toast-card__footer">
            <button
              v-if="current.action"
              type="button"
              class="toast-card__action"
              :disabled="acting"
              @click="handleAction"
            >
              {{ acting ? t('common.loading') : current.action.label }}
            </button>
            <span class="toast-card__reading">{{
              t(
                current.duration === 0
                  ? 'toast.persistent'
                  : timing?.paused
                    ? 'toast.paused'
                    : 'toast.reading'
              )
            }}</span>
          </div>
        </div>
        <span
          v-if="current.duration > 0 && !collapsed"
          :key="current.id + ':' + timing?.revision"
          class="toast-card__progress"
          :class="{ 'is-paused': timing?.paused }"
          :style="{
            '--toast-fraction': String((timing?.remaining ?? current.duration) / current.duration),
            animationDuration: (timing?.remaining ?? current.duration) + 'ms',
          }"
          aria-hidden="true"
        />
      </section>
    </aside>
    <div class="toast-announcement" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </div>
    <div class="toast-announcement" role="alert" aria-atomic="true">{{ urgentAnnouncement }}</div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Check, Info, TriangleAlert, CircleAlert, X, Minus, ChevronDown } from '@lucide/vue'
import { designEdition } from '@/config/designEdition'
import { useToastStore, useThemeStore, useSettingsStore } from '@/stores'
import { useToastPortal } from './useToastPortal'
import './toast.css'

defineOptions({ name: 'UiToastContainer', inheritAttrs: false })
const { t } = useI18n()
const { portalTarget, syncPortal } = useToastPortal()
const toastStore = useToastStore()
const { settings, motionMode } = storeToRefs(useSettingsStore())
const { resolvedTheme } = storeToRefs(useThemeStore())
const current = computed(() => toastStore.toasts[0])
const queued = computed(() => Math.max(0, toastStore.toasts.length - 1))
const timing = computed(() =>
  current.value ? toastStore.timings.get(current.value.id) : undefined
)
const icon = computed(
  () =>
    ({ success: Check, error: CircleAlert, warning: TriangleAlert, info: Info })[
      current.value?.type ?? 'info'
    ]
)
const region = ref<HTMLElement | null>(null)
const collapsed = ref(false),
  acting = ref(false),
  dock = ref<'top' | 'bottom'>('top')
const announcement = ref(''),
  urgentAnnouncement = ref(''),
  actionError = ref('')
let returnTarget: HTMLElement | null = null
let focusGeneration = 0
let mounted = false
const originTargets = new Map<string, HTMLElement | null>()

function onPointerEnter(event: PointerEvent) {
  if (current.value && event.pointerType !== 'touch')
    toastStore.pauseTimer(current.value.id, 'pointer')
}
function onFocusOut(event: FocusEvent) {
  if (current.value && !region.value?.contains(event.relatedTarget as Node | null))
    toastStore.resumeTimer(current.value.id, 'focus')
}
function toggleCollapsed() {
  const toast = current.value
  if (!toast) return
  collapsed.value = !collapsed.value
  if (collapsed.value) toastStore.pauseTimer(toast.id, 'collapsed')
  else toastStore.resumeTimer(toast.id, 'collapsed')
}
function restoreFocus(preferred: HTMLElement | null = returnTarget) {
  const modal =
    portalTarget.value instanceof HTMLDialogElement && portalTarget.value.open
      ? portalTarget.value
      : null
  const target =
    preferred?.isConnected &&
    preferred.getClientRects().length &&
    (!modal || modal.contains(preferred))
      ? preferred
      : (modal ?? document.querySelector<HTMLElement>('#main-content'))
  target?.focus({ preventScroll: true })
}
function dismiss() {
  if (!current.value || acting.value) return
  if (region.value?.contains(document.activeElement)) restoreFocus()
  toastStore.removeToast(current.value.id)
}
async function handleAction() {
  const toast = current.value
  if (!toast?.action || acting.value) return
  const actionHadFocus = region.value?.contains(document.activeElement) ?? false
  const actionReturnTarget = originTargets.get(toast.id) ?? null
  const actionFocusGeneration = focusGeneration
  const actionPortalTarget = portalTarget.value
  const canRestoreActionFocus = () =>
    !document.hidden &&
    document.hasFocus() &&
    focusGeneration === actionFocusGeneration &&
    portalTarget.value === actionPortalTarget &&
    (region.value?.contains(document.activeElement) ||
      (actionHadFocus && (!document.activeElement || document.activeElement === document.body)))
  let failed = false
  acting.value = true
  actionError.value = ''
  toastStore.pauseTimer(toast.id, 'action')
  try {
    await toast.action.onClick()
    if (mounted && current.value?.id === toast.id) {
      // Disabling the action can move native Chrome focus to body. Restore
      // only when focus still belongs to this action or was lost that way.
      // A control the user focused while waiting keeps its own focus.
      if (canRestoreActionFocus()) restoreFocus(actionReturnTarget)
      toastStore.removeToast(toast.id)
    }
  } catch {
    failed = true
    if (mounted && current.value?.id === toast.id) {
      actionError.value = t('toast.actionFailed')
      urgentAnnouncement.value = actionError.value
    }
  } finally {
    if (mounted && current.value?.id === toast.id) {
      acting.value = false
      if (failed) {
        await nextTick()
        if (mounted && current.value?.id === toast.id && canRestoreActionFocus())
          region.value
            ?.querySelector<HTMLButtonElement>('.toast-card__action:not([disabled])')
            ?.focus({ preventScroll: true })
      }
    }
    toastStore.resumeTimer(toast.id, 'action')
  }
}
function onWindowBlur() {
  toastStore.setWindowFocused(false)
}
function onWindowFocus() {
  toastStore.setWindowFocused(true)
}
function syncVisibility() {
  toastStore.setPageHidden(document.hidden)
}
function protectFocusedControl(event?: FocusEvent) {
  const target = event?.target ?? document.activeElement
  if (
    !(target instanceof HTMLElement) ||
    target === document.body ||
    region.value?.contains(target)
  )
    return
  if (event) focusGeneration++
  returnTarget = target
  const notice = region.value?.getBoundingClientRect(),
    control = target.getBoundingClientRect()
  if (
    notice &&
    control.width &&
    control.height &&
    control.left < notice.right &&
    control.right > notice.left &&
    control.top < notice.bottom &&
    control.bottom > notice.top
  )
    dock.value = control.top < innerHeight / 2 ? 'bottom' : 'top'
}
async function activateCurrent(id: string | undefined) {
  collapsed.value = false
  acting.value = false
  actionError.value = ''
  dock.value = 'top'
  announcement.value = ''
  urgentAnnouncement.value = ''
  syncPortal()
  await nextTick()
  if (id !== current.value?.id || !mounted) return
  toastStore.setVisibleToasts(id ? [id] : [])
  if (!current.value) return
  const message = [current.value.title, current.value.message].filter(Boolean).join('。')
  if (current.value.type === 'error') urgentAnnouncement.value = message
  else announcement.value = message
  protectFocusedControl()
  if (region.value?.matches(':hover')) toastStore.pauseTimer(id!, 'pointer')
  if (region.value?.contains(document.activeElement)) toastStore.pauseTimer(id!, 'focus')
}
watch(
  () => toastStore.toasts.map((toast) => toast.id),
  (ids) => {
    const currentIds = new Set(ids)
    for (const id of originTargets.keys()) if (!currentIds.has(id)) originTargets.delete(id)
    // This is the context where the notice enters the queue. An async request
    // may have started from another control; later Tab traversal must not
    // overwrite the context already owned by an existing notice.
    const active = document.activeElement
    const origin =
      active instanceof HTMLElement && active !== document.body && !region.value?.contains(active)
        ? active
        : returnTarget
    for (const id of ids) if (!originTargets.has(id)) originTargets.set(id, origin)
  },
  { flush: 'sync', immediate: true }
)
watch(() => current.value?.id, activateCurrent, { flush: 'post' })
onMounted(() => {
  mounted = true
  syncVisibility()
  toastStore.setWindowFocused(document.hasFocus())
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('focus', onWindowFocus)
  void activateCurrent(current.value?.id)
  document.addEventListener('visibilitychange', syncVisibility)
  document.addEventListener('focusin', protectFocusedControl)
})
onBeforeUnmount(() => {
  mounted = false
  originTargets.clear()
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('focus', onWindowFocus)
  toastStore.setVisibleToasts([])
  document.removeEventListener('visibilitychange', syncVisibility)
  document.removeEventListener('focusin', protectFocusedControl)
})
</script>
