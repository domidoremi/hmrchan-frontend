<template>
  <header class="comment-thread-header" data-testid="comment-thread-header">
    <div class="comment-thread-header__main">
      <h3 class="comment-thread-header__title">
        {{ title }}
        <span class="comment-thread-header__count">{{ count }}</span>
      </h3>
      <p v-if="subtitle" class="comment-thread-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="comment-thread-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  count: number
  subtitle?: string
}>()
</script>

<style scoped>
.comment-thread-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.comment-thread-header__main {
  display: grid;
  gap: 0.35rem;
  min-inline-size: 0;
}

.comment-thread-header__title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: clamp(1rem, 1vw + 0.875rem, 1.2rem);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.comment-thread-header__count {
  display: inline-flex;
  align-items: center;
  min-block-size: 1.65rem;
  padding-inline: 0.65rem;
  border-radius: 999rem;
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.comment-thread-header__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.comment-thread-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

@media (max-width: 768px) {
  .comment-thread-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
