<template>
  <section
    v-if="enabled"
    class="hero home-screen"
    data-scroll-anchor="home-hero"
    :class="{ 'hero--animated': animated }"
  >
    <div class="container hero-layout">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'HeroSection' })

defineProps<{
  enabled: boolean
  animated: boolean
}>()
</script>
