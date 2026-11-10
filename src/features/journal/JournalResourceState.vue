<template>
  <div v-if="state !== 'ready' || empty" class="home-resource-state" :data-state="state">
    <p role="status">{{ message }}</p>
    <button
      v-if="state === 'error'"
      class="button button-outline button-small"
      :aria-label="`重新加载${label}`"
      @click="$emit('retry')"
    >
      重试
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { JournalResourceState } from './resourceState'
const props = defineProps<{
  state: JournalResourceState
  label: string
  empty: boolean
  emptyMessage: string
}>()
defineEmits<{ retry: [] }>()
const message = computed(() =>
  props.state === 'error'
    ? `${props.label}暂时无法加载`
    : props.state === 'ready'
      ? props.emptyMessage
      : `正在加载${props.label}…`
)
</script>
