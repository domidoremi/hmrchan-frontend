<template>
  <section
    ref="element"
    class="posts posts--bubble home-screen"
    data-scroll-anchor="home-latest"
    :class="phaseClasses"
  >
    <div class="container">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'LatestPostsSection' })

const props = defineProps<{
  revealPhase: 'idle' | 'arming' | 'revealed' | 'exiting'
}>()

const phaseClasses = computed(() => ({
  'posts--arming': props.revealPhase === 'arming',
  'posts--revealed': props.revealPhase === 'revealed',
  'posts--exiting': props.revealPhase === 'exiting',
}))

const element = ref<HTMLElement | null>(null)

defineExpose({
  element,
})
</script>
