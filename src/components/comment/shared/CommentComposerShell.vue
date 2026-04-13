<template>
  <div class="comment-composer-shell">
    <slot v-if="!authenticated" name="guest" />
    <div v-else class="comment-composer-shell__card">
      <div class="comment-composer-shell__layout">
        <Avatar
          :src="avatarSrc"
          :alt="avatarAlt"
          :fallback="avatarFallback"
          size="custom"
          class="comment-composer-shell__avatar"
        />

        <div class="comment-composer-shell__panel">
          <header class="comment-composer-shell__header">
            <div class="comment-composer-shell__copy">
              <strong class="comment-composer-shell__title">{{ title }}</strong>
              <span v-if="subtitle" class="comment-composer-shell__subtitle">{{ subtitle }}</span>
            </div>
            <span class="comment-composer-shell__count">{{ charCount }}/{{ maxLength }}</span>
          </header>

          <div v-if="$slots.toolbar" class="comment-composer-shell__toolbar">
            <slot name="toolbar" />
          </div>

          <div class="comment-composer-shell__editor">
            <slot />
          </div>

          <div v-if="$slots.attachments" class="comment-composer-shell__attachments">
            <slot name="attachments" />
          </div>

          <footer class="comment-composer-shell__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'

defineProps<{
  authenticated: boolean
  avatarSrc?: string | null
  avatarAlt?: string
  avatarFallback?: string
  title: string
  subtitle?: string
  charCount: number
  maxLength: number
}>()
</script>

<style scoped>
.comment-composer-shell {
  display: grid;
}

.comment-composer-shell__card {
  border-radius: clamp(1.1rem, 2vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 82%, transparent);
  background: color-mix(in srgb, var(--ui-compat-surface-elevated) 94%, transparent);
  box-shadow: 0 1rem 2.5rem rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.comment-composer-shell__layout {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--spacing-4);
  padding: clamp(1rem, 2.4vw, 1.25rem);
}

.comment-composer-shell__avatar.ui-avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 82%, transparent);
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 88%, transparent);
}

.comment-composer-shell__panel {
  display: grid;
  gap: 0.875rem;
  min-inline-size: 0;
}

.comment-composer-shell__header,
.comment-composer-shell__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.comment-composer-shell__copy {
  display: grid;
  gap: 0.25rem;
  min-inline-size: 0;
}

.comment-composer-shell__title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.comment-composer-shell__subtitle {
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.comment-composer-shell__count {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-composer-shell__toolbar,
.comment-composer-shell__footer {
  padding: 0.75rem 0.875rem;
  border-radius: 1rem;
  background: color-mix(in srgb, var(--ui-compat-surface-interactive) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 72%, transparent);
}

.comment-composer-shell__editor {
  min-block-size: 7.5rem;
  padding: 0.25rem 0.125rem;
}

.comment-composer-shell__attachments {
  display: grid;
}

@media (max-width: 768px) {
  .comment-composer-shell__layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }

  .comment-composer-shell__header,
  .comment-composer-shell__footer {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
