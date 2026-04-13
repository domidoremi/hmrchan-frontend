<template>
  <article class="comment-item-shell" :class="{ 'comment-item-shell--reply': isReply }">
    <div class="comment-item-shell__frame">
      <header class="comment-item-shell__header">
        <div class="comment-item-shell__identity">
          <Avatar
            :src="avatarSrc"
            :alt="avatarAlt"
            :fallback="avatarFallback"
            size="custom"
            class="comment-item-shell__avatar"
          />
          <div class="comment-item-shell__meta">
            <div class="comment-item-shell__meta-main">
              <span class="comment-item-shell__author">{{ author }}</span>
              <slot name="badges" />
            </div>
            <span class="comment-item-shell__time">{{ time }}</span>
          </div>
        </div>
        <div v-if="$slots.menu" class="comment-item-shell__menu">
          <slot name="menu" />
        </div>
      </header>

      <div class="comment-item-shell__body">
        <slot />
      </div>

      <div v-if="$slots.actions" class="comment-item-shell__actions">
        <slot name="actions" />
      </div>

      <div v-if="$slots.reply" class="comment-item-shell__reply">
        <slot name="reply" />
      </div>

      <div v-if="$slots.replies" class="comment-item-shell__replies">
        <slot name="replies" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import Avatar from '@/components/ui/Avatar.vue'

defineProps<{
  author: string
  time: string
  avatarSrc?: string | null
  avatarAlt?: string
  avatarFallback?: string
  isReply?: boolean
}>()
</script>

<style scoped>
.comment-item-shell {
  position: relative;
  padding-left: 0;
}

.comment-item-shell--reply {
  padding-left: 1.25rem;
}

.comment-item-shell--reply::before {
  content: '';
  position: absolute;
  inset-block: 0.25rem auto;
  inset-inline-start: 0.45rem;
  inline-size: 1px;
  block-size: calc(100% - 0.5rem);
  background: linear-gradient(
    180deg,
    rgba(var(--color-primary-rgb), 0.18),
    rgba(var(--color-primary-rgb), 0.04)
  );
}

.comment-item-shell__frame {
  display: grid;
  gap: 0.875rem;
  padding: clamp(0.95rem, 2vw, 1.15rem);
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 82%, transparent);
  background: color-mix(in srgb, var(--ui-compat-surface-elevated) 96%, transparent);
  box-shadow: 0 0.625rem 1.75rem rgba(15, 23, 42, 0.05);
}

.comment-item-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.comment-item-shell__identity {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  min-inline-size: 0;
}

.comment-item-shell__avatar.ui-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.95rem;
  border: 1px solid color-mix(in srgb, var(--ui-compat-border) 82%, transparent);
}

.comment-item-shell--reply .comment-item-shell__avatar.ui-avatar {
  width: 2.1rem;
  height: 2.1rem;
}

.comment-item-shell__meta {
  display: grid;
  gap: 0.25rem;
  min-inline-size: 0;
}

.comment-item-shell__meta-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.comment-item-shell__author {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.comment-item-shell__time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.comment-item-shell__body {
  display: grid;
  gap: var(--spacing-2);
}

.comment-item-shell__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  padding-top: 0.75rem;
  border-top: 1px solid color-mix(in srgb, var(--ui-compat-border) 70%, transparent);
}

.comment-item-shell__reply {
  padding-left: 0.75rem;
}

.comment-item-shell__replies {
  display: grid;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .comment-item-shell--reply {
    padding-left: 0.9rem;
  }

  .comment-item-shell__reply {
    padding-left: 0;
  }
}
</style>
