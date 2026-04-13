<template>
  <article
    class="post-preview-card"
    :class="[`post-preview-card--${variant}`, { 'post-preview-card--placeholder': !hasThumbnail }]"
    role="button"
    tabindex="0"
    @click="$emit('select', preview)"
    @keydown.enter.prevent="$emit('select', preview)"
    @keydown.space.prevent="$emit('select', preview)"
  >
    <div class="post-preview-card__media">
      <ThumbnailImage
        v-if="hasThumbnail"
        class="post-preview-card__thumbnail"
        :src="preview.thumbnailUrl"
        :alt="preview.title"
        :sizes="sizes"
        responsive
        loading="lazy"
        decoding="async"
      />
      <div v-else class="post-preview-card__placeholder">
        <div class="post-preview-card__placeholder-icon">
          <ImageOff :size="18" />
        </div>
        <div class="post-preview-card__placeholder-copy">
          <span class="post-preview-card__placeholder-label">{{ emptyLabel }}</span>
          <span class="post-preview-card__placeholder-hint">{{ emptyHint }}</span>
        </div>
      </div>

      <div v-if="$slots.badge" class="post-preview-card__badge">
        <slot name="badge" />
      </div>

      <div v-if="$slots.actions" class="post-preview-card__actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="post-preview-card__content">
      <h3 class="post-preview-card__title" :title="preview.title">
        {{ preview.title }}
      </h3>
      <p v-if="preview.authorName" class="post-preview-card__author">
        {{ preview.authorName }}
      </p>
      <div v-if="$slots.meta" class="post-preview-card__meta">
        <slot name="meta" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ImageOff } from '@lucide/vue'
import ThumbnailImage from '@/components/ui/ThumbnailImage.vue'
import type { PostPreviewModel } from './postPreview'

const props = withDefaults(
  defineProps<{
    preview: PostPreviewModel
    variant?: 'masonry' | 'grid'
    sizes?: string
    emptyLabel?: string
    emptyHint?: string
  }>(),
  {
    variant: 'masonry',
    sizes: '(max-width: 500px) 100vw, (max-width: 900px) 50vw, 25vw',
    emptyLabel: 'No preview',
    emptyHint: 'This item has no media thumbnail yet.',
  }
)

defineEmits<{
  select: [preview: PostPreviewModel]
}>()

const hasThumbnail = computed(() => Boolean(props.preview.thumbnailUrl))
</script>

<style scoped>
.post-preview-card {
  position: relative;
  display: grid;
  overflow: hidden;
  cursor: pointer;
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg-soft);
  box-shadow: var(--profile-surface-shadow);
  transition:
    transform var(--duration-normal) var(--ease-out-smooth),
    box-shadow var(--duration-normal) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.post-preview-card:hover,
.post-preview-card:focus-visible {
  outline: none;
  transform: var(--lift-sm);
  border-color: var(--profile-surface-border-strong);
  box-shadow: var(--profile-surface-shadow-hover);
}

.post-preview-card__media {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--profile-muted-bg);
}

.post-preview-card__thumbnail {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-smooth);
}

.post-preview-card:hover .post-preview-card__thumbnail,
.post-preview-card:focus-visible .post-preview-card__thumbnail {
  transform: scale(1.02);
}

.post-preview-card__content {
  display: grid;
  gap: var(--spacing-2);
  padding: clamp(0.75rem, 1.8vw, 0.95rem);
  min-inline-size: 0;
}

.post-preview-card__title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  line-height: 1.45;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-preview-card__author {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.post-preview-card__meta {
  display: grid;
  gap: var(--spacing-2);
}

.post-preview-card__actions,
.post-preview-card__badge {
  position: absolute;
  z-index: 1;
}

.post-preview-card__actions {
  inset-block-start: var(--spacing-2);
  inset-inline-end: var(--spacing-2);
  display: flex;
  gap: var(--spacing-2);
}

.post-preview-card__badge {
  inset-block-end: var(--spacing-2);
  inset-inline-end: var(--spacing-2);
}

.post-preview-card__placeholder {
  inline-size: 100%;
  block-size: 100%;
  display: grid;
  place-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  text-align: center;
  background:
    radial-gradient(circle at top, rgba(var(--color-primary-rgb), 0.12), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05));
}

.post-preview-card__placeholder-icon {
  inline-size: 2.75rem;
  block-size: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.post-preview-card__placeholder-copy {
  display: grid;
  gap: 0.25rem;
  max-inline-size: 15rem;
}

.post-preview-card__placeholder-label {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.post-preview-card__placeholder-hint {
  font-size: var(--text-xs);
  line-height: 1.45;
  color: var(--color-text-tertiary);
}

.post-preview-card--grid .post-preview-card__media {
  aspect-ratio: 4 / 3;
}

@media (max-width: 768px) {
  .post-preview-card__content {
    padding: 0.75rem;
  }

  .post-preview-card__actions {
    opacity: 1;
  }
}
</style>
