<template>
  <div ref="root" class="home-atmosphere" aria-hidden="true">
    <div class="home-atmosphere-field">
      <div class="home-light"><i /><i /></div>
      <div class="home-orbit"><i /><i /></div>
      <div class="home-rule" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createResizeObserver } from '@/utils/modernAPIs'
import { useHomeScroll } from './useHomeScroll'

useHomeScroll()

const root = ref<HTMLElement>()
const lifetime = new AbortController()
let frame = 0
let resize: ResizeObserver | null = null
let mutation: MutationObserver | undefined
let items: HTMLElement[] = []
function collect() {
  items = [
    ...(root.value?.parentElement?.querySelectorAll<HTMLElement>(
      '.home-reading-grid .post-card, .month-poster, .editorial-discussion, .archive-discussion-row, .archive-agenda article'
    ) ?? []),
  ]
  schedule()
}
function update() {
  frame = 0
  const home = root.value?.parentElement
  if (!home || document.hidden) return
  const bounds = home.getBoundingClientRect()
  const progress = Math.min(1, Math.max(0, -bounds.top / Math.max(1, bounds.height - innerHeight)))
  const full = document.body.dataset['motion'] === 'full'
  const positions = items.map((item) => ({ item, bounds: item.getBoundingClientRect() }))
  home.style.setProperty('--home-progress', String(full ? progress * 4 : 0))
  for (const { item, bounds } of positions) {
    const offset = (innerHeight / 2 - bounds.top - bounds.height / 2) / innerHeight
    item.style.setProperty('--view-offset', String(full ? Math.max(-1, Math.min(1, offset)) : 0))
  }
}
function schedule() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(update)
}
onMounted(() => {
  const options = { passive: true, signal: lifetime.signal }
  window.addEventListener('scroll', schedule, options)
  window.addEventListener('resize', schedule, options)
  document.addEventListener('journalmotionchange', schedule, options)
  document.addEventListener('visibilitychange', schedule, options)
  resize = createResizeObserver(schedule)
  if (root.value?.parentElement) {
    resize?.observe(root.value.parentElement)
    mutation = new MutationObserver(collect)
    mutation.observe(root.value.parentElement, { childList: true, subtree: true })
  }
  collect()
  update()
})
onBeforeUnmount(() => {
  lifetime.abort()
  resize?.disconnect()
  mutation?.disconnect()
  cancelAnimationFrame(frame)
})
</script>
