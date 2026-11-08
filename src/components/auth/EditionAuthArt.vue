<template>
  <aside
    ref="element"
    class="edition-auth-art"
    :class="{ 'is-visible': visible && foreground }"
    aria-hidden="true"
    data-tilt
  >
    <div class="auth-art-top">
      <span>MOMICHAN</span><span>{{ isArchive ? 'ARCHIVE' : 'JOURNAL' }}</span>
    </div>
    <div class="auth-art-stage">
      <div class="auth-art-deck">
        <div
          v-for="index in 3"
          :key="index"
          class="auth-art-sheet"
          :style="{ '--sheet': index - 1 }"
        >
          <span class="auth-art-index">0{{ index }}</span>
          <span class="auth-art-mark">m.</span>
          <div class="auth-art-lines"><i /><i /><i /></div>
          <span class="auth-art-edition">{{ isArchive ? 'THE ARCHIVE' : 'THE JOURNAL' }}</span>
        </div>
      </div>
    </div>
    <div class="auth-art-bottom"><span>PHOTOS / POSTS / PEOPLE</span><span>↗</span></div>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { designEdition } from '@/config/designEdition'
import { createVisibilityObserver } from '@/utils/modernAPIs'
const isArchive = designEdition === 'archive'
const element = ref<HTMLElement | null>(null)
const visible = ref(false)
const foreground = ref(true)
let observer: IntersectionObserver | undefined
const updateVisibility = () => {
  foreground.value = !document.hidden
}
onMounted(() => {
  updateVisibility()
  document.addEventListener('visibilitychange', updateVisibility)
  if (typeof IntersectionObserver === 'undefined') return
  observer = createVisibilityObserver(([entry]) => {
    visible.value = Boolean(entry?.isIntersecting)
  })
  if (element.value) observer.observe(element.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>
