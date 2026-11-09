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
                  @click="openLightbox()"
                >
                  <img
                    v-if="!isMediaLoaded && placeholderSrc"
                    class="media-placeholder"
                    :src="placeholderSrc"
                    :alt="post?.title || ''"
                    aria-hidden="true"
                  />

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
                  v-else-if="activeMedia?.file_type === 'video' && activeMedia.id"
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
                v-else-if="isTextOnlyRenderablePost && textOnlyPostText"
                class="post-media-text-only"
              >
                <p class="post-media-text-only__content">{{ textOnlyPostText }}</p>
              </div>
              <div class="post-image skeleton" v-else />
            </div>
          </div>

          <aside class="post-panel">
            <header class="post-header">
              <h1
                v-if="detailTitle"
                class="post-title"
                :class="{ 'post-title--long': detailTitle.length > 140 }"
              >
                {{ detailTitle }}
              </h1>
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
                  <PostActionStrip
                    :post-id="postId"
                    :subtitles-available="subtitlesAvailable"
                    :external-links="post?.external_links"
                  />
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
import { getContractResourceId } from '@/utils/contractResourceId'
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
  getPostNavigationSummary,
  updatePostNavigationIndex,
  type PostNavigationContext,
} from '@/utils/postNavigation'
import { buildFallbackPostDetail, getFallbackPostDetailById } from '@/fallbacks/postFallback'
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
import { applyPageMeta } from '@/utils/pageMeta'
import { usePostDetailTextModal } from './post-detail/usePostDetailTextModal'
import {
  buildActiveMediaElementStyle,
  buildActiveMediaViewerStyle,
  buildDetailDescription,
  buildPostDetailPageMeta,
  buildPostDetailNotFoundRouteParams,
  buildDetailTitle,
  buildPublishedMeta,
  computePostDetailScrollProgress,
  getThumbnailPlaceholderCount,
  hasDetailRenderableMedia,
  isMediaPending as computeIsMediaPending,
  isPostDetailAbortError,
  resolveActiveImageSource,
  resolveActiveImageSrcset,
  resolveAdjacentImagePreloadTargets,
  resolveAutoAdvanceMediaTransition,
  resolveFallbackMediaSource,
  resolveFallbackMediaSrcset,
  resolvePlaceholderSource,
  resolvePostDetailFallbackCandidate,
  resolvePostDetailFallbackRecoveryFromError,
  resolvePostDetailFetchErrorOutcome,
  resolvePostDetailMediaHintSource,
  resolvePostDetailNavigationRequest,
  resolvePostDetailNavigationTarget,
  resolvePostDetailText,
  resolvePostDetailTouchNavigationDirection,
  resolvePostDetailWheelIntent,
  resolvePostDetailMediaState,
  resolveSelectedMediaTransition,
  resolveSteppedMediaTransition,
  shouldIgnorePostDetailInteractionTarget,
  shouldLoadCommentsForViewport,
  shouldShowThumbnailRail as computeShouldShowThumbnailRail,
  type PostDetailMediaTransition,
} from './post-detail/postDetailModel'

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

const postId = computed(() => (route.name === 'post-detail' ? (route.params['id'] as string) : ''))
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
let detachCommentsFallbackListeners: (() => void) | null = null
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
  backScrollProgress.value = computePostDetailScrollProgress({
    scrollTop,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  })
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

const isLightboxOpen = ref(false)
const lightboxInitialIndex = ref(0)

const detailTitle = computed(() => buildDetailTitle(post.value))
const detailDescription = computed(() => buildDetailDescription(post.value))

const publishedMeta = computed(() => buildPublishedMeta(post.value, { formatDate, translate: t }))

const {
  isTextModalOpen,
  shouldShowReadFullText,
  openTextModal,
  closeTextModal,
  releaseTextModalBindings,
  resumeTextModalBindings,
} = usePostDetailTextModal({
  detailDescription,
  textModalPanelRef,
})

const mediaState = computed(() => resolvePostDetailMediaState(post.value, activeMediaIndex.value))
const activeMedia = computed(() => mediaState.value.activeMedia)

const detailMediaImageSizes =
  '(min-width: 1100px) 60rem, (min-width: 900px) calc(100vw - 31rem), 100vw'

const subtitlesAvailable = computed(() => mediaState.value.subtitlesAvailable)
const hasMultipleMedia = computed(() => mediaState.value.hasMultipleMedia)
const mediaCount = computed(() => mediaState.value.mediaCount)
const canGoPrevMedia = computed(() => mediaState.value.canGoPrevMedia)
const canGoNextMedia = computed(() => mediaState.value.canGoNextMedia)
const showMediaNavButtons = computed(() => mediaState.value.showMediaNavButtons)

const isMediaPending = computed(() => computeIsMediaPending(post.value, detailFetched.value))

const isTextOnlyRenderablePost = computed(() => !hasDetailRenderableMedia(post.value))
const textOnlyPostText = computed(() => resolvePostDetailText(post.value))

const isImageSequence = computed(() => mediaState.value.isImageSequence)

const canSwipeNavigate = computed(() => settings.value.enableSwipeNavigation)

const activeMediaViewerStyle = computed<Record<string, string>>(() =>
  buildActiveMediaViewerStyle(activeMedia.value)
)

const activeMediaElementStyle = computed<Record<string, string>>(() =>
  buildActiveMediaElementStyle(activeMedia.value)
)

const activeImageSrc = computed(() =>
  resolveActiveImageSource(activeMedia.value, { getMediaThumbnailUrl })
)

const activeImageSrcset = computed(() =>
  resolveActiveImageSrcset(activeMedia.value, { getMediaThumbnailSrcset })
)

const fallbackMediaSrc = computed(() => {
  return resolveFallbackMediaSource(post.value, { resolveThumbnailSrc })
})

const fallbackMediaSrcset = computed(() =>
  resolveFallbackMediaSrcset(post.value, { resolveThumbnailSrcset })
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
  primeImageRequest(
    resolvePostDetailMediaHintSource(postDetail, { getMediaThumbnailUrl, resolveThumbnailSrc })
  )
}

const placeholderSrc = computed(() => {
  return resolvePlaceholderSource({
    activeMedia: activeMedia.value,
    activeMediaIndex: activeMediaIndex.value,
    cachedThumbnailUrl: cachedThumbnailUrl.value,
    preloadedImages: preloadedImages.value,
    getMediaThumbnailUrl,
  })
})

function commitMediaTransition(
  transition: PostDetailMediaTransition | null,
  options: { userInitiated?: boolean } = {}
): boolean {
  if (!transition) return false
  if (options.userInitiated) {
    pauseAutoPlay()
    allowAdjacentMediaPreload.value = true
  }
  mediaTransitionName.value = transition.mediaTransitionName
  isMediaLoaded.value = false
  activeMediaIndex.value = transition.activeMediaIndex
  return true
}

function selectMedia(index: number) {
  commitMediaTransition(
    resolveSelectedMediaTransition(index, activeMediaIndex.value, mediaCount.value),
    { userInitiated: true }
  )
}

function prevMedia(): boolean {
  return commitMediaTransition(
    resolveSteppedMediaTransition(activeMediaIndex.value, mediaCount.value, -1),
    { userInitiated: true }
  )
}

function nextMedia(): boolean {
  return commitMediaTransition(
    resolveSteppedMediaTransition(activeMediaIndex.value, mediaCount.value, 1),
    { userInitiated: true }
  )
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
  if (autoPlayTimer.value === null) return
  window.clearInterval(autoPlayTimer.value)
  autoPlayTimer.value = null
}
function resetAutoPlay() {
  stopAutoPlay()
  if (autoPlayResumeTimer.value !== null) window.clearTimeout(autoPlayResumeTimer.value)
  autoPlayResumeTimer.value = null
  isAutoPlayPaused.value = false
}
function scheduleAutoPlayResume() {
  if (!hasMultipleMedia.value || !isImageSequence.value) return
  if (autoPlayResumeTimer.value !== null) window.clearTimeout(autoPlayResumeTimer.value)
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
  commitMediaTransition(resolveAutoAdvanceMediaTransition(activeMediaIndex.value, mediaCount.value))
}

function preloadAdjacentMedia() {
  const preloadTargets = resolveAdjacentImagePreloadTargets({
    mediaFiles: post.value?.media_files,
    activeMediaIndex: activeMediaIndex.value,
    preloadedImages: preloadedImages.value,
    getMediaThumbnailUrl,
  })

  preloadTargets.forEach(({ thumbnailUrl, fullSizeUrl, shouldPreloadThumbnail }) => {
    if (shouldPreloadThumbnail) {
      const thumbImg = new Image()
      thumbImg.src = thumbnailUrl
      thumbImg.onload = () => preloadedImages.value.add(thumbnailUrl)
    }

    void warmDecodedImage(fullSizeUrl)
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

const checkCommentsVisibility = throttleRAF(() => {
  if (typeof window === 'undefined' || shouldLoadComments.value) return

  const section = commentsSectionRef.value
  if (!section) return

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
  if (viewportHeight <= 0) return

  if (shouldLoadCommentsForViewport({ rect: section.getBoundingClientRect(), viewportHeight })) {
    loadCommentsWhenVisible()
  }
})

function stopCommentsFallbackListeners() {
  detachCommentsFallbackListeners?.()
  detachCommentsFallbackListeners = null
  checkCommentsVisibility.cancel?.()
}

function startCommentsFallbackListeners() {
  if (
    typeof window === 'undefined' ||
    shouldLoadComments.value ||
    detachCommentsFallbackListeners
  ) {
    checkCommentsVisibility()
    return
  }

  const onViewportChange = () => {
    checkCommentsVisibility()
  }

  window.addEventListener('scroll', onViewportChange, { passive: true })
  window.addEventListener('resize', onViewportChange, { passive: true })

  detachCommentsFallbackListeners = () => {
    window.removeEventListener('scroll', onViewportChange)
    window.removeEventListener('resize', onViewportChange)
  }

  checkCommentsVisibility()
}

function loadCommentsWhenVisible() {
  if (shouldLoadComments.value) return
  shouldLoadComments.value = true
  disconnectCommentsObserver()
  stopCommentsFallbackListeners()
}

function observeCommentsSection() {
  if (typeof window === 'undefined' || shouldLoadComments.value) return

  const section = commentsSectionRef.value
  if (!section) return

  startCommentsFallbackListeners()
  disconnectCommentsObserver()
  if ('IntersectionObserver' in window) {
    commentsObserver = createLazyObserver(
      () => {
        loadCommentsWhenVisible()
      },
      { rootMargin: '320px 0px' }
    )
    commentsObserver.observe(section)
  }
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

function navigateToOffset(offset: 1 | -1) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  const target = resolvePostDetailNavigationTarget({
    context: navigationContext.value,
    currentPostId: postId.value,
    offset,
  })
  if (!target) return

  isSwitchingPost.value = true

  try {
    sessionStorage.setItem('post-detail-transition', target.transition)
  } catch {
    // ignore
  }

  updatePostNavigationIndex(target.index)
  router.push(`/post/${target.postId}`)
}

function requestPostNavigate(direction: 1 | -1) {
  const now = Date.now()
  const request = resolvePostDetailNavigationRequest({
    direction,
    pending: pendingPostNav.value,
    now,
  })

  if (request.action === 'navigate') {
    pendingPostNav.value = null
    navigateToOffset(direction)
    return
  }

  pendingPostNav.value = request.pending
  showPeek(request.hint)
  showPostNavHint(request.hint)
}

function applyPostNavigationDirection(direction: 1 | -1) {
  if (direction > 0 ? nextMedia() : prevMedia()) return
  requestPostNavigate(direction)
}

function handleWheel(event: WheelEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (event.ctrlKey || event.metaKey) return
  if (shouldIgnorePostDetailInteractionTarget(event.target)) return

  const wheelIntent = resolvePostDetailWheelIntent({
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    shiftKey: event.shiftKey,
    now: performance.now(),
    state: { accumulator: wheelAccumulator.value, lastEventTime: lastWheelTime.value },
  })
  wheelAccumulator.value = wheelIntent.state.accumulator
  lastWheelTime.value = wheelIntent.state.lastEventTime

  if (!wheelIntent.direction) return
  if (wheelIntent.shouldPreventDefault) event.preventDefault()
  applyPostNavigationDirection(wheelIntent.direction)
}

function handleTouchStart(event: TouchEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (event.touches.length !== 1) return
  if (shouldIgnorePostDetailInteractionTarget(event.target)) return

  touchStartX.value = event.touches[0]?.clientX ?? null
  touchStartY.value = event.touches[0]?.clientY ?? null
}

function handleTouchEnd(event: TouchEvent) {
  if (!canSwipeNavigate.value || isSwitchingPost.value) return
  if (isLightboxOpen.value) return
  if (shouldIgnorePostDetailInteractionTarget(event.target)) return

  const startX = touchStartX.value
  const startY = touchStartY.value
  if (startX === null || startY === null) return

  touchStartX.value = null
  touchStartY.value = null

  const direction = resolvePostDetailTouchNavigationDirection({
    start: { x: startX, y: startY },
    end: {
      x: event.changedTouches[0]?.clientX ?? startX,
      y: event.changedTouches[0]?.clientY ?? startY,
    },
  })
  if (!direction) return

  applyPostNavigationDirection(direction)
}

function goBack() {
  router.back()
}

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

function openLightbox(index?: number) {
  pauseAutoPlay()
  allowAdjacentMediaPreload.value = true
  lightboxInitialIndex.value = index ?? activeMediaIndex.value
  isLightboxOpen.value = true
}

function syncPostMeta(currentPost: PostDetailResponse | null | undefined) {
  const pageMeta = buildPostDetailPageMeta(currentPost, route.path)
  if (pageMeta) applyPageMeta(pageMeta)
}

function cancelPostDetailIdleWork() {
  cancelIdleStageListenerArming?.()
  cancelIdleStageListenerArming = null
  cancelIdlePostViewTracking?.()
  cancelIdlePostViewTracking = null
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

type PostDetailContentState = 'cached-summary' | 'cached' | 'live' | 'fallback'

function applyPostDetailContent(postDetail: PostDetailResponse, state: PostDetailContentState) {
  hintPostMedia(postDetail)
  post.value = postDetail
  detailFetched.value = state !== 'cached-summary'
  activeMediaIndex.value = 0
  isMediaLoaded.value = state === 'fallback'
  if (state !== 'cached-summary') dataSource.value = state
  if (state === 'fallback') error.value = null
  syncNavigationContext()
  syncPostMeta(postDetail)
}

function applyFallbackPost(postDetail: PostDetailResponse) {
  applyPostDetailContent(postDetail, 'fallback')
}

function resolveFallbackPostDetail(currentPostId: string, err: unknown): PostDetailResponse | null {
  const navigationSummary = getPostNavigationSummary(currentPostId)
  const recovery = resolvePostDetailFallbackRecoveryFromError({
    err,
    hasNavigationSummary: Boolean(navigationSummary),
    isNotFoundError: (error) => error instanceof ApiError && error.status === 404,
    isServiceUnavailableError,
  })

  return resolvePostDetailFallbackCandidate({
    recovery,
    navigationSummary,
    buildNavigationFallback: buildFallbackPostDetail,
    resolveStaticFallback: () => getFallbackPostDetailById(currentPostId),
  })
}

async function redirectToPostNotFound(currentPostId: string) {
  if (route.name !== 'post-detail' || postId.value !== currentPostId) return
  await router.replace({
    name: 'not-found',
    params: buildPostDetailNotFoundRouteParams(currentPostId),
    query: route.query,
    hash: route.hash,
  })
}

async function fetchPost(signal?: AbortSignal) {
  if (!postId.value) return
  if (!getContractResourceId(postId.value)) {
    error.value = null
    isLoading.value = false
    await redirectToPostNotFound(postId.value)
    return
  }

  const requestToken = ++fetchPostToken
  const currentPostId = postId.value

  isLoading.value = true
  error.value = null
  detailFetched.value = false
  shouldLoadComments.value = false
  allowAdjacentMediaPreload.value = false
  disconnectCommentsObserver()
  stopCommentsFallbackListeners()

  const cachedThumb = sessionStorage.getItem(`post-thumbnail-${currentPostId}`)
  if (cachedThumb) {
    cachedThumbnailUrl.value = cachedThumb
    primeImageRequest(resolveThumbnailSrc(cachedThumb, 'large') || cachedThumb)
  }

  try {
    const cached = await postCache.getPostEntity(currentPostId)
    if (signal?.aborted || requestToken !== fetchPostToken) return

    if (cached) {
      applyPostDetailContent(cached as PostDetailResponse, 'cached-summary')

      isLoading.value = false

      schedulePostViewTracking(currentPostId, requestToken)

      void loadCachedPost(currentPostId, signal ? { signal } : undefined)
        .then((result) => {
          if (signal?.aborted || requestToken !== fetchPostToken) return
          detailFetched.value = true
          dataSource.value = result.fromCache ? 'cached' : 'live'
        })
        .catch((err) => {
          if (signal?.aborted || isPostDetailAbortError(err) || requestToken !== fetchPostToken)
            return
          const fallbackPost = resolveFallbackPostDetail(currentPostId, err)
          if (fallbackPost) {
            applyFallbackPost(fallbackPost)
          }
        })
      return
    }

    const res = await loadCachedPost(currentPostId, signal ? { signal } : undefined)
    if (signal?.aborted || requestToken !== fetchPostToken) return

    applyPostDetailContent(res.data, res.fromCache ? 'cached' : 'live')

    schedulePostViewTracking(currentPostId, requestToken)
  } catch (err) {
    if (signal?.aborted || isPostDetailAbortError(err) || requestToken !== fetchPostToken) return
    const fallbackPost = resolveFallbackPostDetail(currentPostId, err)
    if (fallbackPost) {
      applyFallbackPost(fallbackPost)
      return
    }
    const fetchErrorOutcome = resolvePostDetailFetchErrorOutcome({
      err,
      isNotFoundError: (error) => error instanceof ApiError && error.status === 404,
      getApiErrorMessage: (error) => (error instanceof ApiError ? error.message : null),
    })

    switch (fetchErrorOutcome.action) {
      case 'not-found-redirect':
        post.value = null
        error.value = null
        detailFetched.value = false
        dataSource.value = 'live'
        await redirectToPostNotFound(currentPostId)
        return
      case 'api-error':
        error.value = fetchErrorOutcome.message
        return
      case 'generic-error':
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

const accessStartTime = Date.now()

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
  fetchPostToken += 1
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())

  cancelPostDetailIdleWork()
  isSwitchingPost.value = false

  if (prevId && prevId !== nextId) {
    sessionStorage.removeItem(`post-thumbnail-${prevId}`)
  }
  cachedThumbnailUrl.value = null
  preloadedImages.value = new Set()
  shouldLoadComments.value = false
  allowAdjacentMediaPreload.value = false
  disconnectCommentsObserver()
  stopCommentsFallbackListeners()
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
  resumeTextModalBindings()
  if (!isLightboxOpen.value) startAutoPlay()
})

onDeactivated(() => {
  stageListenersWanted = false
  fetchPostToken += 1
  isLoading.value = false
  isTextModalOpen.value = false
  cancelPostDetailIdleWork()
  resetAutoPlay()
  detachStageListeners()
  disconnectCommentsObserver()
  stopCommentsFallbackListeners()
  releaseTextModalBindings()
})

onUnmounted(() => {
  stageListenersWanted = false
  fetchPostToken += 1
  isLoading.value = false
  cancelPostDetailIdleWork()
  detachStageListeners()
  resetAutoPlay()
  disconnectCommentsObserver()
  stopCommentsFallbackListeners()
  releaseTextModalBindings()

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

<style scoped src="../styles/page-systems/post-detail-page-view.css"></style>
