<template>
  <div class="archive-navigation-hint">
    <p role="status" aria-live="polite" aria-atomic="true">
      <span class="selection-marker" aria-hidden="true" />
      {{ total ? `已选 ${index + 1} / ${total}` : '暂无记录' }}
      <span v-if="title" class="sr-only">：{{ title }}</span>
    </p>
    <span :id="`${previewId}-hint`" class="keyboard-guide">
      <span><kbd>↑ ↓</kbd> 选择</span><span><kbd>Enter</kbd> 打开</span>
      <span><kbd>→</kbd> 预览 · <kbd>Esc</kbd> 返回列表</span>
    </span>
  </div>
</template>
<script setup lang="ts">
defineProps<{ index: number; total: number; previewId: string; title?: string | undefined }>()
</script>
