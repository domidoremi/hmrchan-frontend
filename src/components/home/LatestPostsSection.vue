<template>
  <section
    ref="element"
    class="posts posts--bubble home-screen"
    data-scroll-anchor="home-latest"
    :class="{ 'posts--revealed': revealed }"
  >
    <div class="container">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'LatestPostsSection' })

defineProps<{
  revealed: boolean
}>()

const element = ref<HTMLElement | null>(null)

defineExpose({
  element,
})
</script>
