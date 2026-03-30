<template>
  <div class="thread-toolbar paper-rule" role="toolbar" :aria-label="$t('comment.toolbar.label')">
    <button
      v-for="tool in visibleTools"
      :key="tool.id"
      type="button"
      class="thread-toolbar__button"
      :disabled="disabled"
      :aria-label="$t(tool.label)"
      :title="$t(tool.label)"
      @click="$emit('action', tool.id)"
    >
      <component :is="tool.icon" :size="16" />
      <span class="thread-toolbar__label">{{ $t(tool.label) }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtSign, Code2, Link2, MessageCircleHeart, Paperclip, Quote } from 'lucide-vue-next'

interface Props {
  disabled?: boolean
  showMediaAction?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  showMediaAction: false,
})

const tools = [
  { id: 'emoji', label: 'comment.toolbar.emoji', icon: MessageCircleHeart },
  { id: 'mention', label: 'comment.toolbar.mention', icon: AtSign },
  { id: 'link', label: 'comment.toolbar.link', icon: Link2 },
  { id: 'quote', label: 'comment.toolbar.quote', icon: Quote },
  { id: 'code', label: 'comment.toolbar.code', icon: Code2 },
  { id: 'media', label: 'comment.toolbar.media', icon: Paperclip },
] as const

const visibleTools = computed(() =>
  tools.filter((tool) => (tool.id === 'media' ? props.showMediaAction : true))
)

defineEmits<{
  action: [tool: 'emoji' | 'mention' | 'link' | 'quote' | 'code' | 'media']
}>()
</script>

<style scoped>
.thread-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  padding-block-end: 0.7rem;
}

.thread-toolbar__button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-inline-size: 0;
  padding-block: 0.45rem;
  padding-inline: 0.72rem;
  border: 1px solid var(--surface-paper-border);
  border-radius: 999rem;
  background: color-mix(in srgb, var(--surface-paper-bg) 84%, rgba(255, 255, 255, 0.3));
  color: var(--surface-paper-ink-soft);
  font-size: var(--text-xs);
  line-height: 1.2;
  transition:
    transform var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.thread-toolbar__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thread-toolbar__label {
  white-space: nowrap;
}

@media (hover: hover) and (pointer: fine) {
  .thread-toolbar__button:hover:not(:disabled) {
    transform: translateY(-0.08rem);
    border-color: var(--surface-paper-border-strong);
    color: var(--surface-paper-ink);
  }
}

@media (max-width: 768px) {
  .thread-toolbar__label {
    display: none;
  }

  .thread-toolbar__button {
    padding-inline: 0.65rem;
  }
}
</style>
