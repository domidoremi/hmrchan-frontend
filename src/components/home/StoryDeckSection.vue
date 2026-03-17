<template>
  <section ref="element" class="media-slices home-screen" :style="sceneStyle">
    <div class="container story-stage">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, type StyleValue } from 'vue'

defineOptions({ name: 'StoryDeckSection' })

defineProps<{
  sceneStyle: StyleValue
}>()

const element = ref<HTMLElement | null>(null)

defineExpose({
  element,
})
</script>
