<template>
  <section
    class="spatial-gallery"
    :class="{ 'spatial-gallery--still': !motionAllowed }"
    :data-mode="mode"
    :aria-label="t('spatial.gallery')"
  >
    <div class="spatial-gallery__heading">
      <span>{{ t('spatial.selected') }}</span>
      <span
        >{{ String(active + 1).padStart(2, '0') }} /
        {{ String(items.length).padStart(2, '0') }}</span
      >
    </div>
    <div
      ref="stage"
      class="spatial-gallery__stage"
      tabindex="0"
      :aria-label="t('spatial.gallery')"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
      @keydown.home.prevent="active = 0"
      @keydown.end.prevent="active = items.length - 1"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="finishDrag"
      @pointercancel="cancelDrag"
      @lostpointercapture="handleLostCapture"
      @click.capture="guardClick"
    >
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="spatial-gallery__card"
        :class="{ 'is-current': active === index }"
        :style="cardStyle(index)"
        :tabindex="active === index ? 0 : -1"
        :aria-hidden="Math.abs(distance(index)) > 2 || undefined"
        :aria-label="item.title"
        @click="choose(index)"
      >
        <span class="spatial-gallery__photo"
          ><slot name="image" :index="index"
            ><span>{{ item.title }}</span></slot
          ></span
        >
        <span class="spatial-gallery__caption"
          ><span>{{ item.author }}</span
          ><span>{{ String(index + 1).padStart(2, '0') }}</span></span
        >
      </button>
      <span class="spatial-gallery__orbit" aria-hidden="true" />
    </div>
    <div class="spatial-gallery__footer">
      <div class="spatial-gallery__pagination">
        <button
          type="button"
          :disabled="items.length < 2"
          :aria-label="t('spatial.previous')"
          @click="step(-1)"
        >
          ←
        </button>
        <p aria-live="polite" aria-atomic="true">{{ items[active]?.title }}</p>
        <button
          type="button"
          :disabled="items.length < 2"
          :aria-label="t('spatial.next')"
          @click="step(1)"
        >
          →
        </button>
      </div>
      <div class="spatial-gallery__modes" :aria-label="t('spatial.arrangement')">
        <button
          v-for="value in modes"
          :key="value"
          type="button"
          :aria-pressed="mode === value"
          @click="mode = value"
        >
          {{ t(`spatial.${value}`) }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { CSSProperties } from 'vue'

const props = defineProps<{
  items: Array<{ id: string; title: string; author: string }>
  animated: boolean
}>()
const emit = defineEmits<{ select: [index: number] }>()
const { t } = useI18n()
const modes = ['orbit', 'stack', 'fan'] as const
const mode = ref<(typeof modes)[number]>('orbit')
const active = ref(0)
const stage = ref<HTMLElement | null>(null)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const motionAllowed = computed(() => props.animated && !reduced.value)
const drag = ref(0)
let gesture: { id: number; x: number; y: number; horizontal: boolean } | null = null
let suppressClick = false

function distance(index: number) {
  const count = props.items.length
  if (!count) return 0
  let delta = (index - active.value + count) % count
  if (delta > count / 2) delta -= count
  return delta
}

function cardStyle(index: number): CSSProperties {
  const delta = distance(index)
  const offset = delta + (motionAllowed.value ? drag.value / 190 : 0)
  const visible = Math.abs(delta) <= 2
  let transform: string
  if (!motionAllowed.value) {
    transform = `translateX(${delta * 24}%) scale(${delta === 0 ? 1 : 0.86})`
  } else if (mode.value === 'orbit') {
    const angle = offset * 0.66
    transform = `translate3d(${Math.sin(angle) * 85}%, ${Math.abs(offset) * 5}%, ${Math.cos(angle) * 130 - 130}px) rotateY(${-offset * 24}deg) rotateZ(${offset * 3}deg) scale(${1 - Math.min(Math.abs(offset) * 0.09, 0.28)})`
  } else if (mode.value === 'stack') {
    transform = `translate3d(${offset * 9}%, ${Math.abs(offset) * -3}%, ${-Math.abs(offset) * 65}px) rotateY(-14deg) rotateZ(${offset * 7}deg)`
  } else {
    transform = `translate3d(${offset * 51}%, ${Math.abs(offset) * 10}%, ${-Math.abs(offset) * 35}px) rotateZ(${offset * 13}deg)`
  }
  return {
    transform,
    opacity: visible ? (delta === 0 ? 1 : 0.78) : 0,
    zIndex: 10 - Math.abs(delta),
    pointerEvents: visible ? 'auto' : 'none',
    transitionDuration: gesture?.horizontal ? '0ms' : undefined,
  }
}

function step(direction: number) {
  if (!props.items.length) return
  active.value = (active.value + direction + props.items.length) % props.items.length
}
function choose(index: number) {
  if (index !== active.value) active.value = index
  else emit('select', index)
}
function startDrag(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0 || props.items.length < 2) return
  suppressClick = false
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false }
}
function moveDrag(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return
  const dx = event.clientX - gesture.x
  const dy = event.clientY - gesture.y
  if (!gesture.horizontal) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      cancelDrag()
      return
    }
    if (Math.abs(dx) < 10) return
    gesture.horizontal = true
    suppressClick = true
    stage.value?.setPointerCapture(event.pointerId)
  }
  drag.value = Math.max(-180, Math.min(180, dx))
}
function finishDrag() {
  if (gesture?.horizontal && Math.abs(drag.value) > 45) step(drag.value < 0 ? 1 : -1)
  cancelDrag()
}
function cancelDrag() {
  const id = gesture?.id
  gesture = null
  drag.value = 0
  if (id !== undefined && stage.value?.hasPointerCapture(id)) stage.value.releasePointerCapture(id)
}
function handleLostCapture(event: PointerEvent) {
  // Touch first captures the card, then transfers capture to the gallery stage.
  if (event.target === stage.value) cancelDrag()
}
function guardClick(event: MouseEvent) {
  if (!suppressClick) return
  event.preventDefault()
  event.stopPropagation()
  suppressClick = false
}
watch(
  () => props.items.map((item) => item.id).join(','),
  () => {
    active.value = 0
    cancelDrag()
  }
)
onDeactivated(cancelDrag)
onBeforeUnmount(cancelDrag)
</script>
