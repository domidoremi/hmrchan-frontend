<template>
  <RouterLink
    :to="postHref"
    class="referenced-post"
    :class="{ 'referenced-post--compact': compact }"
    @click.stop="handleNavigate"
  >
    <ThumbnailImage
      v-if="displayUrl"
      class="referenced-thumb"
      :src="displayUrl"
      :alt="post.title"
      :width="compact ? 36 : 48"
      :height="compact ? 36 : 48"
      loading="lazy"
      decoding="async"
    />
    <div class="referenced-content">
      <span class="referenced-label">{{ t('community.referencedPost') }}</span>
      <span class="referenced-title">{{ post.title }}</span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
defineOptions({ name: 'ReferencedPostPreview' })

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { resolveMediaSources } from '@/utils/mediaOptimizer'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import ThumbnailImage from '@/components/ui/ThumbnailImage.vue'

interface ReferencedPostSummary {
  id: string
  title: string
  media_id?: string | null
  media_type?: string | null
  stream_url?: string | null
  thumbnail_url?: string | null
}

interface Props {
  post: ReferencedPostSummary
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
})

const { t } = useI18n()

const postHref = computed(() => `/post/${props.post.id}`)
const displayUrl = computed(() => resolveMediaSources(props.post).displayUrl)

function handleNavigate() {
  cachePostThumbnailPreview(props.post.id, props.post)
}
</script>

<style scoped>
.referenced-post {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  border-radius: var(--radius-md);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.referenced-post--compact {
  gap: var(--spacing-2);
}

.referenced-thumb {
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.referenced-post--compact .referenced-thumb {
  inline-size: 2.25rem;
  block-size: 2.25rem;
}

.referenced-content {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.referenced-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.referenced-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.referenced-post--compact .referenced-title {
  font-size: var(--text-xs);
}
</style>
