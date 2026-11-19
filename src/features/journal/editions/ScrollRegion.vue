<template>
  <div
    ref="root"
    :data-scroll-region="kind"
    :data-in-view="inView || undefined"
    :data-paused="disabled || undefined"
    @wheel="wheel"
    @touchstart.passive="touchStart"
    @touchend.passive="touchEnd"
    @touchcancel.passive="touchCancel"
    @click.capture="click"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createVisibilityObserver } from '@/utils/modernAPIs'

const props = defineProps<{
  kind: 'cover' | 'film' | 'index'
  count: number
  position: number
  disabled?: boolean
}>()
const emit = defineEmits<{ step: [direction: number]; pan: [pixels: number] }>()
const root = ref<HTMLElement>()
const inView = ref(false)
let observer: IntersectionObserver | undefined
let accumulated = 0,
  lastWheel = 0,
  nextStep = 0,
  suppressClick = 0,
  lastDirection = 0
let touch: { x: number; y: number } | undefined
function content(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  if (target.closest('input, select, textarea, [contenteditable="true"]')) return null
  const node = target.closest<HTMLElement>('[data-scroll-content]')
  return node?.closest('[data-scroll-region]') === root.value ? node : null
}
function canMove(direction: number) {
  return (
    props.count > 1 &&
    !props.disabled &&
    (direction > 0 ? props.position < 0.998 : props.position > 0.002)
  )
}
function wheel(event: WheelEvent) {
  const node = content(event.target)
  if (
    !node ||
    document.body.dataset['motion'] !== 'full' ||
    document.hidden ||
    document.querySelector('dialog[open], .mobile-directory') ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !event.cancelable ||
    Math.abs(event.deltaY) <= Math.abs(event.deltaX)
  )
    return
  const direction = Math.sign(event.deltaY)
  if (!canMove(direction)) {
    accumulated = 0
    return
  }
  const pixels =
    event.deltaY *
    (event.deltaMode === 1
      ? parseFloat(getComputedStyle(node).fontSize) * 1.2
      : event.deltaMode === 2
        ? node.clientHeight
        : 1)
  event.preventDefault()
  if (props.kind === 'film') {
    emit('pan', pixels)
    return
  }
  const now = performance.now()
  if (direction !== lastDirection) nextStep = 0
  lastDirection = direction
  if (now - lastWheel > 180 || Math.sign(accumulated) !== direction) accumulated = 0
  lastWheel = now
  if (now < nextStep) return
  accumulated += pixels
  if (Math.abs(accumulated) < 64) return
  accumulated = 0
  nextStep = now + 280
  emit('step', direction)
}
function touchStart(event: TouchEvent) {
  const point = event.touches[0]
  touch =
    props.kind !== 'film' && content(event.target) && event.touches.length === 1 && point
      ? { x: point.clientX, y: point.clientY }
      : undefined
}
function touchEnd(event: TouchEvent) {
  const point = event.changedTouches[0],
    start = touch
  touch = undefined
  if (!point || !start || document.querySelector('dialog[open], .mobile-directory')) return
  const x = start.x - point.clientX,
    y = start.y - point.clientY
  if (Math.abs(x) < 44 || Math.abs(x) <= Math.abs(y) * 1.3 || !canMove(Math.sign(x))) return
  suppressClick = performance.now() + 450
  emit('step', Math.sign(x))
}
function touchCancel() {
  touch = undefined
}
function click(event: MouseEvent) {
  if (event.detail && performance.now() < suppressClick) {
    event.preventDefault()
    event.stopPropagation()
  }
}
onMounted(() => {
  observer = createVisibilityObserver(([entry]) => {
    inView.value = Boolean(entry?.isIntersecting)
  })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style src="../styles/home-motion.css"></style>
