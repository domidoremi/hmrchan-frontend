<template>
  <div class="post-detail-page">
    <button type="button" class="post-back-fab" :aria-label="$t('common.back')" @click="goBack">
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
      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPost" />

      <div v-else-if="isLoading" class="post-shell post-shell--skeleton">
        <div class="post-media">
          <div class="media-viewer">
            <div class="media-skeleton skeleton" />
          </div>
        </div>
        <aside class="post-panel">
          <div class="skeleton" style="height: 32px; width: 70%" />
          <div class="skeleton" style="height: 20px; width: 40%" />
          <div class="skeleton" style="height: 100px" />
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
                v-if="hasMultipleMedia"
                type="button"
                class="media-nav prev"
                :aria-label="$t('common.previous')"
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
                    :src="getMediaStreamUrl(activeMedia.id)"
                    :alt="post?.title || ''"
                    fetchpriority="high"
                    @load="onMediaLoad"
                  />
                  <!-- 点击提示 -->
                  <div class="media-zoom-hint">
                    <span class="zoom-icon">🔍</span>
                    {{ $t('common.clickToEnlarge') }}
                  </div>
                </div>
                <VideoPlayer
                  v-else-if="activeMedia?.file_type === 'video'"
                  :key="`video-${activeMedia.id}`"
                  class="media-viewer-item is-loaded"
                  :src="getMediaStreamUrl(activeMedia.id)"
                  :poster="getMediaThumbnailUrl(activeMedia.id, 'large')"
                  :subtitles="activeMedia.subtitles ?? null"
                  playsinline
                  @ready="onMediaLoad"
                />
              </Transition>

              <button
                v-if="hasMultipleMedia"
                type="button"
                class="media-nav next"
                :aria-label="$t('common.next')"
                :disabled="!canGoNextMedia"
                @click="nextMedia"
              >
                <AnimatedIcon name="explore" :fallback-icon="ChevronRight" size="md" />
              </button>
            </div>

            <div v-else class="post-media-empty">
              <img
                v-if="post?.thumbnail_url"
                class="post-image"
                :src="
                  normalizeToThumbnailUrl(post?.thumbnail_url ?? '', 'large') ||
                  post?.thumbnail_url ||
                  ''
                "
                :alt="post?.title || ''"
                loading="lazy"
              />
              <div class="post-image skeleton" v-else />
            </div>
          </div>

          <aside class="post-panel">
            <header class="post-header">
              <h1 class="post-title">{{ post?.title || '' }}</h1>
              <p class="post-meta">
                {{ $t('post.by') }}
                <button
                  type="button"
                  class="author-link"
                  @click="post?.author_id && goToAuthor(post.author_id)"
                >
                  {{ post?.author_name || '' }}
                </button>
              </p>
              <p class="post-stats">
                {{ post?.view_count ?? 0 }} {{ $t('post.views') }} · {{ post?.like_count ?? 0 }}
                {{ $t('post.likes') }}
              </p>
            </header>

            <div v-if="post?.content" class="post-description-block">
              <p class="post-description post-description--clamped">{{ post?.content }}</p>
              <button
                v-if="shouldShowReadFullText"
                type="button"
                class="post-description-more"
                @click="openTextModal"
              >
                {{ $t('post.readFullText') }}
              </button>
            </div>

            <div v-if="hasMultipleMedia" class="media-thumbnails">
              <button
                v-for="(media, idx) in post?.media_files ?? []"
                :key="media.id"
                type="button"
                class="thumbnail-btn"
                :class="{ active: idx === activeMediaIndex }"
                :aria-label="`${idx + 1}`"
                @click="selectMedia(idx)"
              >
                <img
                  class="thumbnail-img"
                  :src="getMediaThumbnailUrl(media.id, 'small')"
                  :alt="post?.title || ''"
                  loading="lazy"
                />
              </button>
            </div>

            <PostActionStrip :post-id="postId" :subtitles-available="subtitlesAvailable" />
          </aside>
        </div>
      </template>

      <Transition name="fade">
        <div v-if="postNavHint" class="post-nav-hint" :data-direction="postNavHint">
          {{
            postNavHint === 'left'
              ? $t('post.swipeAgainNext', 'Swipe again to go to next post')
              : $t('post.swipeAgainPrev', 'Swipe again to go to previous post')
          }}
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="isTextModalOpen"
          class="post-text-overlay"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('post.content')"
          @click.self="closeTextModal"
        >
          <div class="post-text-panel" tabindex="-1">
            <header class="post-text-header">
              <h3 class="post-text-title">{{ $t('post.content') }}</h3>
              <button type="button" class="post-text-close" @click="closeTextModal">
                {{ $t('common.close') }}
              </button>
            </header>
            <div class="post-text-body">
              <p class="post-text-content">{{ post?.content }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <div class="post-topbar" role="navigation" :aria-label="$t('common.back')">
      <button
        type="button"
        class="post-topbar__back"
        :aria-label="$t('common.back')"
        @click="goBack"
      >
        <ArrowLeft :size="18" />
      </button>
      <div class="post-topbar__title">
        {{ post?.title || $t('post.preview', 'Post') }}
      </div>
      <div class="post-topbar__actions">
        <PostActionStrip
          v-if="postId"
          :post-id="postId"
          variant="compact"
          :subtitles-available="subtitlesAvailable"
        />
      </div>
    </div>

    <section class="post-comments container">
      <CommentList :post-id="postId" />
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { throttleRAF } from '@/utils/performance'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useAuthStore, useSettingsStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { usePageTitle } from '@/composables/usePageTitle'
import { CommentList } from '@/components/comment'
import { postService, type PostDetailResponse, ApiError } from '@/api'
import PostActionStrip from '@/components/business/PostActionStrip.vue'
import {
  getMediaStreamUrl,
  getMediaThumbnailUrl,
  normalizeToThumbnailUrl,
} from '@/utils/mediaOptimizer'
import { useCachedPost } from '@/composables/useCachedPosts'
import { trackPostView } from '@/composables/useViewTracking'
import { postCache } from '@/utils/cache'
import {
  getPostNavigationContext,
  updatePostNavigationIndex,
  type PostNavigationContext,
} from '@/utils/postNavigation'
import { prefetchPostDetail } from '@/utils/prefetch'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import VideoPlayer from '@/components/ui/VideoPlayer.vue'
import { defineAsyncComponent } from 'vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

// 动态导入大型组件以减少初始包体积
const MediaLightbox = defineAsyncComponent(() => import('@/components/ui/MediaLightbox.vue'))

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)

// 动态标题管理
const { updateTitle } = usePageTitle()

const postId = computed(() => route.params['id'] as string)
const post = ref<PostDetailResponse | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const { data: cachedPost, load: loadCachedPost } = useCachedPost<PostDetailResponse>(
  postService.getPost,
  {
    onUpdate: () => {
      if (cachedPost.value) {
        post.value = cachedPost.value
      }
    },
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

const stageRef = ref<HTMLElement | null>(null)
const navigationContext = ref<PostNavigationContext | null>(null)

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

// Long text → open in overlay modal (avoid nested scrollbars in panel)
const isTextModalOpen = ref(false)
const shouldShowReadFullText = computed(() => (post.value?.content?.length ?? 0) > 280)

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

function openTextModal() {
  if (!post.value?.content) return
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

const subtitlesAvailable = computed(() => {
  const m = activeMedia.value
  return Boolean(m && m.file_type === 'video' && (m.subtitles?.length ?? 0) > 0)
})

const hasMultipleMedia = computed(() => (post.value?.media_files?.length ?? 0) > 1)
const mediaCount = computed(() => post.value?.media_files?.length ?? 0)
const canGoPrevMedia = computed(() => activeMediaIndex.value > 0)
const canGoNextMedia = computed(() => activeMediaIndex.value + 1 < mediaCount.value)

const isImageSequence = computed(() =>
  (post.value?.media_files ?? []).every((media) => media.file_type === 'image')
)

const canSwipeNavigate = computed(() => settings.value.enableSwipeNavigation)

// 计算媒体宽高比，用于固定容器尺寸防止抖动
const activeMediaAspectRatio = computed(() => {
  const media = activeMedia.value
  if (!media?.width || !media?.height) return 16 / 9
  return media.width / media.height
})

const activeMediaViewerStyle = computed<Record<string, string>>(() => {
  const media = activeMedia.value
  if (!media) return {}

  const bgUrl = getMediaThumbnailUrl(media.id, 'large')

  return {
    '--media-bg': `url("${bgUrl}")`,
    '--aspect-ratio': String(activeMediaAspectRatio.value),
  }
})

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
  mediaTransitionName.value = 'media-slide-left'
  isMediaLoaded.value = false
  activeMediaIndex.value = Math.min(total - 1, activeMediaIndex.value + 1)
  return true
}

function onMediaLoad() {
  isMediaLoaded.value = true

  // 预加载相邻图片
  preloadAdjacentMedia()
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

// 预加载相邻媒体的缩略图和原图
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

    // 预加载原图
    const streamUrl = getMediaStreamUrl(media.id)
    if (!preloadedImages.value.has(streamUrl)) {
      const fullImg = new Image()
      fullImg.src = streamUrl
      fullImg.onload = () => preloadedImages.value.add(streamUrl)
    }
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

function prefetchAdjacentPosts() {
  const context = navigationContext.value
  if (!context) return

  const { ids, index } = context
  const prevId = ids[index - 1]
  const nextId = ids[index + 1]

  if (prevId) {
    void prefetchPostDetail(prevId)
  }
  if (nextId) {
    void prefetchPostDetail(nextId)
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
      '.post-panel, .post-actions, .media-thumbnails, .thumbnail-btn, .video-player, .controls, a, button, input, textarea'
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
  lightboxInitialIndex.value = index ?? activeMediaIndex.value
  isLightboxOpen.value = true
}

async function fetchPost() {
  if (isLoading.value) return

  isLoading.value = true
  error.value = null

  // 从 sessionStorage 获取缓存的缩略图
  const cachedThumb = sessionStorage.getItem(`post-thumbnail-${postId.value}`)
  if (cachedThumb) {
    cachedThumbnailUrl.value = cachedThumb
  }

  try {
    const cached = await postCache.getPostEntity(postId.value)
    if (cached) {
      post.value = cached as PostDetailResponse
      activeMediaIndex.value = 0
      isMediaLoaded.value = false

      syncNavigationContext()
      prefetchAdjacentPosts()

      // 更新页面标题
      updateTitle(post.value.title)

      isLoading.value = false

      void Promise.allSettled([trackPostView(postId.value, isAuthenticated.value)])

      loadCachedPost(postId.value).catch(() => {})
      return
    }

    const res = await loadCachedPost(postId.value)
    post.value = res.data
    activeMediaIndex.value = 0
    isMediaLoaded.value = false

    syncNavigationContext()
    prefetchAdjacentPosts()

    // 更新页面标题
    updateTitle(post.value.title)

    void Promise.allSettled([trackPostView(postId.value, isAuthenticated.value)])
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  syncNavigationContext()
  prefetchAdjacentPosts()
  fetchPost()

  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })

  if (stageRef.value) {
    stageRef.value.addEventListener('wheel', handleWheel, { passive: false })
    stageRef.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    stageRef.value.addEventListener('touchend', handleTouchEnd, { passive: true })
  }
})

watch(postId, () => {
  isSwitchingPost.value = false
  syncNavigationContext()
  prefetchAdjacentPosts()
  fetchPost()
})

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
  isTextModalOpen,
  (open) => {
    if (typeof window === 'undefined') return
    if (open) {
      lockBodyScroll()
      window.addEventListener('keydown', onTextModalKeydown)
    } else {
      unlockBodyScroll()
      window.removeEventListener('keydown', onTextModalKeydown)
    }
  },
  { immediate: true }
)

watch(isAuthenticated, () => {
  fetchFavoriteStatus()
})

// 清理 sessionStorage
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)

  if (stageRef.value) {
    stageRef.value.removeEventListener('wheel', handleWheel)
    stageRef.value.removeEventListener('touchstart', handleTouchStart)
    stageRef.value.removeEventListener('touchend', handleTouchEnd)
  }
  stopAutoPlay()
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
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(
      circle at 20% 20%,
      rgba(var(--color-primary-rgb, 139, 92, 246), 0.12),
      transparent 55%
    ),
    radial-gradient(
      circle at 80% 0%,
      rgba(var(--color-secondary-rgb, 59, 130, 246), 0.18),
      transparent 50%
    ),
    #050507;
  color: #f5f5f7;
}

.post-stage {
  position: relative;
  height: calc(100vh - var(--navbar-height));
  height: calc(100svh - var(--navbar-height));
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
}

.post-comments {
  padding: var(--spacing-6) 0 var(--spacing-8);
  /* Improve long-form readability (comments / text) */
  max-width: min(var(--container-max), 900px);
}

.post-topbar {
  position: sticky;
  top: var(--navbar-visible-height, var(--navbar-height));
  z-index: var(--z-sticky);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--glass-bg-strong);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid var(--glass-border);
}

.post-topbar__back {
  width: var(--ui-control-min-size, 44px);
  height: var(--ui-control-min-size, 44px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  transition:
    transform var(--transition-fast),
    background var(--transition-fast);
}

.post-topbar__back:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}

.post-topbar__title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: rgba(255, 255, 255, 0.92);
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
  position: fixed;
  left: var(--spacing-6);
  bottom: calc(var(--spacing-6) + env(safe-area-inset-bottom, 0px));
  z-index: var(--z-fixed);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--color-foreground);
  box-shadow: var(--glass-shadow);
  cursor: pointer;
  transition-property: transform, background-color, box-shadow, border-color;
  transition-duration: 200ms;
  transition-timing-function: var(--ease-out);
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.post-back-fab::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: var(--gradient-primary);
  opacity: 0;
  z-index: -1;
  transition: opacity 200ms var(--ease-out);
}

.post-back-fab:hover {
  transform: translate3d(0, -4px, 0);
  border-color: var(--color-primary);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 20px rgba(var(--color-primary-rgb), 0.2);
}

.post-back-fab:hover::before {
  opacity: 0.1;
}

.post-back-fab:active {
  transform: translate3d(0, -2px, 0) scale(0.95);
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
  filter: drop-shadow(0 0 4px rgba(var(--color-primary-rgb), 0.4));
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
  transform: translateY(-2px);
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

@media (max-width: 768px) {
  /* Avoid overlap with the bottom mobile nav (72px) */
  .post-back-fab {
    bottom: calc(var(--spacing-6) + 72px + env(safe-area-inset-bottom, 0px));
    left: var(--spacing-4);
  }
}

.post-shell--skeleton .media-skeleton {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.post-shell {
  width: min(100%, var(--container-max));
  height: 100%;
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  transition: transform 180ms var(--ease-out);
}

.post-shell.is-peeking-left {
  transform: translateX(-16px);
}

.post-shell.is-peeking-right {
  transform: translateX(16px);
}

@media (min-width: 768px) {
  .post-shell {
    grid-template-columns: minmax(0, 1fr) clamp(300px, 34vw, 420px);
  }

  .post-panel {
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 0;
  }
}

@media (min-width: 1100px) {
  .post-shell {
    grid-template-columns: minmax(0, 1fr) clamp(340px, 30vw, 460px);
  }
}

.post-media {
  position: relative;
  min-width: 0;
  height: 100%;
}

.media-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: var(--aspect-ratio, 16 / 9);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0b0b0f;
}

.post-media-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-viewer::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--media-bg);
  background-position: center;
  background-size: cover;
  filter: blur(40px) saturate(1.2);
  transform: scale(1.3);
  opacity: 0.5;
  transition:
    opacity 0.5s ease,
    background-image 0.3s ease;
}

.media-viewer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.05) 50%,
    rgba(0, 0, 0, 0.15) 100%
  );
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
  padding: var(--spacing-4);
}

@media (min-width: 900px) {
  .media-item-container {
    padding: var(--spacing-6);
  }
}

.media-clickable {
  cursor: zoom-in;
}

.media-zoom-hint {
  position: absolute;
  bottom: var(--spacing-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-full);
  color: white;
  font-size: var(--text-sm);
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.media-clickable:hover .media-zoom-hint {
  opacity: 1;
}

.zoom-icon {
  font-size: var(--text-base);
}

.media-placeholder {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: blur(15px);
  transform: scale(1.05);
  opacity: 0.8;
}

.media-viewer-item {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1200px;
  max-height: 100%;
  object-fit: contain;
  border-radius: 0;
  opacity: 0;
  transition: opacity 0.4s ease;
}

@media (min-width: 900px) {
  .media-viewer-item {
    border-radius: var(--radius-xl);
    box-shadow:
      0 24px 64px rgba(0, 0, 0, 0.35),
      0 8px 24px rgba(0, 0, 0, 0.25);
    background: rgba(0, 0, 0, 0.35);
  }
}

.media-viewer-item.is-loaded {
  opacity: 1;
}

.media-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
  z-index: 2;
}

.media-nav:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.02);
}

.media-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.media-nav.prev {
  left: var(--spacing-2);
}

.media-nav.next {
  right: var(--spacing-2);
}

.post-panel {
  height: 100%;
  min-width: 0;
  padding: var(--spacing-5);
  background: rgba(8, 8, 12, 0.78);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

@media (max-width: 899px) {
  .post-shell {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr) minmax(0, 42svh);
  }

  .post-panel {
    border-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: var(--spacing-4);
    gap: var(--spacing-3);
  }

  .post-description--clamped {
    -webkit-line-clamp: 5;
    line-clamp: 5;
  }

  .thumbnail-btn {
    width: 56px;
    height: 56px;
  }
}

/* Mid-size screens (landscape phones / tablets): avoid the "mobile-only" stacked layout */
@media (min-width: 768px) and (max-width: 899px) {
  .post-shell {
    grid-template-columns: minmax(0, 1fr) clamp(280px, 36vw, 380px);
    grid-template-rows: 1fr;
  }

  .post-panel {
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 0;
    padding: var(--spacing-5);
  }
}

.post-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.post-title {
  font-size: clamp(1.5rem, 2vw + 1rem, 2.4rem);
  font-weight: var(--font-semibold);
  overflow-wrap: anywhere;
}

.post-meta {
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-sm);
}

.post-stats {
  color: rgba(255, 255, 255, 0.55);
  font-size: var(--text-sm);
}

.post-description-block {
  min-width: 0;
}

.post-description {
  max-width: 520px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  margin: 0;
}

.post-description--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 8;
  line-clamp: 8;
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
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px) saturate(1.1);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
}

.post-text-panel {
  width: min(780px, calc(100vw - 2 * var(--spacing-4)));
  height: min(82svh, calc(100vh - 2 * var(--spacing-4)));
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 10, 14, 0.92);
  display: flex;
  flex-direction: column;
}

.post-text-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.post-text-title {
  margin: 0;
  font-size: var(--text-lg);
  color: rgba(255, 255, 255, 0.95);
}

.post-text-close {
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
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
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.media-thumbnails {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-2) 0 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.media-thumbnails::-webkit-scrollbar {
  display: none;
}

.thumbnail-btn {
  flex: 0 0 auto;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  transition: all var(--transition-fast);
}

.thumbnail-btn.active {
  border-color: var(--color-primary);
}

.thumbnail-btn:hover {
  transform: translateY(-1px);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.author-link {
  margin-left: var(--spacing-2);
  color: rgba(255, 255, 255, 0.9);
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
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
  backdrop-filter: blur(10px);
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
    transform: translateX(calc(-50% + 18px));
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
    transform: translateX(calc(-50% - 18px));
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
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.media-slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.media-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.media-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.media-slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
