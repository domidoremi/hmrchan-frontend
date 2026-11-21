<template>
  <svg
    ref="ribbon"
    class="liquid-glass"
    viewBox="0 0 1000 96"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="journal-glass-ribbon" x2="1" y2="1">
        <stop stop-color="#43a6b7" stop-opacity=".3" />
        <stop offset=".43" stop-color="#9b9be2" stop-opacity=".44" />
        <stop offset=".72" stop-color="#f3a582" stop-opacity=".42" />
        <stop offset="1" stop-color="#64bba6" stop-opacity=".48" />
      </linearGradient>
    </defs>
    <g class="liquid-glass__flow">
      <path
        fill="url(#journal-glass-ribbon)"
        d="M-90 35C98 7 239 12 392 50s366 58 698-28v19C821 126 628 97 390 67S91 39-90 75Z"
      />
      <path
        class="liquid-glass__edge"
        d="M-90 38C98 9 239 13 392 51s366 58 698-27M-90 45C98 16 239 20 392 58s366 58 698-27M-90 69C91 33 195 35 390 64s431 59 700-26"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

const ribbon = useTemplateRef<SVGSVGElement>('ribbon')
const lifetime = new AbortController()
let frame = 0
let pointer = 0

onMounted(() => {
  const art = ribbon.value
  const header = art?.closest('header')
  if (!art || !header) return
  const options = { passive: true, signal: lifetime.signal }
  const reset = () => {
    cancelAnimationFrame(frame)
    frame = 0
    art.style.removeProperty('--lens-shift')
  }
  header.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'touch' || document.body.dataset['motion'] !== 'full') return
      pointer = event.clientX
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const { left, width } = header.getBoundingClientRect()
        if (width) art.style.setProperty('--lens-shift', `${((pointer - left) / width - 0.5) * 9}%`)
      })
    },
    options
  )
  header.addEventListener('pointerleave', reset, options)
  document.addEventListener('journalmotionchange', reset, options)
  lifetime.signal.addEventListener('abort', reset, { once: true })
})

onBeforeUnmount(() => lifetime.abort())
</script>
