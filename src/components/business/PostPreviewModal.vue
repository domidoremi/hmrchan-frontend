<template>
  <Teleport to="body">
    <Transition name="post-preview">
      <div
        v-if="isOpen"
        class="post-preview-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('post.preview', 'Post preview')"
        @click.self="close"
      >
        <div ref="panelRef" class="post-preview-panel" tabindex="-1">
          <header class="post-preview-header">
            <div class="post-preview-title">
              <h2 class="post-preview-heading">{{ displayTitle }}</h2>
              <p v-if="displayAuthor" class="post-preview-author">{{ displayAuthor }}</p>

              <div
                v-if="displayPlatform || displayPublishedAt || displayDuration || displayMediaCount"
                class="post-preview-meta"
                aria-hidden="true"
              >
                <span v-if="platformLabel" class="meta-pill">{{ platformLabel }}</span>
                <span v-if="displayPublishedAt" class="meta-pill">{{ publishedLabel }}</span>
                <span v-if="displayDuration" class="meta-pill">{{ durationLabel }}</span>
                <span v-else-if="displayMediaCount && displayMediaCount > 1" class="meta-pill">
                  {{ displayMediaCount }}
                </span>
                <span v-if="displayViews !== null" class="meta-pill">
                  {{ displayViews }} {{ $t('post.views') }}
                </span>
                <span v-if="displayLikes !== null" class="meta-pill">
                  {{ displayLikes }} {{ $t('post.likes') }}
                </span>
              </div>
            </div>

            <div class="post-preview-actions">
              <button
                type="button"
                class="post-preview-btn post-preview-btn--primary"
                :disabled="!postId"
                @click="openDetail"
              >
                {{ $t('post.viewDetail', 'View detail') }}
              </button>
              <button type="button" class="post-preview-btn" @click="close">
                {{ $t('common.close') }}
              </button>
            </div>
          </header>

          <div class="post-preview-body">
            <div class="post-preview-media">
              <div v-if="primaryMedia" class="post-preview-media-frame">
                <img
                  v-if="primaryMedia.file_type === 'image'"
                  class="post-preview-media-item"
                  :src="imageSrc"
                  :alt="post?.title || ''"
                  loading="eager"
                  decoding="async"
                />

                <VideoPlayer
                  v-else-if="primaryMedia.file_type === 'video'"
                  class="post-preview-media-item"
                  :src="videoSrc"
                  :poster="videoPoster"
                  :subtitles="primaryMedia.subtitles ?? null"
                  playsinline
                />
              </div>
              <div v-else-if="initialMediaSrc" class="post-preview-media-frame">
                <img
                  class="post-preview-media-item"
                  :src="initialMediaSrc"
                  :alt="displayTitle || ''"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div v-else class="post-preview-media-empty">
                <div v-if="isLoading" class="post-preview-loading" aria-label="loading">
                  <span class="spinner" />
                </div>
                <p v-else class="post-preview-empty-text">{{ $t('post.noMedia', 'No media') }}</p>
              </div>

              <div
                v-if="post?.media_files?.length && post.media_files.length > 1"
                class="post-preview-thumbs"
              >
                <button
                  v-for="(m, idx) in post.media_files"
                  :key="m.id"
                  type="button"
                  class="thumb"
                  :class="{ active: idx === activeMediaIndex }"
                  @click="activeMediaIndex = idx"
                >
                  <img
                    class="thumb-img"
                    :src="getMediaThumbnailUrl(m.id, 'small')"
                    :alt="post?.title || ''"
                  />
                </button>
              </div>
            </div>

            <div class="post-preview-content">
              <div v-if="loadError" class="post-preview-error">
                <p class="post-preview-error-text">{{ loadError }}</p>
                <button type="button" class="post-preview-btn" @click="reload">
                  {{ $t('common.retry') }}
                </button>
              </div>

              <p v-else-if="hasDisplayContent" class="post-preview-text">
                {{ displayContent }}
              </p>

              <div v-else-if="isLoading" class="post-preview-skeleton" aria-hidden="true">
                <div class="skeleton" style="height: 18px; width: 75%" />
                <div class="skeleton" style="height: 18px; width: 92%" />
                <div class="skeleton" style="height: 18px; width: 88%" />
                <div class="skeleton" style="height: 18px; width: 80%" />
              </div>

              <p v-else class="post-preview-text post-preview-text--muted">
                {{ $t('common.noDescription', 'No description') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { postService, type PostDetailResponse, type PostListItem } from '@/api'
import { useCachedPost } from '@/composables/useCachedPosts'
import { getMediaStreamUrl, getMediaThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatRelativeTime } from '@/utils/date'
import VideoPlayer from '@/components/ui/VideoPlayer.vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    postId: string | null
    /** Optional list item to render immediately (avoid blank modal while loading detail) */
    initialPost?: PostListItem | null
    /** Optional thumbnail to render immediately as media placeholder */
    initialThumbnailSrc?: string | null
  }>(),
  {
    isOpen: false,
    postId: null,
    initialPost: null,
    initialThumbnailSrc: null,
  }
)

const { t } = useI18n()

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  openDetail: [id: string]
}>()

const panelRef = ref<HTMLElement | null>(null)

let previousBodyOverflow: string | null = null

function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow === null) previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  if (previousBodyOverflow === null) return
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = null
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

const { load } = useCachedPost<PostDetailResponse>(postService.getPost, {
  revalidate: false,
})

const post = ref<PostDetailResponse | null>(null)
const activeMediaIndex = ref(0)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

async function reload() {
  const id = props.postId
  if (!props.isOpen || !id) return

  isLoading.value = true
  loadError.value = null

  try {
    const res = await load(id)
    post.value = res.data
  } catch (e) {
    post.value = null
    loadError.value = e instanceof Error ? e.message : t('common.error')
  } finally {
    isLoading.value = false
  }
}

watch(
  () => ({ open: props.isOpen, id: props.postId }),
  async ({ open, id }) => {
    if (!open) return

    // avoid showing stale detail content from previous open
    post.value = null

    activeMediaIndex.value = 0

    await nextTick()
    panelRef.value?.focus()

    if (!id) {
      post.value = null
      loadError.value = null
      isLoading.value = false
      return
    }

    void reload()
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      lockBodyScroll()
      window.addEventListener('keydown', onKeydown)
    } else {
      unlockBodyScroll()
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unlockBodyScroll()
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})

const primaryMedia = computed(() => post.value?.media_files?.[activeMediaIndex.value] ?? null)

const displayTitle = computed(
  () => post.value?.title || props.initialPost?.title || t('post.preview', 'Post preview')
)

const displayAuthor = computed(
  () => post.value?.author_name || props.initialPost?.author_name || ''
)

const displayContent = computed(() => post.value?.content || props.initialPost?.content || '')

const hasDisplayContent = computed(() => Boolean(displayContent.value?.trim()))

const displayPlatform = computed(() => post.value?.platform || props.initialPost?.platform || '')

const displayPublishedAt = computed(
  () => post.value?.published_at || props.initialPost?.published_at || ''
)

const displayDuration = computed(() => post.value?.duration || props.initialPost?.duration || null)

const displayMediaCount = computed(
  () => post.value?.media_count || props.initialPost?.media_count || null
)

const displayViews = computed(() => {
  const v = post.value?.view_count ?? props.initialPost?.view_count
  return typeof v === 'number' ? v : null
})

const displayLikes = computed(() => {
  const v = post.value?.like_count ?? props.initialPost?.like_count
  return typeof v === 'number' ? v : null
})

const initialMediaSrc = computed(() => {
  return props.initialThumbnailSrc || props.initialPost?.thumbnail_url || ''
})

const platformLabel = computed(() => {
  const raw = displayPlatform.value
  if (!raw) return ''

  const map: Record<string, string> = {
    bilibili: 'Bilibili',
    youtube: 'YouTube',
    twitter: 'X',
    instagram: 'Instagram',
    pixiv: 'Pixiv',
    weibo: 'Weibo',
    tiktok: 'TikTok',
  }

  return map[raw] ?? raw.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const publishedLabel = computed(() => {
  const v = displayPublishedAt.value
  if (!v) return ''
  return formatRelativeTime(v, t)
})

const durationLabel = computed(() => {
  const total = displayDuration.value
  if (!total || total <= 0) return ''
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
})

const videoSrc = computed(() => {
  const m = primaryMedia.value
  if (!m) return ''
  return getMediaStreamUrl(m.id)
})

const videoPoster = computed(() => {
  const m = primaryMedia.value
  if (!m) return ''
  return getMediaThumbnailUrl(m.id, 'large')
})

const imageSrc = computed(() => {
  const m = primaryMedia.value
  if (!m) return ''
  return getMediaStreamUrl(m.id)
})

function close() {
  emit('update:isOpen', false)
}

function openDetail() {
  if (!props.postId) return
  emit('openDetail', props.postId)
  // allow parent to decide whether to close or keep open
}
</script>

<style scoped>
.post-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  will-change: opacity;
}

.post-preview-panel {
  will-change: transform, opacity;
}

.post-preview-enter-active,
.post-preview-leave-active {
  transition: opacity 0.22s var(--ease-out);
}

.post-preview-enter-from,
.post-preview-leave-to {
  opacity: 0;
}

.post-preview-enter-active .post-preview-panel,
.post-preview-leave-active .post-preview-panel {
  transition:
    transform 0.28s var(--ease-spring),
    opacity 0.2s var(--ease-out);
}

.post-preview-enter-from .post-preview-panel,
.post-preview-leave-to .post-preview-panel {
  opacity: 0;
  transform: translate3d(0, 18px, 0) scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .post-preview-enter-active,
  .post-preview-leave-active,
  .post-preview-enter-active .post-preview-panel,
  .post-preview-leave-active .post-preview-panel {
    transition: opacity 0.12s ease;
  }

  .post-preview-enter-from .post-preview-panel,
  .post-preview-leave-to .post-preview-panel {
    transform: none;
  }
}

@supports not (backdrop-filter: blur(1px)) {
  .post-preview-overlay {
    background: rgba(0, 0, 0, 0.75);
  }
}

.post-preview-panel {
  width: min(1100px, calc(100vw - 2 * var(--spacing-4)));
  height: min(760px, calc(100vh - 2 * var(--spacing-4)));
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 10, 14, 0.86);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  outline: none;
}

.post-preview-header {
  padding: var(--spacing-4);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.post-preview-heading {
  margin: 0;
  font-size: var(--text-lg);
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.95);
}

.post-preview-author {
  margin: var(--spacing-1) 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.post-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.86);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.post-preview-actions {
  display: flex;
  gap: var(--spacing-2);
}

.post-preview-btn {
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.post-preview-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}

.post-preview-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.post-preview-btn--primary {
  background: var(--gradient-primary);
  border-color: transparent;
  color: white;
}

.post-preview-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.post-preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 900px) {
  .post-preview-body {
    grid-template-columns: minmax(0, 1fr) 420px;
  }
}

.post-preview-media {
  position: relative;
  min-width: 0;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.post-preview-media-frame {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-preview-media-item {
  width: 100%;
  height: 100%;
  max-width: 900px;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--radius-xl);
  background: rgba(0, 0, 0, 0.35);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.35),
    0 8px 24px rgba(0, 0, 0, 0.25);
}

.post-preview-media-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

.post-preview-empty-text {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
}

.post-preview-thumbs {
  display: flex;
  gap: var(--spacing-2);
  overflow-x: auto;
  padding-bottom: var(--spacing-1);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.post-preview-thumbs::-webkit-scrollbar {
  display: none;
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  flex: 0 0 auto;
}

.thumb.active {
  border-color: rgba(var(--color-primary-rgb), 0.8);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.post-preview-content {
  min-width: 0;
  padding: var(--spacing-4);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  overflow: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge legacy */
}

.post-preview-content::-webkit-scrollbar {
  display: none;
}

.post-preview-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.post-preview-error-text {
  margin: 0 0 var(--spacing-3);
  color: rgba(255, 255, 255, 0.75);
}

@media (max-width: 899px) {
  .post-preview-content {
    border-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.post-preview-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  overflow-wrap: anywhere;
}

.post-preview-text--muted {
  color: rgba(255, 255, 255, 0.65);
}
</style>
