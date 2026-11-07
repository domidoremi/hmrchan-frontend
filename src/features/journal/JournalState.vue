<template>
  <div v-if="loading || error || empty" class="journal-state" role="status">
    <p>{{ error || (loading ? '加载中…' : '暂无动态') }}</p>
    <button v-if="error" class="button button-outline button-small" @click="$emit('retry')">
      重试
    </button>
  </div>
</template>
<script setup lang="ts">
defineProps<{ loading: boolean; error: string; empty?: boolean }>()
defineEmits<{ retry: [] }>()
</script>
