<template>
  <div class="stat-card-grid" ref="gridRef">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'

const gridRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!gridRef.value) return

  // Animate children (cards) on entry
  const cards = gridRef.value.children

  gsap.fromTo(cards,
    {
      y: 30,
      opacity: 0,
      scale: 0.9
    },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.2)',
      clearProps: 'all'
    }
  )
})
</script>

<style scoped>
.stat-card-grid {
  display: grid;
  width: 100%;
  /* Mobile: 2 columns by default as requested */
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
  padding: var(--spacing-xs);
}

/* Tablet & Desktop: Adaptive columns */
@media (min-width: 768px) {
  .stat-card-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--spacing-lg);
    padding: var(--spacing-md);
  }
}

/* Deep selector to style the StatCards passed in slots if they don't have their own styles */
:deep(.stat-card) {
  height: 100%;
}
</style>
