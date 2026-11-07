<template><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" v-html="paths" /></template>
<script setup lang="ts">
import { computed } from 'vue'
import { useJournal } from './context'
const props = defineProps<{ name: string }>()
const runtime = useJournal()
const paths = computed(() =>
  (runtime.value?.UI.icon(props.name) || '').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
)
</script>
