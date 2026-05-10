<template>
  <RouterView />
  <DeskPetHost v-if="decorationsReady" />
</template>

<script setup lang="ts">
import { defineAsyncComponent, nextTick, onMounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

const DeskPetHost = defineAsyncComponent(() => import('@/hmr/components/DeskPetHost.vue'))

const router = useRouter()
const decorationsReady = ref(false)

onMounted(async () => {
  await router.isReady()
  await nextTick()
  window.requestAnimationFrame(() => {
    decorationsReady.value = true
  })
})
</script>
