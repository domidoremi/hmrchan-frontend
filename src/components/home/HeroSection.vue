<template>
  <section v-if="enabled" class="hero home-screen" :class="{ 'hero--animated': animated }">
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
