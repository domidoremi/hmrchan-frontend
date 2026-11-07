<template>
  <div ref="surface" class="spatial-backdrop" aria-hidden="true">
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
      <path v-for="(path, index) in contours" :key="index" :d="path" />
    </svg>
    <span class="spatial-backdrop__light" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
const props = defineProps<{ enabled: boolean }>()
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
const surface = ref<HTMLElement | null>(null)
const contours = Array.from({ length: 22 }, (_, i) => {
  const x = i * 34
  return `M ${-500 + x} 1100 C ${1100 + x} 850, ${-450 + x} 80, ${1000 + x} -120`
})
let frame = 0
let pointerX = 0
let pointerY = 0
let listening = false
function draw() {
  frame = 0
  if (!surface.value || document.hidden) return
  surface.value.style.setProperty('--field-x', `${pointerX * 18}px`)
  surface.value.style.setProperty(
    '--field-y',
    `${pointerY * 14 - Math.min(window.scrollY * 0.025, 70)}px`
  )
}
function queue() {
  if (!frame && !document.hidden && !document.querySelector('[aria-modal="true"]'))
    frame = requestAnimationFrame(draw)
}
function move(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  pointerX = event.clientX / window.innerWidth - 0.5
  pointerY = event.clientY / window.innerHeight - 0.5
  queue()
}
function disconnect() {
  window.removeEventListener('pointermove', move)
  window.removeEventListener('scroll', queue)
  cancelAnimationFrame(frame)
  frame = 0
  listening = false
}
function connect() {
  disconnect()
  if (!props.enabled || reduced.value) return
  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('scroll', queue, { passive: true })
  listening = true
}
onMounted(connect)
watch([() => props.enabled, reduced], () => {
  if (surface.value) connect()
})
onBeforeUnmount(() => {
  if (listening) disconnect()
})
</script>
