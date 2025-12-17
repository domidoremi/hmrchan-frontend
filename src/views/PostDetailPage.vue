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
          <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
          <div class="post-body">
            <div class="skeleton" style="height: 32px; width: 70%;" />
            <div class="skeleton" style="height: 20px; width: 40%; margin-top: 12px;" />
            <div class="skeleton" style="height: 100px; margin-top: 24px;" />
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

              <img
                v-if="activeMedia?.file_type === 'image'"
                class="media-viewer-item"
                :src="getMediaStreamUrl(activeMedia.id)"
                :alt="post.title"
                loading="lazy"
              />
              <video
                v-else-if="activeMedia?.file_type === 'video'"
                class="media-viewer-item"
                :src="getMediaStreamUrl(activeMedia.id)"
                :poster="getMediaThumbnailUrl(activeMedia.id, 'large')"
                controls
                playsinline
                preload="metadata"
              />

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
            style="aspect-ratio: 16/9; object-fit: cover;"
          />
          <div v-else class="post-image skeleton" style="aspect-ratio: 16/9;" />

          <div class="post-body">
            <h1 class="post-title">{{ post.title }}</h1>
            <p class="post-meta">
              {{ $t('post.by') }}
              <button type="button" class="author-link" @click="goToAuthor(post.author_id)">
                {{ post.author_name }}
              </button>
            </p>
            <p class="post-stats">
              {{ post.view_count }} {{ $t('post.views') }} · {{ post.like_count }} {{ $t('post.likes') }}
            </p>
            <p v-if="post.description" class="post-description">{{ post.description }}</p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Bookmark, Share2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { CommentList } from '@/components/comment'
import { postService, favoriteService, type PostDetailResponse, ApiError } from '@/api'
import { getMediaStreamUrl, getMediaThumbnailUrl, normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import StateIndicator from '@/components/ui/StateIndicator.vue'

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

const isFavorited = ref(false)
const favoriteId = ref<number | null>(null)
const isFavoriteLoading = ref(false)

const activeMediaIndex = ref(0)

const activeMedia = computed(() => {
  const list = post.value?.media_files ?? []
  return list[activeMediaIndex.value] ?? null
})

const hasMultipleMedia = computed(() => (post.value?.media_files?.length ?? 0) > 1)

const activeMediaViewerStyle = computed<Record<string, string>>(() => {
  const media = activeMedia.value
  if (!media) return {}

  const bgUrl = getMediaThumbnailUrl(media.id, 'large')

  return {
    '--media-bg': `url("${bgUrl}")`,
  }
})

function selectMedia(index: number) {
  activeMediaIndex.value = index
}

function prevMedia() {
  const total = post.value?.media_files?.length ?? 0
  if (total <= 1) return
  activeMediaIndex.value = (activeMediaIndex.value - 1 + total) % total
}

function nextMedia() {
  const total = post.value?.media_files?.length ?? 0
  if (total <= 1) return
  activeMediaIndex.value = (activeMediaIndex.value + 1) % total
}

function goBack() {
  router.back()
}

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
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

  try {
    post.value = await postService.getPost(postId.value)
    activeMediaIndex.value = 0
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
  min-height: 240px;
  max-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}

.media-viewer::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--media-bg);
  background-position: center;
  background-size: cover;
  filter: blur(28px);
  transform: scale(1.2);
  opacity: 0.6;
}

.media-viewer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  opacity: 0.35;
}

.media-viewer-item {
  position: relative;
  max-width: 100%;
  max-height: 70vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius-xl);
  z-index: 1;
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
</style>
