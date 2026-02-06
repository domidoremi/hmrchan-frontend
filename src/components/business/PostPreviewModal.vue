<template>
  <Teleport to="body">
    <Transition name="post-preview" @after-leave="onAfterLeave">
      <div
        v-if="isOpen"
        class="post-preview-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('post.preview')"
        @click.self="close"
      >
        <div ref="panelRef" class="post-preview-panel" tabindex="-1">
          <div
            ref="sheetRef"
            class="post-preview-sheet"
            :class="{ 'is-dragging': isSheetDragging }"
            :style="sheetDragStyle"
            @pointerdown="onSheetPointerDown"
            @pointermove="onHandlePointerMove"
            @pointerup="onHandlePointerUp"
            @pointercancel="onHandlePointerCancel"
          >
            <button
              type="button"
              class="post-preview-handle"
              :aria-label="$t('common.close')"
              @click="onHandleClick"
              @pointerdown="onHandlePointerDown"
            >
              <span class="post-preview-handle-bar" aria-hidden="true" />
            </button>

            <header class="post-preview-header">
              <button
                type="button"
                class="post-preview-close-icon"
                :aria-label="$t('common.close')"
                @click="close"
              >
                <X :size="18" />
              </button>

              <div class="post-preview-title">
                <h2 class="post-preview-heading">{{ displayTitle }}</h2>
                <p v-if="displayAuthor" class="post-preview-author">{{ displayAuthor }}</p>

                <div
                  v-if="
                    platformLabel ||
                    displayPublishedAt ||
                    displayDuration ||
                    (displayMediaCount && displayMediaCount > 1) ||
                    displayViews !== null ||
                    displayLikes !== null ||
                    subtitlesAvailable
                  "
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
                  <span v-if="subtitlesAvailable" class="meta-pill">
                    {{ $t('post.subtitlesAvailable') }}
                  </span>
                </div>
              </div>
            </header>

            <div class="post-preview-body">
              <div class="post-preview-scroll">
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
                    <p v-else class="post-preview-empty-text">
                      {{ $t('post.noMedia') }}
                    </p>
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
                    <button type="button" class="glass-button" @click="reload">
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
                    {{ displayTitle }}
                  </p>
                </div>
              </div>

              <div class="post-preview-action-bar">
                <PostActionStrip v-if="postId" :post-id="postId" variant="compact" />
                <button
                  type="button"
                  class="glass-button glass-button--primary post-preview-cta"
                  :disabled="!postId"
                  @click="openDetail"
                >
                  {{ $t('post.viewDetail') }}
                </button>
              </div>
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
import { X } from 'lucide-vue-next'
import { postService, type PostDetailResponse, type PostListItem } from '@/api'
import { useCachedPost } from '@/composables/useCachedPosts'
import { prefetchPostDetail } from '@/utils/prefetch'
import { getMediaStreamUrl, getMediaThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import PostActionStrip from '@/components/business/PostActionStrip.vue'
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
const sheetRef = ref<HTMLElement | null>(null)

const sheetDragY = ref(0)
const isSheetDragging = ref(false)

const sheetDragStyle = computed<Record<string, string>>(() => {
  return { '--sheet-drag-y': `${sheetDragY.value}px` }
})

let activePointerId: number | null = null
let dragStartY = 0
let didHandleDrag = false

function onHandlePointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  if (!props.isOpen) return

  activePointerId = e.pointerId
  dragStartY = e.clientY
  didHandleDrag = false
  isSheetDragging.value = true

  try {
    ;(e.currentTarget as HTMLElement | null)?.setPointerCapture(e.pointerId)
  } catch {
    // ignore
  }
}

function onHandlePointerMove(e: PointerEvent) {
  if (!isSheetDragging.value) return
  if (activePointerId === null || e.pointerId !== activePointerId) return

  const dy = e.clientY - dragStartY
  if (dy <= 0) {
    sheetDragY.value = 0
    return
  }

  sheetDragY.value = dy
  if (dy > 4) didHandleDrag = true
}

function finishHandleDrag(shouldClose: boolean) {
  isSheetDragging.value = false
  activePointerId = null

  if (shouldClose) {
    requestClose()
    return
  }

  // Snap back
  sheetDragY.value = 0
}

function onHandlePointerUp(e: PointerEvent) {
  if (!isSheetDragging.value) return
  if (activePointerId === null || e.pointerId !== activePointerId) return

  const height = sheetRef.value?.getBoundingClientRect().height ?? 600
  const threshold = Math.min(180, Math.max(90, Math.round(height * 0.22)))
  const shouldClose = sheetDragY.value > threshold

  finishHandleDrag(shouldClose)
}

function onHandlePointerCancel() {
  if (!isSheetDragging.value) return
  finishHandleDrag(false)
}

function onHandleClick() {
  // Only treat as click-to-close when user didn't drag.
  if (didHandleDrag) return
  requestClose()
}

function onSheetPointerDown(e: PointerEvent) {
  // Allow dragging from most of the sheet, but avoid stealing pointer events from interactive controls.
  const target = e.target as HTMLElement | null
  if (!target) return

  // Handle already has its own pointerdown.
  if (target.closest('.post-preview-handle')) return

  // Ignore interactive elements.
  if (target.closest('button, a, input, textarea, select, video, [role="button"], .thumb')) return

  onHandlePointerDown(e)
}

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
  if (e.key === 'Escape') requestClose()
}

const HISTORY_MODAL_KEY = '__postPreviewModal'
let isClosingFromPopState = false

function hasModalHistoryEntry() {
  if (typeof window === 'undefined') return false
  return Boolean(
    window.history.state && (window.history.state as Record<string, unknown>)[HISTORY_MODAL_KEY]
  )
}

function requestClose() {
  // If we injected a history entry for the modal, remove it first so that "Back" always closes the modal.
  if (typeof window !== 'undefined' && hasModalHistoryEntry()) {
    isClosingFromPopState = true
    window.history.back()
    return
  }

  emit('update:isOpen', false)
}

function onPopState() {
  if (!props.isOpen) return
  isClosingFromPopState = true
  emit('update:isOpen', false)
}

const { load } = useCachedPost<PostDetailResponse>(postService.getPost, {
  revalidate: false,
})

const post = ref<PostDetailResponse | null>(null)
const activeMediaIndex = ref(0)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

let loadingTimer: ReturnType<typeof setTimeout> | null = null
let reloadSeq = 0

async function reload() {
  const id = props.postId
  if (!props.isOpen || !id) return

  const seq = ++reloadSeq

  // Avoid flashing loading UI on cache hits.
  if (loadingTimer) {
    clearTimeout(loadingTimer)
    loadingTimer = null
  }
  isLoading.value = false

  loadingTimer = setTimeout(() => {
    if (seq !== reloadSeq) return
    isLoading.value = true
  }, 220)

  loadError.value = null

  try {
    const res = await load(id)
    post.value = res.data
  } catch (e) {
    post.value = null
    loadError.value = e instanceof Error ? e.message : t('common.error')
  } finally {
    if (loadingTimer) {
      clearTimeout(loadingTimer)
      loadingTimer = null
    }
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

    // Load detail (cache-aware) for the preview itself.
    void reload()

    // Warm post comments and other detail-only data for users that click "View detail".
    // This is especially helpful on mobile where hover prefetch doesn't run.
    void prefetchPostDetail(id)
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (open) => {
    if (typeof window === 'undefined') return

    if (open) {
      // reset drag state each time we open
      sheetDragY.value = 0
      isSheetDragging.value = false
      activePointerId = null

      // History integration: add a synthetic entry so Back closes the modal first.
      if (!hasModalHistoryEntry()) {
        window.history.pushState({ ...(window.history.state ?? {}), [HISTORY_MODAL_KEY]: true }, '')
      }

      lockBodyScroll()
      window.addEventListener('keydown', onKeydown)
      window.addEventListener('popstate', onPopState)
    } else {
      // Cancel any delayed loading UI.
      if (loadingTimer) {
        clearTimeout(loadingTimer)
        loadingTimer = null
      }
      reloadSeq += 1
      isLoading.value = false

      // NOTE: drag state is cleaned up in <Transition @after-leave> to preserve the dismiss animation.

      unlockBodyScroll()
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('popstate', onPopState)

      // If the modal was closed by popstate, reset the flag.
      if (isClosingFromPopState) {
        isClosingFromPopState = false
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unlockBodyScroll()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('popstate', onPopState)
  }
})

const primaryMedia = computed(() => post.value?.media_files?.[activeMediaIndex.value] ?? null)

const subtitlesAvailable = computed(() => {
  const m = primaryMedia.value
  return Boolean(m && m.file_type === 'video' && (m.subtitles?.length ?? 0) > 0)
})

const displayTitle = computed(
  () => post.value?.title || props.initialPost?.title || t('post.preview')
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
  return formatDate(v)
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
  requestClose()
}

function onAfterLeave() {
  // Cleanup drag state after the leave animation (avoids snapping back before the sheet slides down).
  sheetDragY.value = 0
  isSheetDragging.value = false
  activePointerId = null
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
  --preview-overlay-bg: var(--color-background);
  --preview-surface-bg: var(--glass-bg-strong);
  --preview-surface-border: var(--glass-border);
  --preview-divider: var(--glass-border);
  --preview-control-bg: rgba(15, 23, 42, 0.04);
  --preview-control-border: rgba(15, 23, 42, 0.12);
  --preview-pill-bg: rgba(15, 23, 42, 0.06);
  --preview-pill-border: rgba(15, 23, 42, 0.12);
  --preview-text-primary: var(--color-text-primary);
  --preview-text-secondary: rgba(30, 41, 59, 0.78);
  --preview-text-muted: rgba(30, 41, 59, 0.6);
  --preview-media-bg: rgba(15, 23, 42, 0.04);
  background: var(--preview-overlay-bg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  will-change: opacity;
}
:global(#app[data-theme='dark'] .post-preview-overlay) {
  --preview-overlay-bg: #0b0d14;
  --preview-control-bg: rgba(255, 255, 255, 0.08);
  --preview-control-border: rgba(255, 255, 255, 0.12);
  --preview-pill-bg: rgba(255, 255, 255, 0.1);
  --preview-pill-border: rgba(255, 255, 255, 0.16);
  --preview-text-secondary: rgba(226, 232, 240, 0.78);
  --preview-text-muted: rgba(226, 232, 240, 0.6);
  --preview-media-bg: rgba(255, 255, 255, 0.04);
}

.post-preview-panel {
  will-change: transform, opacity;
}

.post-preview-enter-active,
.post-preview-leave-active {
  transition: opacity 0.32s var(--ease-out);
}

.post-preview-enter-from,
.post-preview-leave-to {
  opacity: 0;
}

.post-preview-enter-active .post-preview-panel {
  transition:
    transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s var(--ease-out);
}

.post-preview-leave-active .post-preview-panel {
  transition:
    transform 0.32s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.28s var(--ease-out);
}

.post-preview-enter-from .post-preview-panel {
  opacity: 0;
  transform: translate3d(0, 48px, 0) scale(0.96);
}

.post-preview-leave-to .post-preview-panel {
  opacity: 0;
  transform: translate3d(0, 100%, 0) scale(0.98);
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
    background: var(--preview-overlay-bg);
  }
}

.post-preview-panel {
  width: min(1100px, calc(100vw - 2 * var(--spacing-4)));
  height: min(760px, calc(100vh - 2 * var(--spacing-4)));
  height: min(760px, calc(100svh - 2 * var(--spacing-4)));
  border-radius: var(--ui-radius-dialog, var(--radius-xl));
  overflow: hidden;
  border: 1px solid var(--preview-surface-border);
  background: var(--preview-surface-bg);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  outline: none;
}

.post-preview-sheet {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  transform: translate3d(0, var(--sheet-drag-y, 0px), 0);
  touch-action: none;
  transition: transform 200ms var(--ease-out);
  will-change: transform;
}

.post-preview-sheet.is-dragging {
  transition: none;
}

.post-preview-header {
  position: relative;
  padding: var(--spacing-4);
  padding-right: calc(var(--spacing-4) + var(--ui-control-min-size, 44px));
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--spacing-3);
  border-bottom: 1px solid var(--preview-divider);
}

.post-preview-close-icon {
  position: absolute;
  top: var(--spacing-3);
  right: var(--spacing-3);
  width: var(--ui-control-min-size, 44px);
  height: var(--ui-control-min-size, 44px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: var(--preview-control-bg);
  border: 1px solid var(--preview-control-border);
  color: var(--preview-text-primary);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
  flex: 0 0 auto;
}

.post-preview-close-icon:hover {
  transform: translateY(-1px);
  background: var(--glass-bg-strong);
}

.post-preview-close-icon:active {
  transform: scale(0.98);
}

.post-preview-handle {
  display: none;
}

.post-preview-handle-bar {
  width: 40px;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--preview-control-border);
}

.post-preview-title {
  min-width: 0;
}

.post-preview-heading {
  margin: 0;
  font-size: var(--text-lg);
  line-height: 1.2;
  color: var(--preview-text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-preview-author {
  margin: var(--spacing-1) 0 0;
  color: var(--preview-text-secondary);
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
}

.post-preview-meta {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
  overflow: hidden;
  white-space: nowrap;

  /* soften cut-off without introducing scrollbars */
  -webkit-mask-image: linear-gradient(90deg, #000 0%, #000 88%, transparent 100%);
  mask-image: linear-gradient(90deg, #000 0%, #000 88%, transparent 100%);
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  color: var(--preview-text-secondary);
  background: var(--preview-pill-bg);
  border: 1px solid var(--preview-pill-border);
  flex: 0 0 auto;
}

.post-preview-btn {
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--preview-control-border);
  background: var(--preview-control-bg);
  color: var(--preview-text-primary);
  white-space: nowrap;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.post-preview-btn:hover {
  transform: translateY(-1px);
  background: var(--glass-bg-strong);
}

.post-preview-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.post-preview-cta {
  font-weight: var(--font-semibold);
}

.post-preview-btn--primary {
  background: var(--gradient-primary);
  border-color: transparent;
  color: white;
}

.post-preview-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.post-preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 900px) {
  .post-preview-scroll {
    grid-template-columns: minmax(0, 1fr) 420px;
  }
}

.post-preview-scroll {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  overflow: hidden;
}

.post-preview-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border-top: 1px solid var(--preview-divider);
  background: var(--preview-surface-bg);
  backdrop-filter: blur(14px);
}

.post-preview-action-bar .glass-button {
  min-height: var(--ui-control-min-size, 44px);
}

.post-preview-action-bar .post-action-strip {
  flex: 1;
  min-width: 0;
}

.post-preview-action-bar .post-preview-cta {
  flex: 0 0 auto;
}

.post-preview-media {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  overflow: hidden;
}

.post-preview-media-frame {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  max-height: min(58vh, 560px);
  border-radius: var(--radius-2xl);
  background: var(--preview-media-bg);
  border: 1px solid var(--preview-surface-border);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.28),
    0 8px 24px rgba(0, 0, 0, 0.18);
}

.post-preview-media-item {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
}

.post-preview-media-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  border: 1px dashed var(--preview-divider);
}

.post-preview-empty-text {
  margin: 0;
  color: var(--preview-text-secondary);
}

.post-preview-thumbs {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  overflow: hidden;
  padding-bottom: var(--spacing-1);
  max-height: 120px;
}

.thumb {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--preview-control-border);
  background: var(--preview-control-bg);
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
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-4);
  border-left: 1px solid var(--preview-divider);
}

.post-preview-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.post-preview-error-text {
  margin: 0 0 var(--spacing-3);
  color: var(--preview-text-secondary);
}

@media (max-width: 899px) {
  .post-preview-content {
    border-left: 0;
    border-top: 1px solid var(--preview-divider);
  }
}

/* iOS-like mobile sheet */
@media (max-width: 640px) {
  .post-preview-overlay {
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }

  .post-preview-panel {
    width: 100vw;
    height: 92vh;
    height: 92svh;
    border-radius: var(--ui-radius-sheet, 18px) var(--ui-radius-sheet, 18px) 0 0;
  }

  /* Mobile sheet animation: slide from/to bottom instead of scaling */
  .post-preview-enter-from .post-preview-panel {
    transform: translate3d(0, 100%, 0);
  }

  .post-preview-leave-to .post-preview-panel {
    transform: translate3d(0, 100%, 0);
  }

  .post-preview-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 10px 0 6px;
    cursor: pointer;
    touch-action: none;
  }

  .post-preview-header {
    grid-template-columns: 1fr;
    padding-top: var(--spacing-3);
  }

  .post-preview-scroll {
    display: flex;
    flex-direction: column;
  }

  .post-preview-media {
    padding: var(--spacing-3);
    flex: 0 0 auto;
  }

  .post-preview-media-frame {
    height: min(44svh, 420px);
    flex: 0 0 auto;
  }

  .post-preview-content {
    flex: 1;
    min-height: 0;
    padding-bottom: calc(var(--spacing-6) + env(safe-area-inset-bottom, 0px));
    --preview-lines: 6;
  }

  .post-preview-action-bar {
    flex-direction: column;
    align-items: stretch;
    padding-bottom: calc(var(--spacing-3) + env(safe-area-inset-bottom, 0px));
  }

  .post-preview-action-bar .post-preview-cta {
    width: 100%;
  }
}

@media (min-width: 641px) and (max-width: 1023px) {
  .post-preview-content {
    --preview-lines: 8;
  }
}

@media (min-width: 1024px) {
  .post-preview-content {
    --preview-lines: 10;
  }
}

.post-preview-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--preview-text-primary);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--preview-lines, 10);
  line-clamp: var(--preview-lines, 10);
  overflow: hidden;
}

.post-preview-text--muted {
  color: var(--preview-text-muted);
}
</style>
