<template>
  <Teleport to="body">
    <Transition name="post-preview" @after-leave="onAfterLeave">
      <div
        v-if="isOpen"
        class="post-preview-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('post.preview')"
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
              :aria-label="t('common.close')"
              @click="onHandleClick"
              @pointerdown="onHandlePointerDown"
            >
              <span class="post-preview-handle-bar" aria-hidden="true" />
            </button>

            <header class="post-preview-header">
              <button
                type="button"
                class="post-preview-close-icon"
                :aria-label="t('common.close')"
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
                  <span v-if="platformLabel" class="post-preview-meta-pill">
                    {{ platformLabel }}
                  </span>
                  <span v-if="displayPublishedAt" class="post-preview-meta-pill">
                    {{ publishedLabel }}
                  </span>
                  <span v-if="displayDuration" class="post-preview-meta-pill">
                    {{ durationLabel }}
                  </span>
                  <span
                    v-else-if="displayMediaCount && displayMediaCount > 1"
                    class="post-preview-meta-pill"
                  >
                    {{ displayMediaCount }}
                  </span>
                  <span v-if="displayViews !== null" class="post-preview-meta-pill">
                    {{ displayViews }} {{ t('post.views') }}
                  </span>
                  <span v-if="displayLikes !== null" class="post-preview-meta-pill">
                    {{ displayLikes }} {{ t('post.likes') }}
                  </span>
                  <span v-if="subtitlesAvailable" class="post-preview-meta-pill">
                    {{ t('post.subtitlesAvailable') }}
                  </span>
                </div>
              </div>
            </header>

            <div class="post-preview-body">
              <div class="post-preview-scroll">
                <div v-if="shouldShowMediaSection" class="post-preview-media">
                  <div v-if="primaryMedia" class="post-preview-media-frame">
                    <img
                      class="post-preview-media-backdrop"
                      :src="mediaBackdropSrc"
                      alt=""
                      aria-hidden="true"
                      loading="eager"
                      decoding="async"
                      fetchpriority="low"
                    />
                    <img
                      v-if="primaryMedia.file_type === 'image'"
                      class="post-preview-media-item"
                      :src="imageSrc"
                      :alt="post?.title || ''"
                      loading="eager"
                      decoding="async"
                      fetchpriority="auto"
                    />

                    <VideoPlayer
                      v-else-if="primaryMedia.file_type === 'video'"
                      class="post-preview-media-video"
                      :src="videoSrc"
                      :poster="videoPoster"
                      :subtitles="primaryMedia.subtitles ?? null"
                      playsinline
                    />
                  </div>
                  <div v-else-if="initialMediaSrc" class="post-preview-media-frame">
                    <img
                      class="post-preview-media-backdrop"
                      :src="initialMediaSrc"
                      alt=""
                      aria-hidden="true"
                      loading="eager"
                      decoding="async"
                      fetchpriority="low"
                    />
                    <img
                      class="post-preview-media-item"
                      :src="initialMediaSrc"
                      :alt="displayTitle || ''"
                      loading="eager"
                      decoding="async"
                      fetchpriority="auto"
                    />
                  </div>
                  <div v-else class="post-preview-media-empty">
                    <div
                      v-if="isLoading"
                      class="post-preview-loading"
                      :aria-label="t('common.loading')"
                    >
                      <span class="spinner" />
                    </div>
                    <template v-else-if="hasDisplayContent && !displayMediaCount">
                      <p class="post-preview-inline-text">{{ displayContent }}</p>
                    </template>
                    <p v-else class="post-preview-empty-text">
                      {{ t('post.noMedia') }}
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
                      class="post-preview-thumb"
                      :class="{ 'is-active': idx === activeMediaIndex }"
                      :aria-pressed="idx === activeMediaIndex"
                      :aria-label="`${t('post.preview')} ${idx + 1}`"
                      @click="activeMediaIndex = idx"
                    >
                      <img
                        class="post-preview-thumb-img"
                        :src="getMediaThumbnailUrl(m.id, 'small')"
                        :alt="post?.title || ''"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  </div>
                </div>

                <div class="post-preview-content">
                  <div v-if="loadError" class="post-preview-error">
                    <p class="post-preview-error-text">{{ loadError }}</p>
                    <button type="button" class="post-preview-btn" @click="reload">
                      {{ t('common.retry') }}
                    </button>
                  </div>

                  <p v-else-if="hasDisplayContent" class="post-preview-text">
                    {{ displayContent }}
                  </p>

                  <div v-else-if="isLoading" class="post-preview-skeleton" aria-hidden="true">
                    <div class="skeleton" style="height: 1.125rem; width: 75%" />
                    <div class="skeleton" style="height: 1.125rem; width: 92%" />
                    <div class="skeleton" style="height: 1.125rem; width: 88%" />
                    <div class="skeleton" style="height: 1.125rem; width: 80%" />
                  </div>

                  <p v-else class="post-preview-text post-preview-text--muted">
                    {{ displayTitle }}
                  </p>
                </div>
              </div>

              <div class="post-preview-action-bar">
                <Suspense>
                  <template #default>
                    <PostActionStrip v-if="postId" :post-id="postId" variant="compact" />
                  </template>
                  <template #fallback>
                    <div class="post-preview-action-placeholder" aria-hidden="true">
                      <span class="post-preview-action-placeholder__pill skeleton" />
                      <span class="post-preview-action-placeholder__button skeleton" />
                      <span class="post-preview-action-placeholder__button skeleton" />
                    </div>
                  </template>
                </Suspense>
                <button
                  type="button"
                  class="post-preview-btn post-preview-btn--primary post-preview-cta"
                  :disabled="!postId"
                  @click="openDetail"
                >
                  {{ t('post.viewDetail') }}
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
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onWatcherCleanup,
  ref,
  watch,
  useTemplateRef,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from '@lucide/vue'
import { postService, type PostDetailResponse, type PostListItem, ApiError } from '@/api'
import { useCachedPost } from '@/composables/useCachedPosts'
import { buildFallbackPostDetail } from '@/fallbacks/postFallback'
import { prefetchPostDetail } from '@/utils/prefetch'
import { getMediaStreamUrl, getMediaThumbnailUrl } from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import VideoPlayer from '@/components/ui/VideoPlayer.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'

const PostActionStrip = defineAsyncComponent(
  () => import('@/components/business/PostActionStrip.vue')
)

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

const panelRef = useTemplateRef<HTMLElement>('panelRef')
const sheetRef = useTemplateRef<HTMLElement>('sheetRef')

const sheetDragY = ref(0)
const isSheetDragging = ref(false)
const returnFocusTarget = ref<HTMLElement | null>(null)

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
  if (
    target.closest(
      'button, a, input, textarea, select, video, [role="button"], .post-preview-thumb'
    )
  ) {
    return
  }

  onHandlePointerDown(e)
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
let loadingTimerSeq = 0
let reloadSeq = 0
let reloadController: AbortController | null = null

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError'
  return error instanceof Error && /abort/i.test(error.message)
}

function clearLoadingTimer(seq?: number) {
  if (!loadingTimer) return
  if (typeof seq === 'number' && loadingTimerSeq !== seq) return
  clearTimeout(loadingTimer)
  loadingTimer = null
  loadingTimerSeq = 0
}

function abortReloadRequest() {
  if (reloadController) {
    reloadController.abort()
    reloadController = null
  }
  reloadSeq += 1
}

function getInitialFallbackPost(postId: string): PostDetailResponse | null {
  if (!props.initialPost || props.initialPost.id !== postId) return null
  return buildFallbackPostDetail(props.initialPost)
}

async function reload() {
  const id = props.postId
  if (!props.isOpen || !id) return

  if (reloadController) {
    reloadController.abort()
  }
  const controller = new AbortController()
  reloadController = controller
  const seq = ++reloadSeq

  // Avoid flashing loading UI on cache hits.
  clearLoadingTimer()
  isLoading.value = false

  loadingTimerSeq = seq
  loadingTimer = setTimeout(() => {
    if (seq !== reloadSeq) return
    isLoading.value = true
  }, 220)

  loadError.value = null

  try {
    const res = await load(id, { signal: controller.signal })
    if (controller.signal.aborted || seq !== reloadSeq) return
    post.value = res.data
  } catch (e) {
    if (controller.signal.aborted || isAbortError(e) || seq !== reloadSeq) return
    if (e instanceof ApiError && e.status === 404) {
      const fallbackPost = getInitialFallbackPost(id)
      if (fallbackPost) {
        post.value = fallbackPost
        loadError.value = null
        return
      }
    }
    post.value = null
    loadError.value = e instanceof Error ? e.message : t('common.error')
  } finally {
    clearLoadingTimer(seq)
    if (seq === reloadSeq && reloadController === controller) {
      isLoading.value = false
      reloadController = null
    }
  }
}

watch(
  () => ({ open: props.isOpen, id: props.postId }),
  ({ open, id }) => {
    if (!open) return
    onWatcherCleanup(() => {
      abortReloadRequest()
      clearLoadingTimer()
      isLoading.value = false
    })

    // avoid showing stale detail content from previous open
    post.value = null

    activeMediaIndex.value = 0

    if (typeof document !== 'undefined') {
      returnFocusTarget.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    }

    void nextTick(() => panelRef.value?.focus({ preventScroll: true }))

    if (!id) {
      abortReloadRequest()
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

      lockBodyScroll({ preserveScrollY: true })
      window.addEventListener('keydown', onKeydown)
      window.addEventListener('popstate', onPopState)
    } else {
      // Cancel any delayed loading UI.
      abortReloadRequest()
      clearLoadingTimer()
      isLoading.value = false

      // NOTE: drag state is cleaned up in <Transition @after-leave> to preserve the dismiss animation.

      unlockBodyScroll()
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('popstate', onPopState)
      void nextTick(() => {
        returnFocusTarget.value?.focus({ preventScroll: true })
        returnFocusTarget.value = null
      })

      // If the modal was closed by popstate, reset the flag.
      if (isClosingFromPopState) {
        isClosingFromPopState = false
      }
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  abortReloadRequest()
  unlockBodyScroll()
  clearLoadingTimer()
  returnFocusTarget.value = null
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

const displayContent = computed(
  () => post.value?.description || props.initialPost?.description || ''
)

const hasDisplayContent = computed(() => Boolean(displayContent.value?.trim()))

const displayPlatform = computed(() => post.value?.platform || props.initialPost?.platform || '')

const displayPublishedAt = computed(
  () => post.value?.published_at || props.initialPost?.published_at || ''
)

const displayDuration = computed(() => post.value?.duration || props.initialPost?.duration || null)

const displayMediaCount = computed(() => post.value?.media_count ?? props.initialPost?.media_count)

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

const shouldShowMediaSection = computed(() => {
  if (primaryMedia.value) return true
  if (initialMediaSrc.value) return true
  const mediaCount = displayMediaCount.value ?? 0
  return mediaCount > 0
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
  return getMediaThumbnailUrl(m.id, 'large')
})

const mediaBackdropSrc = computed(() => {
  const m = primaryMedia.value
  if (!m) return initialMediaSrc.value
  return getMediaThumbnailUrl(m.id, 'medium')
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
