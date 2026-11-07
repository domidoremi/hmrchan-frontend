<template><div ref="host" class="journal-scene" v-html="markup" /></template>
<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { useJournal } from './context'
const props = defineProps<{
  kind: 'hero' | 'index' | 'panorama' | 'collections' | 'conversation'
}>()
const runtime = useJournal()
const host = ref<HTMLElement>()
const markup = computed(() => {
  const scene = runtime.value
  if (!scene) return ''
  return {
    hero: () => scene.Atelier.hero(0),
    index: () => scene.Atelier.index(),
    panorama: () => scene.Experience.panorama(),
    collections: () => scene.Atelier.collections(),
    conversation: () => scene.Experience.communityFeature(),
  }[props.kind]()
})
watch(
  markup,
  async () => {
    await nextTick()
    if (host.value) runtime.value?.mount(host.value)
  },
  { immediate: true }
)
</script>
