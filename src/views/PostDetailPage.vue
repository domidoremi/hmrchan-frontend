<template>
  <div class="post-detail-page">
    <div class="container">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" />
        {{ $t('common.back') }}
      </button>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPost" />

      <article v-else class="post-content glass-card">
        <template v-if="isLoading">
          <div class="post-image skeleton" style="aspect-ratio: 16/9" />
          <div class="post-body">
            <div class="skeleton" style="height: 32px; width: 70%" />
            <div class="skeleton" style="height: 20px; width: 40%; margin-top: 12px" />
            <div class="skeleton" style="height: 100px; margin-top: 24px" />
          </div>
        </template>

        <template v-else-if="post">
          <div v-if="post.media_files && post.media_files.length > 0" class="post-media">
            <div class="media-viewer" :style="activeMediaViewerStyle">
              <button
                v-if="hasMultipleMedia"
                type="button"
                class="media-nav prev"
                :aria-label="$t('common.previous')"
                @click="prevMedia"
              >
                <ChevronLeft :size="20" />
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
                    :alt="post.title"
                    aria-hidden="true"
                  />
                  <!-- 原图 -->
                  <img
                    class="media-viewer-item"
                    :class="{ 'is-loaded': isMediaLoaded }"
                    :src="getMediaStreamUrl(activeMedia.id)"
                    :alt="post.title"
                    @load="onMediaLoad"
                  />
                  <!-- 点击提示 -->
                  <div class="media-zoom-hint">
                    <span class="zoom-icon">🔍</span>
                    {{ $t('common.clickToEnlarge') }}
                  </div>
                </div>
                <video
                  v-else-if="activeMedia?.file_type === 'video'"
                  :key="`video-${activeMedia.id}`"
                  class="media-viewer-item is-loaded"
                  :src="getMediaStreamUrl(activeMedia.id)"
                  :poster="getMediaThumbnailUrl(activeMedia.id, 'large')"
                  controls
                  playsinline
                  preload="metadata"
                  @loadedmetadata="onMediaLoad"
                />
              </Transition>

              <button
                v-if="hasMultipleMedia"
                type="button"
                class="media-nav next"
                :aria-label="$t('common.next')"
                @click="nextMedia"
              >
                <ChevronRight :size="20" />
              </button>
            </div>

            <div v-if="hasMultipleMedia" class="media-thumbnails">
              <button
                v-for="(media, idx) in post.media_files"
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
                  :alt="post.title"
                  loading="lazy"
                />
              </button>
            </div>
          </div>
          <img
            v-else-if="post.thumbnail_url"
            class="post-image"
            :src="normalizeToThumbnailUrl(post.thumbnail_url, 'large') || post.thumbnail_url"
            :alt="post.title"
            loading="lazy"
            style="aspect-ratio: 16/9; object-fit: cover"
          />
          <div v-else class="post-image skeleton" style="aspect-ratio: 16/9" />

          <div class="post-body">
            <h1 class="post-title">{{ post.title }}</h1>
            <p class="post-meta">
              {{ $t('post.by') }}
              <button type="button" class="author-link" @click="goToAuthor(post.author_id)">
                {{ post.author_name }}
              </button>
            </p>
            <p class="post-stats">
              {{ post.view_count }} {{ $t('post.views') }} · {{ post.like_count }}
              {{ $t('post.likes') }}
            </p>
            <p v-if="post.content" class="post-description">{{ post.content }}</p>
          </div>
        </template>

        <!-- Post Actions -->
        <div class="post-actions">
          <button
            class="action-btn"
            :class="{ active: isFavorited }"
            @click="toggleFavorite"
            :disabled="!isAuthenticated || isFavoriteLoading"
          >
            <Bookmark :size="20" :fill="isFavorited ? 'currentColor' : 'none'" />
            <span>{{ isFavorited ? $t('post.unfavorite') : $t('post.favorite') }}</span>
          </button>
          <button class="action-btn" @click="sharePost">
            <Share2 :size="20" />
            <span>{{ $t('post.share') }}</span>
          </button>
        </div>
      </article>

      <!-- Comments Section -->
      <CommentList :post-id="postId" />
    </div>

    <!-- Media Lightbox -->
    <MediaLightbox
      v-if="post?.media_files?.length"
      v-model:is-open="isLightboxOpen"
      :media-list="post.media_files"
      :initial-index="lightboxInitialIndex"
      :alt="post.title"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Bookmark, Share2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { CommentList } from '@/components/comment'
import { postService, favoriteService, type PostDetailResponse, ApiError } from '@/api'
import {
  getMediaStreamUrl,
  getMediaThumbnailUrl,
  normalizeToThumbnailUrl,
} from '@/utils/mediaOptimizer'
import { useCachedPost } from '@/composables/useCachedPosts'
import { postCache } from '@/utils/cache'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import MediaLightbox from '@/components/ui/MediaLightbox.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const { isAuthenticated } = storeToRefs(authStore)

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

const isFavorited = ref(false)
const favoriteId = ref<number | null>(null)
const isFavoriteLoading = ref(false)

const activeMediaIndex = ref(0)
const mediaTransitionName = ref('media-fade')
const isMediaLoaded = ref(false)
const cachedThumbnailUrl = ref<string | null>(null)
const preloadedImages = ref<Set<string>>(new Set())

// Lightbox 状态
const isLightboxOpen = ref(false)
const lightboxInitialIndex = ref(0)

const activeMedia = computed(() => {
  const list = post.value?.media_files ?? []
  return list[activeMediaIndex.value] ?? null
})

const hasMultipleMedia = computed(() => (post.value?.media_files?.length ?? 0) > 1)

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
  mediaTransitionName.value =
    index > activeMediaIndex.value ? 'media-slide-left' : 'media-slide-right'
  isMediaLoaded.value = false
  activeMediaIndex.value = index
}

function prevMedia() {
  const total = post.value?.media_files?.length ?? 0
  if (total <= 1) return
  mediaTransitionName.value = 'media-slide-right'
  isMediaLoaded.value = false
  activeMediaIndex.value = (activeMediaIndex.value - 1 + total) % total
}

function nextMedia() {
  const total = post.value?.media_files?.length ?? 0
  if (total <= 1) return
  mediaTransitionName.value = 'media-slide-left'
  isMediaLoaded.value = false
  activeMediaIndex.value = (activeMediaIndex.value + 1) % total
}

function onMediaLoad() {
  isMediaLoaded.value = true

  // 预加载相邻图片
  preloadAdjacentMedia()
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

function goBack() {
  router.back()
}

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

// 打开 Lightbox 查看大图
function openLightbox(index?: number) {
  lightboxInitialIndex.value = index ?? activeMediaIndex.value
  isLightboxOpen.value = true
}

async function fetchFavoriteStatus() {
  if (!isAuthenticated.value) {
    isFavorited.value = false
    favoriteId.value = null
    return
  }

  try {
    const res = await favoriteService.check(postId.value)
    isFavorited.value = res.is_favorited
    favoriteId.value = res.favorite_id
  } catch {
    isFavorited.value = false
    favoriteId.value = null
  }
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
    const cached = await postCache.getPost(postId.value)
    if (cached) {
      post.value = cached.data as PostDetailResponse
      activeMediaIndex.value = 0
      isMediaLoaded.value = false
      await fetchFavoriteStatus()
      isLoading.value = false
      loadCachedPost(postId.value).catch(() => {})
      return
    }

    const res = await loadCachedPost(postId.value)
    post.value = res.data
    activeMediaIndex.value = 0
    isMediaLoaded.value = false
    await fetchFavoriteStatus()
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

async function toggleFavorite() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  if (isFavoriteLoading.value) return
  isFavoriteLoading.value = true

  try {
    if (isFavorited.value) {
      if (favoriteId.value !== null) {
        await favoriteService.remove(favoriteId.value)
      }
      isFavorited.value = false
      favoriteId.value = null
      return
    }

    const created = await favoriteService.create(postId.value)
    isFavorited.value = true
    favoriteId.value = created.id
    toastStore.success(t('post.favorite'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    }
  } finally {
    isFavoriteLoading.value = false
  }
}

function sharePost() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  toastStore.success(t('comment.shareSuccess'))
}

onMounted(() => {
  fetchPost()
})

watch(postId, () => {
  fetchPost()
})

watch(isAuthenticated, () => {
  fetchFavoriteStatus()
})

// 清理 sessionStorage
onUnmounted(() => {
  sessionStorage.removeItem(`post-thumbnail-${postId.value}`)
})
</script>

<style scoped>
.post-detail-page {
  padding: var(--spacing-6) 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-4);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.post-content {
  overflow: hidden;
}

.post-media {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.media-viewer {
  position: relative;
  width: 100%;
  /* 使用固定宽高比防止布局抖动 */
  aspect-ratio: var(--aspect-ratio, 16 / 9);
  max-height: min(70vh, 600px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb, 139, 92, 246), 0.03) 0%,
    rgba(var(--color-secondary-rgb, 59, 130, 246), 0.03) 100%
  );
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

@media (max-width: 600px) {
  .media-viewer {
    max-height: min(50vh, 400px);
  }
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
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-lg);
  opacity: 0;
  transition: opacity 0.4s ease;
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

.media-nav:hover {
  transform: translateY(-50%) scale(1.02);
}

.media-nav.prev {
  left: var(--spacing-2);
}

.media-nav.next {
  right: var(--spacing-2);
}

.media-thumbnails {
  display: flex;
  gap: var(--spacing-2);
  padding: 0 var(--spacing-3) var(--spacing-3);
  overflow-x: auto;
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

.post-body {
  padding: var(--spacing-6);
}

.post-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

.post-meta {
  margin-top: var(--spacing-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.author-link {
  margin-left: var(--spacing-2);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.author-link:hover {
  text-decoration: underline;
}

.post-stats {
  margin-top: var(--spacing-2);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.post-description {
  margin-top: var(--spacing-4);
  line-height: 1.7;
}

.post-actions {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--glass-border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  color: var(--color-primary);
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
