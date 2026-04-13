<template>
  <div class="post-detail-page">
    <button type="button" class="post-back-fab" :aria-label="t('common.back')" @click="goBack">
      <svg class="post-back-fab__ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle
          class="post-back-fab__ring-bg"
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke-width="2"
        />
        <circle
          class="post-back-fab__ring-indicator"
          cx="18"
          cy="18"
          r="16"
          fill="none"
          stroke-width="2.5"
          :stroke-dasharray="backCircumference"
          :stroke-dashoffset="backDashOffset"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span class="post-back-fab__icon">
        <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="md" />
      </span>
      <span class="post-back-fab__pulse" />
    </button>

    <section ref="stageRef" class="post-stage">
      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchPost"
      />

      <div v-else-if="isLoading" class="post-shell post-shell--skeleton">
        <div class="post-media">
          <div class="media-viewer">
            <div class="media-skeleton skeleton" />
          </div>
        </div>
        <aside class="post-panel">
          <Skeleton width="70%" height="32px" />
          <Skeleton width="40%" height="20px" />
          <Skeleton height="100px" />
        </aside>
      </div>

      <template v-else-if="post">
        <div class="post-shell" :class="peekDirection ? `is-peeking-${peekDirection}` : undefined">
          <div class="post-media">
            <div
              v-if="post.media_files && post.media_files.length > 0"
              class="media-viewer"
              :style="activeMediaViewerStyle"
            >
              <button
                v-if="showMediaNavButtons"
                type="button"
                class="media-nav prev"
                :aria-label="t('common.previous')"
                :disabled="!canGoPrevMedia"
                @click="prevMedia"
              >
                <AnimatedIcon name="explore" :fallback-icon="ChevronLeft" size="md" />
              </button>

              <Transition :name="mediaTransitionName" mode="out-in">
                <div
                  v-if="activeMedia?.file_type === 'image'"
                  :key="`img-${activeMedia.id}`"
                  class="media-item-container media-clickable"
                  role="button"
                  tabindex="0"
                  :aria-label="t('common.clickToEnlarge')"
                  @click="openLightbox()"
                  @keydown.enter.prevent="openLightbox()"
                  @keydown.space.prevent="openLightbox()"
                >
                  <!-- 模糊占位图 -->
                  <img
                    v-if="!isMediaLoaded && placeholderSrc"
                    class="media-placeholder"
                    :src="placeholderSrc"
                    :alt="post?.title || ''"
                    aria-hidden="true"
                  />
                  <!-- 原图 -->
                  <img
                    class="media-viewer-item"
                    :class="{ 'is-loaded': isMediaLoaded }"
                    :src="activeImageSrc"
                    :srcset="activeImageSrcset || undefined"
                    :sizes="detailMediaImageSizes"
                    :alt="post?.title || ''"
                    :width="activeMedia.width || undefined"
                    :height="activeMedia.height || undefined"
                    decoding="async"
                    loading="eager"
                    :fetchpriority="activeMediaIndex === 0 ? 'high' : 'auto'"
                    @load="onMediaLoad"
                  />
                  <button
                    type="button"
                    class="media-viewer-expand"
                    :aria-label="t('common.clickToEnlarge')"
                    @click.stop="openLightbox()"
                  >
                    <AnimatedIcon name="explore" :fallback-icon="Maximize2" size="sm" />
                  </button>
                </div>
                <div
                  v-else-if="activeMedia?.file_type === 'video'"
                  :key="`video-${activeMedia.id}`"
                  class="media-item-container media-item-container--viewer"
                >
                  <VideoPlayer
                    class="media-viewer-item is-loaded"
                    :src="getMediaStreamUrl(activeMedia.id)"
                    :poster="getMediaThumbnailUrl(activeMedia.id, 'medium')"
                    :style="activeMediaElementStyle"
                    playsinline
                    preload="none"
                    :subtitles="activeMedia.subtitles ?? null"
                    @ready="onMediaLoad"
                  />
                  <button
                    type="button"
                    class="media-viewer-expand media-viewer-expand--video"
                    :aria-label="t('common.clickToEnlarge')"
                    @click.stop="openLightbox()"
                  >
                    <AnimatedIcon name="explore" :fallback-icon="Maximize2" size="sm" />
                  </button>
                </div>
                <div
                  v-else
                  :key="`fallback-${activeMedia?.id ?? activeMediaIndex}`"
                  class="media-item-container"
                >
                  <div class="media-skeleton skeleton" />
                </div>
              </Transition>

              <button
                v-if="showMediaNavButtons"
                type="button"
                class="media-nav next"
                :aria-label="t('common.next')"
                :disabled="!canGoNextMedia"
                @click="nextMedia"
              >
                <AnimatedIcon name="explore" :fallback-icon="ChevronRight" size="md" />
              </button>
            </div>

            <div v-else-if="isMediaPending" class="media-viewer">
              <div class="media-skeleton skeleton" />
            </div>

            <div v-else class="post-media-empty">
              <img
                v-if="post?.thumbnail_url"
                class="post-image"
                :src="fallbackMediaSrc"
                :srcset="fallbackMediaSrcset || undefined"
                :sizes="detailMediaImageSizes"
                :alt="post?.title || ''"
                width="1280"
                height="720"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
              <div
                v-else-if="post?.description && post.media_count === 0"
                class="post-media-text-only"
              >
                <p class="post-media-text-only__content">{{ post.description }}</p>
              </div>
              <div class="post-image skeleton" v-else />
            </div>
          </div>

          <aside class="post-panel">
            <header class="post-header">
              <h1 v-if="detailTitle" class="post-title">{{ detailTitle }}</h1>
              <p class="post-meta">
                {{ t('post.by') }}
                <button
                  type="button"
                  class="author-link"
                  @click="post?.author_id && goToAuthor(post.author_id)"
                >
                  {{ post?.author_name || '' }}
                </button>
                <span v-if="publishedMeta" class="post-date">· {{ publishedMeta }}</span>
              </p>
              <div class="post-stats">
                <span class="post-stat">
                  <AnimatedIcon name="explore" :fallback-icon="Eye" size="sm" />
                  {{ post?.view_count ?? 0 }} {{ t('post.views') }}
                </span>
                <span class="post-stat">
                  <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" />
                  {{ post?.like_count ?? 0 }} {{ t('post.likes') }}
                </span>
              </div>
            </header>

            <div v-if="detailDescription" class="post-description-block">
              <p class="post-description post-description--clamped">{{ detailDescription }}</p>
              <button
                v-if="shouldShowReadFullText"
                type="button"
                class="post-description-more"
                @click="openTextModal"
              >
                {{ t('post.readFullText') }}
              </button>
            </div>

            <div v-if="shouldShowThumbnailRail" class="media-thumbnails">
              <template v-if="hasMultipleMedia">
                <button
                  v-for="(media, idx) in post?.media_files ?? []"
                  :key="media.id"
                  type="button"
                  class="thumbnail-btn"
                  :class="{ active: idx === activeMediaIndex }"
                  :aria-label="`${idx + 1}`"
                  :aria-pressed="idx === activeMediaIndex"
                  @click="selectMedia(idx)"
                >
                  <img
                    class="thumbnail-img"
                    :src="getMediaThumbnailUrl(media.id, 'small')"
                    :alt="post?.title || ''"
                    width="72"
                    height="72"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              </template>
              <template v-else>
                <div
                  v-for="placeholderIndex in thumbnailPlaceholderCount"
                  :key="`thumb-placeholder-${placeholderIndex}`"
                  class="thumbnail-btn thumbnail-btn--placeholder"
                  aria-hidden="true"
                >
                  <div class="thumbnail-img skeleton" />
                </div>
              </template>
            </div>

            <div class="post-actions">
              <Suspense>
                <template #default>
                  <PostActionStrip :post-id="postId" :subtitles-available="subtitlesAvailable" />
                </template>
                <template #fallback>
                  <div class="post-actions-placeholder" aria-hidden="true">
                    <span class="post-actions-placeholder__pill skeleton" />
                    <span class="post-actions-placeholder__button skeleton" />
                    <span class="post-actions-placeholder__button skeleton" />
                  </div>
                </template>
              </Suspense>
            </div>
          </aside>
        </div>
      </template>

      <Transition name="fade">
        <div v-if="postNavHint" class="post-nav-hint" :data-direction="postNavHint">
          {{ postNavHint === 'left' ? t('post.swipeAgainNext') : t('post.swipeAgainPrev') }}
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="isTextModalOpen"
          class="post-text-overlay"
          role="dialog"
          aria-modal="true"
          :aria-label="t('post.content')"
          @click.self="closeTextModal"
        >
          <div ref="textModalPanelRef" class="post-text-panel" tabindex="-1">
            <header class="post-text-header">
              <h3 class="post-text-title">{{ t('post.content') }}</h3>
              <button type="button" class="post-text-close" @click="closeTextModal">
                {{ t('common.close') }}
              </button>
            </header>
            <div class="post-text-body">
              <p class="post-text-content">{{ detailDescription }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <section
      v-if="post && postId && postId !== 'undefined'"
      ref="commentsSectionRef"
      class="post-comments content-auto-xl"
    >
      <CommentList v-if="shouldLoadComments" :post-id="postId" />
      <div v-else class="post-comments__placeholder glass-card">
        <span class="post-comments__placeholder-label">{{ t('comment.title') }}</span>
      </div>
    </section>

    <!-- Media Lightbox -->
    <MediaLightbox
      v-if="post?.media_files?.length"
      v-model:is-open="isLightboxOpen"
      :media-list="post?.media_files ?? []"
      :initial-index="lightboxInitialIndex"
      :alt="post?.title || ''"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PostDetailPage' })

import {
  ref,
  computed,
  onMounted,
  watch,
  onUnmounted,
  onActivated,
  onDeactivated,
  onWatcherCleanup,
  useTemplateRef,
  nextTick,
} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  createLazyObserver,
  preconnect,
  preloadResource,
  runWhenIdle,
  throttleRAF,
  warmDecodedImage,
} from '@/utils/performance'
import { formatDate } from '@/utils/date'
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Heart, Maximize2 } from '@lucide/vue'
import { useAuthStore, useSettingsStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { postService, type PostDetailResponse, ApiError } from '@/api'
import {
  getMediaStreamUrl,
  getMediaThumbnailSrcset,
  getMediaThumbnailUrl,
} from '@/utils/mediaOptimizer'
import { shouldUseStalePostDetailOnError, useCachedPost } from '@/composables/useCachedPosts'
import { trackPostView } from '@/composables/useViewTracking'
import { postCache } from '@/utils/cache'
import {
  getPostNavigationContext,
  updatePostNavigationIndex,
  type PostNavigationContext,
} from '@/utils/postNavigation'
import { getFallbackPostDetailById } from '@/fallbacks/postFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import { resolveThumbnailSrc, resolveThumbnailSrcset } from '@/utils/thumbnailPresentation'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import VideoPlayer from '@/components/ui/VideoPlayer.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/bodyScrollLock'
import { applyPageMeta } from '@/utils/pageMeta'
import {
  buildActiveMediaElementStyle,
  buildActiveMediaViewerStyle,
  buildDetailDescription,
  buildDetailTitle,
  getThumbnailPlaceholderCount,
  isMediaPending as computeIsMediaPending,
  shouldShowReadFullText as computeShouldShowReadFullText,
  shouldShowThumbnailRail as computeShouldShowThumbnailRail,
} from './post-detail/postDetailModel'

// 动态导入大型组件以减少初始包体积
const PostActionStrip = defineAsyncComponent({
  loader: () => import('@/components/business/PostActionStrip.vue'),
})
const CommentList = defineAsyncComponent(() => import('@/components/comment/CommentList.vue'))
const MediaLightbox = defineAsyncComponent({
  loader: () => import('@/components/ui/MediaLightbox.vue'),
  onError(error, retry, fail, attempts) {
    const message = error instanceof Error ? error.message : String(error ?? '')
    const isChunkLoadError =
      /dynamically imported module|chunkloaderror|failed to fetch dynamically imported module/i.test(
        message
      )

    // 网络抖动时先重试一次，避免直接失败
    if (isChunkLoadError && attempts <= 1) {
      retry()
      return
    }

    fail()
  },
})

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)

const postId = computed(() => route.params['id'] as string)
const post = ref<PostDetailResponse | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const detailFetched = ref(false)
let fetchPostToken = 0
const dataSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => dataSource.value === 'fallback')

const { data: cachedPost, load: loadCachedPost } = useCachedPost<PostDetailResponse>(
  postService.getPost,
  {
    onUpdate: () => {
      if (cachedPost.value) {
        post.value = cachedPost.value
        syncPostMeta(cachedPost.value)
      }
    },
    shouldUseStaleOnError: shouldUseStalePostDetailOnError,
  }
)

const activeMediaIndex = ref(0)
const mediaTransitionName = ref('media-fade')
const isMediaLoaded = ref(false)
const cachedThumbnailUrl = ref<string | null>(null)
const preloadedImages = ref<Set<string>>(new Set())
const autoPlayTimer = ref<number | null>(null)
const autoPlayResumeTimer = ref<number | null>(null)
const isAutoPlayPaused = ref(false)
const shouldLoadComments = ref(false)
const allowAdjacentMediaPreload = ref(false)

const stageRef = useTemplateRef<HTMLElement>('stageRef')
const commentsSectionRef = useTemplateRef<HTMLElement>('commentsSectionRef')
const textModalPanelRef = useTemplateRef<HTMLElement>('textModalPanelRef')
const navigationContext = ref<PostNavigationContext | null>(null)
let commentsObserver: IntersectionObserver | null = null
let stageListenersAttached = false
let stageListenersWanted = false
let clearPendingStageListenerArming: (() => void) | null = null
let cancelIdleStageListenerArming: (() => void) | null = null
let cancelIdlePostViewTracking: (() => void) | null = null

// Back FAB progress (matches BackToTop visual language)
const backScrollProgress = ref(0)
const backRingRadius = 16
const backCircumference = 2 * Math.PI * backRingRadius

const backDashOffset = computed(() => {
  return backCircumference * (1 - backScrollProgress.value)
})

const handleScroll = throttleRAF(() => {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight
  backScrollProgress.value = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0
})

const isSwitchingPost = ref(false)
const wheelAccumulator = ref(0)
const touchStartX = ref<number | null>(null)
const touchStartY = ref<number | null>(null)
const lastWheelTime = ref(0)

const peekDirection = ref<'left' | 'right' | null>(null)
let peekTimer: number | null = null

const pendingPostNav = ref<{ direction: 1 | -1; expiresAt: number } | null>(null)
const postNavHint = ref<'left' | 'right' | null>(null)
let postNavHintTimer: number | null = null

// Lightbox 状态
const isLightboxOpen = ref(false)
const lightboxInitialIndex = ref(0)

// Long text → open in overlay modal for comfortable reading
const isTextModalOpen = ref(false)
const textModalReturnFocus = ref<HTMLElement | null>(null)
const shouldShowReadFullText = computed(() =>
  computeShouldShowReadFullText(detailDescription.value)
)

const detailTitle = computed(() => buildDetailTitle(post.value))
const detailDescription = computed(() => buildDetailDescription(post.value))

const publishedMeta = computed(() => {
  const publishedAt = post.value?.published_at
  if (!publishedAt) return ''
  return t('post.publishedAt', { date: formatDate(publishedAt) })
})

function openTextModal() {
  if (!detailDescription.value) return
  isTextModalOpen.value = true
}

function closeTextModal() {
  isTextModalOpen.value = false
}

function onTextModalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeTextModal()
}

const activeMedia = computed(() => {
  const list = post.value?.media_files ?? []
  return list[activeMediaIndex.value] ?? null
})

const detailMediaImageSizes =
  '(min-width: 1100px) 60rem, (min-width: 900px) calc(100vw - 31rem), 100vw'

const subtitlesAvailable = computed(() => {
  const m = activeMedia.value
  return Boolean(m && m.file_type === 'video' && (m.subtitles?.length ?? 0) > 0)
})

const hasMultipleMedia = computed(() => (post.value?.media_files?.length ?? 0) > 1)
const mediaCount = computed(() => post.value?.media_files?.length ?? 0)
const canGoPrevMedia = computed(() => activeMediaIndex.value > 0)
const canGoNextMedia = computed(() => activeMediaIndex.value + 1 < mediaCount.value)
const showMediaNavButtons = computed(
  () => hasMultipleMedia.value && activeMedia.value?.file_type !== 'video'
)

// 缓存来自列表页时可能没有 media_files，但 media_count > 0 表示有媒体
// 此时应显示加载骨架而非"无媒体"占位
// 一旦详情 API 已返回（detailFetched），不再显示骨架
const isMediaPending = computed(() => computeIsMediaPending(post.value, detailFetched.value))

const isImageSequence = computed(() =>
  (post.value?.media_files ?? []).every((media) => media.file_type === 'image')
)

const canSwipeNavigate = computed(() => settings.value.enableSwipeNavigation)

const activeMediaViewerStyle = computed<Record<string, string>>(() =>
  buildActiveMediaViewerStyle(activeMedia.value)
)

const activeMediaElementStyle = computed<Record<string, string>>(() =>
  buildActiveMediaElementStyle(activeMedia.value)
)

const activeImageSrc = computed(() => {
  const media = activeMedia.value
  if (!media || media.file_type !== 'image') return ''
  return getMediaThumbnailUrl(media.id, 'large')
})

const activeImageSrcset = computed(() => {
  const media = activeMedia.value
  if (!media || media.file_type !== 'image') return null
  return getMediaThumbnailSrcset(media.id)
})

const fallbackMediaSrc = computed(() => {
  return resolveThumbnailSrc(post.value?.thumbnail_url ?? null, 'large') || ''
})

const fallbackMediaSrcset = computed(() =>
  resolveThumbnailSrcset(post.value?.thumbnail_url ?? null)
)

const shouldShowThumbnailRail = computed(() =>
  computeShouldShowThumbnailRail(post.value, detailFetched.value)
)

const thumbnailPlaceholderCount = computed(() =>
  getThumbnailPlaceholderCount(post.value?.media_count)
)

function primeImageRequest(url: string | null | undefined) {
  if (typeof window === 'undefined' || !url) return

  try {
    const resolvedUrl = new URL(url, window.location.origin)
    preconnect(resolvedUrl.origin)
    preloadResource(resolvedUrl.toString(), 'image')
  } catch {
    preloadResource(url, 'image')
  }
}

function hintPostMedia(postDetail: PostDetailResponse | null | undefined) {
  if (!postDetail) return

  const primaryImage = postDetail.media_files?.find((media) => media.file_type === 'image')
  if (primaryImage) {
    primeImageRequest(getMediaThumbnailUrl(primaryImage.id, 'large'))
    return
  }

  const fallbackUrl = resolveThumbnailSrc(postDetail.thumbnail_url ?? null, 'large')
  primeImageRequest(fallbackUrl)
}

// 获取缓存的缩略图作为占位图
const placeholderSrc = computed(() => {
  const media = activeMedia.value
  if (!media) return cachedThumbnailUrl.value

  // 优先使用已预加载的缩略图
  const thumbUrl = getMediaThumbnailUrl(media.id, 'medium')
  if (preloadedImages.value.has(thumbUrl)) {
    return thumbUrl
  }

  // 首次加载时使用从列表页传递的缩略图
  if (activeMediaIndex.value === 0 && cachedThumbnailUrl.value) {
    return cachedThumbnailUrl.value
  }

  return thumbUrl
})

function selectMedia(index: number) {
  if (index === activeMediaIndex.value) return
  pauseAutoPlay()
  allowAdjacentMediaPreload.value = true
  mediaTransitionName.value =
    index > activeMediaIndex.value ? 'media-slide-left' : 'media-slide-right'
  isMediaLoaded.value = false
  activeMediaIndex.value = index
}

function prevMedia(): boolean {
  const total = mediaCount.value
  if (total <= 1) return false
  if (!canGoPrevMedia.value) return false
  pauseAutoPlay()
  allowAdjacentMediaPreload.value = true
  mediaTransitionName.value = 'media-slide-right'
  isMediaLoaded.value = false
  activeMediaIndex.value = Math.max(0, activeMediaIndex.value - 1)
  return true
}

function nextMedia(): boolean {
  const total = mediaCount.value
  if (total <= 1) return false
  if (!canGoNextMedia.value) return false
  pauseAutoPlay()
  allowAdjacentMediaPreload.value = true
  mediaTransitionName.value = 'media-slide-left'
  isMediaLoaded.value = false
  activeMediaIndex.value = Math.min(total - 1, activeMediaIndex.value + 1)
  return true
}

function onMediaLoad() {
  isMediaLoaded.value = true

  if (allowAdjacentMediaPreload.value) {
    preloadAdjacentMedia()
  }
}

function startAutoPlay() {
  if (!hasMultipleMedia.value || !isImageSequence.value || isAutoPlayPaused.value) return
  stopAutoPlay()
  autoPlayTimer.value = window.setInterval(() => {
    advanceMedia()
  }, 4500)
}

function stopAutoPlay() {
  if (autoPlayTimer.value !== null) {
    window.clearInterval(autoPlayTimer.value)
    autoPlayTimer.value = null
  }
}

function scheduleAutoPlayResume() {
  if (!hasMultipleMedia.value || !isImageSequence.value) return
  if (autoPlayResumeTimer.value !== null) {
    window.clearTimeout(autoPlayResumeTimer.value)
  }
  autoPlayResumeTimer.value = window.setTimeout(() => {
    isAutoPlayPaused.value = false
    startAutoPlay()
  }, 3000)
}

function pauseAutoPlay() {
  if (!hasMultipleMedia.value || !isImageSequence.value) return
  isAutoPlayPaused.value = true
  stopAutoPlay()
  scheduleAutoPlayResume()
}

function advanceMedia() {
  const total = post.value?.media_files?.length ?? 0
  if (total <= 1) return
  mediaTransitionName.value = 'media-slide-left'
  isMediaLoaded.value = false
  activeMediaIndex.value = (activeMediaIndex.value + 1) % total
}

// 用户明确切换媒体后，仅预热相邻缩略图，避免详情页首屏竞争完整媒体资源。
function preloadAdjacentMedia() {
  const mediaFiles = post.value?.media_files
  if (!mediaFiles || mediaFiles.length <= 1) return

  const currentIdx = activeMediaIndex.value
  const indicesToPreload = [
    (currentIdx + 1) % mediaFiles.length,
    (currentIdx - 1 + mediaFiles.length) % mediaFiles.length,
  ]

  indicesToPreload.forEach((idx) => {
    const media = mediaFiles[idx]
    if (!media || media.file_type !== 'image') return

    // 预加载缩略图
    const thumbUrl = getMediaThumbnailUrl(media.id, 'medium')
    if (!preloadedImages.value.has(thumbUrl)) {
      const thumbImg = new Image()
      thumbImg.src = thumbUrl
      thumbImg.onload = () => preloadedImages.value.add(thumbUrl)
    }

    void warmDecodedImage(getMediaThumbnailUrl(media.id, 'large'))
  })
}

function syncNavigationContext() {
  const context = getPostNavigationContext()
  if (!context) {
    navigationContext.value = null
    return
  }

  const currentIndex = context.ids.indexOf(postId.value)
  if (currentIndex >= 0 && currentIndex !== context.index) {
    updatePostNavigationIndex(currentIndex)
  }
  navigationContext.value = getPostNavigationContext()
}

function disconnectCommentsObserver() {
  commentsObserver?.disconnect()
  commentsObserver = null
}

function loadCommentsWhenVisible() {
  if (shouldLoadComments.value) return
  shouldLoadComments.value = true
  disconnectCommentsObserver()
}

function observeCommentsSection() {
  if (typeof window === 'undefined' || shouldLoadComments.value) return

  const section = commentsSectionRef.value
  if (!section) return

  if (!('IntersectionObserver' in window)) {
    loadCommentsWhenVisible()
    return
  }

  disconnectCommentsObserver()
  commentsObserver = createLazyObserver(
    () => {
      loadCommentsWhenVisible()
    },
    { rootMargin: '320px 0px' }
  )
  commentsObserver.observe(section)
}

function showPeek(direction: 'left' | 'right') {
  peekDirection.value = direction
  if (peekTimer) window.clearTimeout(peekTimer)
  peekTimer = window.setTimeout(() => {
    peekDirection.value = null
  }, 220)
}

function showPostNavHint(direction: 'left' | 'right') {
  postNavHint.value = direction
  if (postNavHintTimer) window.clearTimeout(postNavHintTimer)
  postNavHintTimer = window.setTimeout(() => {
    postNavHint.value = null
  }, 900)
}

function navigateToOffset(offset: number) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  const context = navigationContext.value
  if (!context) return

  const nextIndex = context.index + offset
  if (nextIndex < 0 || nextIndex >= context.ids.length) return

  const nextId = context.ids[nextIndex]
  if (!nextId || nextId === postId.value) return

  isSwitchingPost.value = true

  try {
    sessionStorage.setItem('post-detail-transition', offset > 0 ? 'left' : 'right')
  } catch {
    // ignore
  }

  updatePostNavigationIndex(nextIndex)
  router.push(`/post/${nextId}`)
}

function requestPostNavigate(direction: 1 | -1) {
  const now = Date.now()

  // Require a quick second gesture to confirm, improving tolerance against accidental swipes.
  const pending = pendingPostNav.value
  if (pending && pending.direction === direction && pending.expiresAt > now) {
    pendingPostNav.value = null
    navigateToOffset(direction)
    return
  }

  pendingPostNav.value = { direction, expiresAt: now + 800 }
  showPeek(direction > 0 ? 'left' : 'right')
  showPostNavHint(direction > 0 ? 'left' : 'right')
}

function isInIgnoredInteractionArea(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      '.post-panel, .post-actions, .media-thumbnails, .thumbnail-btn, .vp, .vp__controls, a, button, input, textarea'
    )
  )
}

function handleWheel(event: WheelEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (event.ctrlKey || event.metaKey) return
  if (isInIgnoredInteractionArea(event.target)) return

  // Only respond to horizontal intent (trackpad swipe / shift+wheel)
  const dy = event.deltaY
  const dx = event.shiftKey && Math.abs(event.deltaX) < 0.1 ? dy : event.deltaX
  if (Math.abs(dx) < Math.abs(dy)) return

  const now = performance.now()
  if (now - lastWheelTime.value > 250) {
    wheelAccumulator.value = 0
  }
  lastWheelTime.value = now
  wheelAccumulator.value += dx

  if (Math.abs(wheelAccumulator.value) < 110) return

  event.preventDefault()
  const direction = wheelAccumulator.value > 0 ? 1 : -1
  wheelAccumulator.value = 0

  // Media-first: if current post has multiple media, swipe switches media before switching posts.
  if (direction > 0) {
    if (nextMedia()) return
  } else {
    if (prevMedia()) return
  }

  requestPostNavigate(direction as 1 | -1)
}

function handleTouchStart(event: TouchEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (event.touches.length !== 1) return
  if (isInIgnoredInteractionArea(event.target)) return

  touchStartX.value = event.touches[0]?.clientX ?? null
  touchStartY.value = event.touches[0]?.clientY ?? null
}

function handleTouchEnd(event: TouchEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (isInIgnoredInteractionArea(event.target)) return

  const startX = touchStartX.value
  const startY = touchStartY.value
  if (startX === null || startY === null) return

  const endX = event.changedTouches[0]?.clientX ?? startX
  const endY = event.changedTouches[0]?.clientY ?? startY

  const deltaX = startX - endX
  const deltaY = startY - endY

  touchStartX.value = null
  touchStartY.value = null

  // Only treat as navigation swipe when horizontal intent is clear.
  if (Math.abs(deltaX) < 70 || Math.abs(deltaX) < Math.abs(deltaY)) return

  const direction = deltaX > 0 ? (1 as const) : (-1 as const)

  // Media-first: if current post has multiple media, swipe switches media before switching posts.
  if (direction > 0) {
    if (nextMedia()) return
  } else {
    if (prevMedia()) return
  }

  requestPostNavigate(direction)
}

function goBack() {
  router.back()
}

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

// 打开 Lightbox 查看大图
function openLightbox(index?: number) {
  pauseAutoPlay()
  allowAdjacentMediaPreload.value = true
  lightboxInitialIndex.value = index ?? activeMediaIndex.value
  isLightboxOpen.value = true
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

function syncPostMeta(currentPost: PostDetailResponse | null | undefined) {
  const title = currentPost?.title?.trim()
  if (!title) return

  applyPageMeta({
    title,
    description: buildDetailDescription(currentPost) || title,
    canonicalPath: route.path,
  })
}

function cancelPostDetailIdleWork() {
  cancelIdleStageListenerArming?.()
  cancelIdleStageListenerArming = null
  cancelIdlePostViewTracking?.()
  cancelIdlePostViewTracking = null
}

function buildNotFoundRouteParams(currentPostId: string) {
  return {
    pathMatch: ['post', currentPostId],
  }
}

function schedulePostViewTracking(currentPostId: string, requestToken: number) {
  if (typeof window === 'undefined') return
  cancelIdlePostViewTracking?.()
  cancelIdlePostViewTracking = runWhenIdle(() => {
    cancelIdlePostViewTracking = null
    if (requestToken !== fetchPostToken || postId.value !== currentPostId) return
    void trackPostView(currentPostId, isAuthenticated.value)
  }, 1500)
}

async function fetchPost(signal?: AbortSignal) {
  if (!postId.value || postId.value === 'undefined') return

  const requestToken = ++fetchPostToken
  const currentPostId = postId.value

  isLoading.value = true
  error.value = null
  detailFetched.value = false
  shouldLoadComments.value = false
  allowAdjacentMediaPreload.value = false
  disconnectCommentsObserver()

  // 从 sessionStorage 获取缓存的缩略图
  const cachedThumb = sessionStorage.getItem(`post-thumbnail-${currentPostId}`)
  if (cachedThumb) {
    cachedThumbnailUrl.value = cachedThumb
    primeImageRequest(resolveThumbnailSrc(cachedThumb, 'large') || cachedThumb)
  }

  try {
    const cached = await postCache.getPostEntity(currentPostId)
    if (signal?.aborted || requestToken !== fetchPostToken) return

    if (cached) {
      hintPostMedia(cached as PostDetailResponse)
      post.value = cached as PostDetailResponse
      activeMediaIndex.value = 0
      isMediaLoaded.value = false

      syncNavigationContext()

      syncPostMeta(post.value)

      isLoading.value = false

      schedulePostViewTracking(currentPostId, requestToken)

      // 后台刷新：缓存来自列表页时不含 media_files，需要网络请求补全
      void loadCachedPost(currentPostId, signal ? { signal } : undefined).then((result) => {
        if (signal?.aborted || requestToken !== fetchPostToken) return
        detailFetched.value = true
        dataSource.value = result.fromCache ? 'cached' : 'live'
      })
      return
    }

    const res = await loadCachedPost(currentPostId, signal ? { signal } : undefined)
    if (signal?.aborted || requestToken !== fetchPostToken) return

    hintPostMedia(res.data)
    post.value = res.data
    detailFetched.value = true
    activeMediaIndex.value = 0
    isMediaLoaded.value = false

    syncNavigationContext()

    syncPostMeta(post.value)
    dataSource.value = res.fromCache ? 'cached' : 'live'

    schedulePostViewTracking(currentPostId, requestToken)
  } catch (err) {
    if (signal?.aborted || isAbortError(err) || requestToken !== fetchPostToken) return
    if (isServiceUnavailableError(err)) {
      const fallbackPost = getFallbackPostDetailById(currentPostId)
      if (fallbackPost) {
        hintPostMedia(fallbackPost)
        post.value = fallbackPost
        detailFetched.value = true
        activeMediaIndex.value = 0
        isMediaLoaded.value = true
        dataSource.value = 'fallback'
        error.value = null
        syncNavigationContext()
        syncPostMeta(fallbackPost)
        return
      }
    }
    if (err instanceof ApiError) {
      if (err.status === 404) {
        post.value = null
        error.value = null
        detailFetched.value = false
        dataSource.value = 'live'
        await router.replace({
          name: 'not-found',
          params: buildNotFoundRouteParams(currentPostId),
          query: route.query,
          hash: route.hash,
        })
        return
      }
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    if (requestToken === fetchPostToken) {
      isLoading.value = false
    }
  }
}

onMounted(() => {
  stageListenersWanted = true
  syncNavigationContext()
  void fetchPost()
  scheduleStageListeners()
})

// 记录访问开始时间（用于智能预缓存）
const accessStartTime = Date.now()

// 在组件卸载时记录访问
onUnmounted(() => {
  const timeSpent = Date.now() - accessStartTime
  if (postId.value) {
    import('@/utils/cache/smartPrefetch').then(({ recordAccess }) => {
      recordAccess('post', postId.value, timeSpent).catch(() => {
        // ignore non-critical cache telemetry failures
      })
    })
  }
})

watch(postId, (nextId, prevId) => {
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  cancelPostDetailIdleWork()
  isSwitchingPost.value = false
  // 清理上一条内容的缓存，避免长时间浏览造成内存堆积
  if (prevId && prevId !== nextId) {
    sessionStorage.removeItem(`post-thumbnail-${prevId}`)
  }
  cachedThumbnailUrl.value = null
  preloadedImages.value = new Set()
  shouldLoadComments.value = false
  allowAdjacentMediaPreload.value = false
  disconnectCommentsObserver()
  syncNavigationContext()
  void fetchPost(controller.signal)
})

watch(
  [commentsSectionRef, () => post.value?.id ?? null, shouldLoadComments],
  ([section, currentPostId, commentsLoaded]) => {
    if (!section || !currentPostId || commentsLoaded) return
    void nextTick(() => {
      observeCommentsSection()
    })
  },
  { flush: 'post' }
)

watch([hasMultipleMedia, isImageSequence, isLightboxOpen], () => {
  if (isLightboxOpen.value) {
    stopAutoPlay()
    return
  }
  if (!hasMultipleMedia.value || !isImageSequence.value) {
    stopAutoPlay()
    return
  }
  if (!isAutoPlayPaused.value) {
    startAutoPlay()
  }
})

watch(
  [activeImageSrc, () => activeMedia.value?.file_type ?? null],
  ([nextSrc, mediaType]) => {
    if (mediaType !== 'image' || !nextSrc) return
    void warmDecodedImage(nextSrc)
  },
  { flush: 'sync' }
)

watch(
  isTextModalOpen,
  async (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      textModalReturnFocus.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      lockBodyScroll()
      window.addEventListener('keydown', onTextModalKeydown)
      await nextTick()
      textModalPanelRef.value?.focus({ preventScroll: true })
    } else {
      unlockBodyScroll()
      window.removeEventListener('keydown', onTextModalKeydown)
      await nextTick()
      textModalReturnFocus.value?.focus({ preventScroll: true })
      textModalReturnFocus.value = null
    }
  },
  { immediate: true }
)
function attachStageListeners() {
  if (stageListenersAttached) return
  cancelIdleStageListenerArming?.()
  cancelIdleStageListenerArming = null
  clearPendingStageListenerArming?.()
  clearPendingStageListenerArming = null
  stageListenersAttached = true
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })

  if (stageRef.value) {
    stageRef.value.addEventListener('wheel', handleWheel, { passive: false })
    stageRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    stageRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
}

function detachStageListeners() {
  cancelIdleStageListenerArming?.()
  cancelIdleStageListenerArming = null
  clearPendingStageListenerArming?.()
  clearPendingStageListenerArming = null
  if (!stageListenersAttached) return
  stageListenersAttached = false
  window.removeEventListener('scroll', handleScroll)
  handleScroll.cancel?.()

  if (stageRef.value) {
    stageRef.value.removeEventListener('wheel', handleWheel)
    stageRef.value.removeEventListener('touchstart', handleTouchStart)
    stageRef.value.removeEventListener('touchend', handleTouchEnd)
  }
}

function scheduleStageListeners() {
  if (
    typeof window === 'undefined' ||
    !stageListenersWanted ||
    stageListenersAttached ||
    clearPendingStageListenerArming
  ) {
    return
  }

  const activate = () => {
    if (!stageListenersWanted || stageListenersAttached) return
    cancelIdleStageListenerArming?.()
    cancelIdleStageListenerArming = null
    clearPendingStageListenerArming?.()
    clearPendingStageListenerArming = null
    attachStageListeners()
  }

  const onPointerDown = () => activate()
  const onKeyDown = () => activate()
  const onWheel = () => activate()

  window.addEventListener('pointerdown', onPointerDown, { passive: true, once: true })
  window.addEventListener('keydown', onKeyDown, { once: true })
  window.addEventListener('wheel', onWheel, { passive: true, once: true })

  clearPendingStageListenerArming = () => {
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('wheel', onWheel)
  }

  cancelIdleStageListenerArming?.()
  cancelIdleStageListenerArming = runWhenIdle(activate, 1200)
}

onActivated(() => {
  stageListenersWanted = true
  scheduleStageListeners()
  if (isTextModalOpen.value) {
    lockBodyScroll()
    if (typeof window !== 'undefined') window.addEventListener('keydown', onTextModalKeydown)
  }
})

onDeactivated(() => {
  stageListenersWanted = false
  fetchPostToken += 1
  isLoading.value = false
  isTextModalOpen.value = false
  cancelPostDetailIdleWork()
  detachStageListeners()
  unlockBodyScroll()
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onTextModalKeydown)
})

// 清理 sessionStorage
onUnmounted(() => {
  stageListenersWanted = false
  fetchPostToken += 1
  isLoading.value = false
  cancelPostDetailIdleWork()
  detachStageListeners()
  stopAutoPlay()
  disconnectCommentsObserver()
  unlockBodyScroll()
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onTextModalKeydown)

  if (autoPlayResumeTimer.value !== null) {
    window.clearTimeout(autoPlayResumeTimer.value)
    autoPlayResumeTimer.value = null
  }

  if (peekTimer) {
    window.clearTimeout(peekTimer)
    peekTimer = null
  }

  if (postNavHintTimer) {
    window.clearTimeout(postNavHintTimer)
    postNavHintTimer = null
  }

  sessionStorage.removeItem(`post-thumbnail-${postId.value}`)
})
</script>

<style scoped>
.post-detail-page {
  --post-bg-base: var(--color-background);
  --post-bg-spot-1: rgba(var(--color-primary-rgb, 139, 92, 246), 0.12);
  --post-bg-spot-2: rgba(var(--color-secondary-rgb, 59, 130, 246), 0.16);
  --post-text-primary: var(--color-text-primary);
  --post-text-secondary: var(--color-text-secondary);
  --post-text-tertiary: var(--color-text-tertiary);
  --post-panel-bg: var(--glass-bg-strong);
  --post-panel-border: var(--glass-border);
  --post-overlay: rgba(15, 23, 42, 0.52);
  --post-overlay-soft: rgba(15, 23, 42, 0.28);
  --post-overlay-text: #f8fafc;
  --post-media-bg: transparent;
  --post-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04);
  --post-shadow-md: 0 1px 3px rgba(0, 0, 0, 0.06), 0 6px 16px rgba(0, 0, 0, 0.04);
  --post-modal-bg: var(--glass-bg-strong);
  --post-modal-border: var(--glass-border);
  --post-gutter: clamp(0.875rem, 2vw, 1.75rem);
  --post-vert-pad: clamp(0.75rem, 1.6vw, 1.5rem);
  min-height: 100svh;
  min-height: 100dvh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 20% 20%, var(--post-bg-spot-1), transparent 55%),
    radial-gradient(circle at 80% 0%, var(--post-bg-spot-2), transparent 50%), var(--post-bg-base);
  color: var(--post-text-primary);
}

.fallback-preview {
  display: grid;
  gap: var(--spacing-2);
  padding: clamp(1rem, 1.8vw, 1.25rem);
  margin-block-end: var(--spacing-4);
}

.fallback-preview__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--post-text-tertiary);
}

.fallback-preview p {
  margin: 0;
  max-width: 52ch;
  font-size: var(--text-sm);
  color: var(--post-text-secondary);
}

.fallback-preview__detail {
  font-size: var(--text-xs);
  color: var(--post-text-tertiary);
}

[data-color-mode='dark'] .post-detail-page {
  --post-bg-base: #050507;
  --post-bg-spot-1: rgba(var(--color-primary-rgb, 139, 92, 246), 0.16);
  --post-bg-spot-2: rgba(var(--color-secondary-rgb, 59, 130, 246), 0.2);
  --post-text-primary: #f5f5f7;
  --post-text-secondary: rgba(255, 255, 255, 0.7);
  --post-text-tertiary: rgba(255, 255, 255, 0.5);
  --post-panel-bg: rgba(8, 8, 12, 0.78);
  --post-panel-border: rgba(255, 255, 255, 0.08);
  --post-overlay: rgba(0, 0, 0, 0.6);
  --post-overlay-soft: rgba(0, 0, 0, 0.35);
  --post-overlay-text: #f8fafc;
  --post-media-bg: transparent;
  --post-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 14px rgba(0, 0, 0, 0.15);
  --post-shadow-md: 0 2px 4px rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.15);
  --post-modal-bg: rgba(10, 10, 14, 0.92);
  --post-modal-border: rgba(255, 255, 255, 0.12);
}

[data-preset='gradient-narrative'][data-color-mode='light'] .post-detail-page {
  --post-bg-base: #f0f9ff;
  --post-bg-spot-1: rgba(59, 130, 246, 0.1);
  --post-bg-spot-2: rgba(99, 102, 241, 0.08);
  --post-text-primary: #0f172a;
  --post-text-secondary: #475569;
  --post-text-tertiary: #64748b;
  --post-panel-bg: rgba(255, 255, 255, 0.88);
  --post-panel-border: rgba(59, 130, 246, 0.12);
  --post-overlay: rgba(15, 23, 42, 0.48);
  --post-overlay-soft: rgba(15, 23, 42, 0.2);
  --post-overlay-text: #f8fafc;
  --post-media-bg: transparent;
  --post-shadow-sm: 0 1px 3px rgba(59, 130, 246, 0.06), 0 4px 12px rgba(59, 130, 246, 0.04);
  --post-shadow-md: 0 2px 4px rgba(59, 130, 246, 0.06), 0 8px 20px rgba(59, 130, 246, 0.06);
  --post-modal-bg: rgba(240, 249, 255, 0.95);
  --post-modal-border: rgba(59, 130, 246, 0.15);
}

.post-stage {
  position: relative;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--post-vert-pad) var(--post-gutter) var(--spacing-6);
  overflow: visible;
}

.post-comments {
  width: min(100%, calc(var(--container-max) + var(--post-gutter) * 2));
  margin-inline: auto;
  padding: var(--spacing-5) var(--post-gutter) var(--spacing-6);
}

.post-comments__placeholder {
  min-height: 12.5rem;
  display: grid;
  place-items: center;
  padding: var(--spacing-6);
  border-radius: var(--radius-xl);
}

.post-comments__placeholder-label {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--post-text-secondary);
}

@media (max-width: 768px) {
  .post-stage {
    min-height: auto;
    padding: var(--spacing-1) 0 var(--spacing-3);
    align-items: stretch;
  }
  .post-comments {
    max-width: 100%;
    padding-top: var(--spacing-4);
    padding-inline: var(--spacing-3);
    padding-bottom: calc(var(--spacing-10) + var(--mobile-nav-height));
  }
}

.post-actions {
  margin-top: var(--spacing-2);
  min-block-size: calc(var(--ui-control-min-size, 2.75rem) + var(--spacing-3));
  padding-bottom: var(--spacing-2);
}

.post-actions-placeholder {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  min-block-size: var(--ui-control-min-size, 2.75rem);
}

.post-actions-placeholder__pill,
.post-actions-placeholder__button {
  display: inline-flex;
  border-radius: var(--radius-full);
}

.post-actions-placeholder__pill {
  inline-size: 4.25rem;
  block-size: 1.75rem;
}

.post-actions-placeholder__button {
  inline-size: 6.75rem;
  block-size: var(--ui-control-min-size, 2.75rem);
  border-radius: var(--radius-lg);
}

.post-topbar {
  position: sticky;
  top: var(--navbar-visible-height, var(--navbar-height));
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-4);
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom: none;
}

.post-topbar__back {
  width: var(--ui-control-min-size, 2.75rem);
  height: var(--ui-control-min-size, 2.75rem);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: var(--post-overlay-soft);
  border: 1px solid var(--post-panel-border);
  color: var(--post-overlay-text);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.post-topbar__back:hover {
  transform: translateY(-0.0625rem);
  background: var(--post-overlay);
}

.post-topbar__title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--post-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-topbar__actions {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.post-back-fab {
  --fab-size: clamp(2.875rem, 5vw, 4rem);
  --edge: clamp(1.125rem, 3.4vw, 2.25rem);
  --fab-gap: 0.75rem;
  position: fixed;
  right: var(--edge);
  bottom: calc(var(--edge) + env(safe-area-inset-bottom, 0) + var(--fab-size) + var(--fab-gap));
  z-index: var(--z-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--fab-size);
  height: var(--fab-size);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-foreground);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
  transition-property: transform, background-color, box-shadow, border-color;
  transition-duration: 220ms;
  transition-timing-function: var(--ease-spring);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.post-back-fab::before {
  content: '';
  position: absolute;
  inset: -0.0625rem;
  border-radius: inherit;
  background: var(--gradient-primary);
  opacity: 0;
  z-index: -1;
  transition: opacity 200ms var(--ease-out);
}

.post-back-fab::after {
  content: '';
  position: absolute;
  inset: -0.625rem;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.35) 0%, transparent 70%);
  opacity: 0.2;
  filter: blur(0.75rem);
  z-index: -2;
  pointer-events: none;
  animation: post-back-glow 6s ease-in-out infinite;
}

.post-back-fab:hover {
  transform: translate3d(0, -0.25rem, 0);
  border-color: var(--color-primary);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 20px rgba(var(--color-primary-rgb), 0.2);
}

.post-back-fab:hover::before {
  opacity: 0.1;
}

.post-back-fab:active {
  transform: translate3d(0, -0.125rem, 0) scale(0.95);
  transition-duration: 100ms;
}

.post-back-fab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.3);
}

.post-back-fab__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.post-back-fab__ring-bg {
  stroke: var(--glass-border);
  opacity: 0.5;
}

.post-back-fab__ring-indicator {
  stroke: var(--color-primary);
  stroke-linecap: round;
  transition: stroke-dashoffset 80ms linear;
  filter: drop-shadow(0 0 0.25rem rgba(var(--color-primary-rgb), 0.4));
}

.post-back-fab__icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms var(--ease-spring);
}

.post-back-fab:hover .post-back-fab__icon {
  transform: translateY(-0.125rem);
}

.post-back-fab__pulse {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary);
  opacity: 0;
  pointer-events: none;
}

.post-back-fab:active .post-back-fab__pulse {
  animation: post-back-pulse-out 400ms var(--ease-out);
}

@keyframes post-back-pulse-out {
  0% {
    opacity: 0.3;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.6);
  }
}

@keyframes post-back-glow {
  0%,
  100% {
    opacity: 0.18;
  }
  50% {
    opacity: 0.3;
  }
}

/* Responsive sizing and positioning - stacked above back-to-top button */
@media (max-width: 768px) {
  .post-back-fab {
    /* Position above back-to-top: bottom nav (72px) + safe area */
    bottom: calc(
      var(--edge) + 72px + var(--fab-size) + var(--fab-gap) + env(safe-area-inset-bottom, 0px)
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-back-fab::after {
    animation: none;
  }
}

.post-shell--skeleton .media-skeleton {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.post-shell {
  width: min(100%, var(--container-max));
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1rem, 2.4vw, 2rem);
  align-items: start;
  transition: transform 180ms var(--ease-out);
}

.post-shell.is-peeking-left {
  transform: translateX(-1rem);
}

.post-shell.is-peeking-right {
  transform: translateX(1rem);
}

@media (min-width: 768px) {
  .post-shell {
    grid-template-columns: minmax(0, 1fr) clamp(20rem, 32vw, 28.75rem);
    gap: clamp(1.25rem, 3vw, 3rem);
  }

  .post-panel {
    border-left: 1px solid var(--post-panel-border);
    border-top: 0;
    border-radius: var(--radius-2xl);
    box-shadow: var(--glass-shadow);
  }
}

@media (min-width: 1100px) {
  .post-shell {
    grid-template-columns: minmax(0, 1.05fr) clamp(22.5rem, 28vw, 30rem);
  }
}

.post-media {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  contain: layout style;
}

.media-viewer {
  position: relative;
  width: min(100%, 60rem);
  max-width: 100%;
  min-height: min(
    var(--media-min-block-size, clamp(18rem, 52dvh, 40rem)),
    clamp(20rem, 65dvh, 48rem)
  );
  max-height: clamp(20rem, 65dvh, 48rem);
  aspect-ratio: var(--aspect-ratio, 16 / 9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--post-media-bg);
  border-radius: var(--radius-2xl);
}

.post-media-empty {
  width: 100%;
  min-height: clamp(18rem, 52dvh, 40rem);
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  position: relative;
}

.post-media-empty .post-image {
  width: 100%;
  height: 100%;
  max-height: clamp(20rem, 62dvh, 45rem);
  object-fit: contain;
  border-radius: var(--radius-2xl);
  box-shadow: var(--post-shadow-sm);
  background: var(--post-media-bg);
  aspect-ratio: 16 / 9;
}

.post-media-text-only {
  width: 100%;
  min-height: clamp(12.5rem, 30dvh, 25rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-6) var(--spacing-8);
  background: var(--glass-bg-light);
  border-radius: var(--radius-xl);
}

.post-media-text-only__content {
  margin: 0;
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--post-text-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-width: 72ch;
  display: -webkit-box;
  -webkit-line-clamp: 12;
  line-clamp: 12;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.media-viewer::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--media-bg);
  background-position: center;
  background-size: cover;
  filter: blur(3rem) saturate(1.3);
  transform: scale(1.4);
  opacity: 0.45;
  transition: opacity 0.6s ease;
}

.media-viewer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.12) 100%);
  pointer-events: none;
}

.media-item-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  padding: clamp(0.5rem, 1.4vw, 1.25rem);
}

@media (min-width: 900px) {
  .media-item-container {
    padding: clamp(0.75rem, 1.8vw, 1.5rem);
  }
}

.media-clickable {
  cursor: zoom-in;
}

.media-clickable:focus-visible {
  outline: none;
  border-radius: var(--radius-lg);
  box-shadow: inset 0 0 0 2px rgba(var(--color-primary-rgb), 0.4);
}

.media-viewer-expand {
  position: absolute;
  inset-block-start: var(--spacing-3);
  inset-block-end: auto;
  inset-inline-end: var(--spacing-3);
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  padding: 0;
  border: 0.0625rem solid rgba(255, 255, 255, 0.14);
  border-radius: var(--radius-full);
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(0.625rem);
  -webkit-backdrop-filter: blur(0.625rem);
  color: var(--post-overlay-text);
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast),
    background-color var(--transition-fast),
    border-color var(--transition-fast);
}

.media-item-container--viewer {
  align-items: stretch;
  justify-content: stretch;
}

.media-item-container--viewer > .media-viewer-item {
  inline-size: 100%;
  block-size: 100%;
}

.media-clickable:hover .media-viewer-expand,
.media-clickable:focus-visible .media-viewer-expand,
.media-item-container--viewer:hover .media-viewer-expand,
.media-item-container--viewer:focus-within .media-viewer-expand {
  opacity: 1;
}

.media-viewer-expand:hover,
.media-viewer-expand:focus-visible {
  opacity: 1;
  transform: translate3d(0, -0.0625rem, 0);
  background: rgba(15, 23, 42, 0.74);
  border-color: rgba(var(--color-primary-rgb), 0.24);
}

.media-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: blur(0.9375rem);
  transform: scale(1.05);
  opacity: 0.8;
  aspect-ratio: var(--aspect-ratio, 16 / 9);
}

.media-viewer-item {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0;
  opacity: 0;
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  aspect-ratio: var(--aspect-ratio, 16 / 9);
}

@media (min-width: 900px) {
  .media-viewer-item {
    border-radius: 0;
  }
}

.media-viewer-item.is-loaded {
  opacity: 1;
}

.media-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--post-overlay-soft);
  backdrop-filter: blur(0.75rem) saturate(1.2);
  -webkit-backdrop-filter: blur(0.75rem) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--post-overlay-text);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease,
    opacity 0.18s ease,
    box-shadow 0.18s ease;
  z-index: 2;
  opacity: 0;
  padding: 0;
}

.media-viewer:hover .media-nav {
  opacity: 1;
}

.media-nav:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.08);
  background: var(--post-overlay);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
}

.media-nav:active:not(:disabled) {
  transform: translateY(-50%) scale(0.95);
}

.media-nav:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  opacity: 1;
}

.media-nav:disabled {
  opacity: 0;
  cursor: default;
  pointer-events: none;
}

.media-nav.prev {
  left: var(--spacing-3);
}

.media-nav.next {
  right: var(--spacing-3);
}

/* Light theme: darker nav buttons for contrast */
:root .media-nav,
[data-preset='gradient-narrative'][data-color-mode='light'] .media-nav {
  background: rgba(15, 23, 42, 0.56);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.96);
}

:root .media-nav:hover:not(:disabled),
[data-preset='gradient-narrative'][data-color-mode='light'] .media-nav:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.72);
}

/* Dark theme: stable high-contrast nav */
[data-color-mode='dark'] .media-nav {
  background: rgba(8, 12, 18, 0.76);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.96);
}

[data-color-mode='dark'] .media-nav:hover:not(:disabled) {
  background: rgba(17, 24, 39, 0.92);
}

.post-panel {
  height: auto;
  align-self: start;
  min-width: 0;
  max-width: 100%;
  padding: var(--spacing-4);
  background: var(--post-panel-bg);
  border-left: 1px solid var(--post-panel-border);
  backdrop-filter: blur(0.875rem);
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  align-items: stretch;
  box-shadow: var(--post-shadow-md);
}

@media (max-width: 899px) {
  .post-stage {
    padding: var(--spacing-2) 0 var(--spacing-4);
  }

  .media-viewer {
    width: 100%;
    max-height: min(60svh, 36rem);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .post-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, auto) auto;
    gap: 0;
  }

  .post-panel {
    border-left: 0;
    border-top: 1px solid var(--post-panel-border);
    padding: var(--spacing-3);
    gap: var(--spacing-3);
    border-radius: 0;
    box-shadow: none;
  }
  .post-actions {
    padding-bottom: var(--spacing-1);
  }
  .post-header {
    gap: var(--spacing-1);
    padding-bottom: var(--spacing-2);
  }

  .media-item-container {
    padding: var(--spacing-2);
  }

  .media-viewer-expand {
    opacity: 1;
    inline-size: 2.625rem;
    block-size: 2.625rem;
  }

  .post-description--clamped {
    -webkit-line-clamp: 8;
    line-clamp: 8;
  }

  .thumbnail-btn {
    width: 3.5rem;
    height: 3.5rem;
  }

  /* Mobile: always show nav buttons, larger touch targets */
  .media-nav {
    opacity: 0.85;
    width: 2.75rem;
    height: 2.75rem;
  }

  .media-nav:disabled {
    opacity: 0;
  }
}

/* Mid-size screens (landscape phones / tablets): avoid the "mobile-only" stacked layout */
@media (min-width: 768px) and (max-width: 899px) {
  .post-shell {
    grid-template-columns: minmax(0, 1fr) clamp(17.5rem, 36vw, 23.75rem);
    grid-template-rows: 1fr;
  }

  .post-panel {
    border-left: 1px solid var(--post-panel-border);
    border-top: 0;
    padding: var(--spacing-5);
  }
}

.post-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding-bottom: var(--spacing-2);
  min-block-size: 8.5rem;
  border-bottom: 1px solid var(--post-panel-border);
}

.post-title {
  margin: 0;
  font-size: clamp(1.5rem, 2vw + 1rem, 2.4rem);
  font-weight: var(--font-semibold);
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--post-text-secondary);
  font-size: var(--text-sm);
}

.post-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  color: var(--post-text-tertiary);
  font-size: var(--text-sm);
}

.post-stat {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-variant-numeric: tabular-nums;
}

.post-description-block {
  min-width: 0;
  min-block-size: 10rem;
}

.post-description {
  max-width: 65ch;
  color: var(--post-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  margin: 0;
}

.post-description--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 12;
  line-clamp: 12;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-description-more {
  margin-top: var(--spacing-2);
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(var(--color-primary-rgb), 0.95);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.post-description-more:hover {
  text-decoration: underline;
}

.post-text-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-4);
  background: var(--post-overlay);
  backdrop-filter: blur(0.875rem) saturate(1.1);
  -webkit-backdrop-filter: blur(0.875rem) saturate(1.1);
}

.post-text-panel {
  width: min(75ch, calc(100vw - 2 * var(--spacing-4)));
  height: min(82svh, calc(100dvh - 2 * var(--spacing-4)));
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--post-modal-border);
  background: var(--post-modal-bg);
  display: flex;
  flex-direction: column;
}

.post-text-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--post-panel-border);
}

.post-text-title {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--post-text-primary);
}

.post-text-close {
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--post-panel-border);
  background: var(--post-overlay-soft);
  color: var(--post-overlay-text);
}

.post-text-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--spacing-4);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.post-text-body::-webkit-scrollbar {
  display: none;
}

.post-text-content {
  margin: 0;
  max-width: 65ch;
  color: var(--post-text-secondary);
  font-size: clamp(0.9375rem, 1vw + 0.5rem, 1.0625rem);
  white-space: pre-wrap;
  line-height: 1.75;
  overflow-wrap: anywhere;
}

.media-thumbnails {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-2) 0 0;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  min-block-size: 5rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.media-thumbnails::-webkit-scrollbar {
  display: none;
}

.thumbnail-btn {
  flex: 0 0 auto;
  width: 4.5rem;
  height: 4.5rem;
  aspect-ratio: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid transparent;
  background: var(--glass-bg);
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
  cursor: pointer;
}

.thumbnail-btn--placeholder {
  pointer-events: none;
  border-color: transparent;
  box-shadow: none;
}

.thumbnail-btn.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.thumbnail-btn:hover:not(.active) {
  border-color: rgba(var(--color-primary-rgb), 0.4);
  transform: translateY(-0.0625rem);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-btn--placeholder .thumbnail-img {
  inline-size: 100%;
  block-size: 100%;
}

.author-link {
  margin-left: var(--spacing-2);
  color: var(--post-text-primary);
  font-weight: var(--font-medium);
}

.author-link:hover {
  text-decoration: underline;
}

.post-nav-hint {
  position: absolute;
  left: 50%;
  bottom: var(--spacing-4);
  transform: translateX(-50%);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: var(--post-overlay);
  border: 1px solid var(--post-panel-border);
  color: var(--post-overlay-text);
  font-size: var(--text-sm);
  backdrop-filter: blur(0.625rem);
  pointer-events: none;
}

.post-nav-hint[data-direction='left'] {
  animation: hint-left 0.9s var(--ease-out);
}

.post-nav-hint[data-direction='right'] {
  animation: hint-right 0.9s var(--ease-out);
}

@keyframes hint-left {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% + 1.125rem));
  }
  15% {
    opacity: 1;
    transform: translateX(-50%);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%);
  }
}

@keyframes hint-right {
  0% {
    opacity: 0;
    transform: translateX(calc(-50% - 1.125rem));
  }
  15% {
    opacity: 1;
    transform: translateX(-50%);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%);
  }
}

/* Media Transitions */
.media-fade-enter-active,
.media-fade-leave-active {
  transition: opacity 0.3s ease;
}

.media-fade-enter-from,
.media-fade-leave-to {
  opacity: 0;
}

.media-slide-left-enter-active,
.media-slide-left-leave-active,
.media-slide-right-enter-active,
.media-slide-right-leave-active {
  transition:
    opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.media-slide-left-enter-from {
  opacity: 0;
  transform: translateX(1.875rem);
}

.media-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-1.875rem);
}

.media-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-1.875rem);
}

.media-slide-right-leave-to {
  opacity: 0;
  transform: translateX(1.875rem);
}
</style>
