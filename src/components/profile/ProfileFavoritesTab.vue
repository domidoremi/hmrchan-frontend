<template>
  <div class="favorites-tab">
    <div class="tab-header">
      <h2 class="tab-title">{{ $t('profile.tabs.favorites') }}</h2>
      <span v-if="total > 0" class="item-count">{{ total }}</span>
    </div>

    <StateIndicator
      v-if="error"
      variant="error"
      :description="error"
      @action="() => fetchFavorites(true)"
    />

    <div v-else-if="isLoading && favorites.length === 0" class="posts-grid">
      <div v-for="i in 6" :key="i" class="post-card glass-card">
        <div class="post-image skeleton" style="aspect-ratio: 1" />
        <div class="post-content">
          <div class="skeleton" style="height: 18px; width: 80%" />
        </div>
      </div>
    </div>

    <template v-else>
      <div v-if="isLoading" class="loading-indicator">
        <span class="spinner spinner-sm" />
      </div>

      <StateIndicator
        v-if="favorites.length === 0"
        variant="empty"
        :description="$t('favorites.empty')"
      />

      <div v-else class="posts-masonry">
        <article
          v-for="fav in visibleFavorites"
          :key="fav.id"
          class="favorite-card glass-card content-auto"
          @click="goToPost(fav.post_id, fav.post?.thumbnail_url)"
        >
          <div class="favorite-image">
            <img
              v-if="fav.post?.thumbnail_url"
              :src="
                normalizeToThumbnailUrl(fav.post.thumbnail_url, 'medium') ||
                fav.post.thumbnail_url
              "
              :srcset="getThumbnailSrcset(fav.post.thumbnail_url) || undefined"
              :sizes="thumbnailSizes"
              :alt="fav.post?.title"
              loading="lazy"
              decoding="async"
            />
            <div v-else class="image-placeholder">
              <Heart :size="24" />
            </div>
          </div>
          <div class="favorite-content">
            <h3 class="favorite-title" :title="fav.post?.title || $t('favorites.unknownPost')">
              {{ fav.post?.title || $t('favorites.unknownPost') }}
            </h3>
            <p v-if="fav.post?.author_name" class="favorite-author">
              {{ fav.post.author_name }}
            </p>
            <div class="favorite-meta">
              <span class="favorite-date">{{ formatDate(fav.created_at) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="remove-btn"
            :title="$t('favorites.remove')"
            @click.stop="removeFavorite(fav.id)"
          >
            <X :size="16" />
          </button>
        </article>
      </div>

      <LoadMoreSection
        v-if="hasMoreForUi"
        :count="visibleFavorites.length"
        :total="total"
        :has-more="hasMoreForUi"
        :loading="isLoadingMore"
        :sentinel-ref="setSentinelRef"
        @load-more="loadMore"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Heart, X } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { favoriteService, type FavoriteResponse, ApiError, apiClient } from '@/api'
import {
  normalizeToThumbnailUrl,
  extractMediaIdFromUrl,
  getMediaThumbnailUrl,
  THUMBNAIL_SIZES,
} from '@/utils/mediaOptimizer'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { isAuthenticated } = storeToRefs(authStore)

const favorites = ref<FavoriteResponse[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 20

const hasMore = computed(() => favorites.value.length < total.value)

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

const {
  visibleItems: visibleFavorites,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(favorites, { initialCount: 20, batchSize: 20 })

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)

const thumbnailSizes =
  '(max-width: 500px) 100vw, (max-width: 900px) 50vw, (max-width: 1200px) 33vw, 25vw'

function getThumbnailSrcset(thumbnailUrl?: string | null): string | null {
  const mediaId = extractMediaIdFromUrl(thumbnailUrl)
  if (!mediaId) return null

  const small = getMediaThumbnailUrl(mediaId, 'small')
  const medium = getMediaThumbnailUrl(mediaId, 'medium')
  const large = getMediaThumbnailUrl(mediaId, 'large')

  return `${small} ${THUMBNAIL_SIZES.small.width}w, ${medium} ${THUMBNAIL_SIZES.medium.width}w, ${large} ${THUMBNAIL_SIZES.large.width}w`
}

async function fetchFavorites(reset = true): Promise<boolean> {
  if (!isAuthenticated.value) return false

  const hadData = favorites.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      favorites.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await favoriteService.list({
      page: page.value,
      page_size: pageSize,
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    const enrichedItems = await Promise.all(
      res.items.map(async (fav): Promise<FavoriteResponse> => {
        if (!fav.post || !fav.post.title) {
          try {
            const postData = await apiClient.get<{ id: string; title: string; thumbnail_url?: string | null; author_name?: string }>(`/posts/${fav.post_id}`)
            return {
              ...fav,
              post: {
                id: postData.id,
                title: postData.title,
                thumbnail_url: postData.thumbnail_url ?? null,
                author_name: postData.author_name ?? undefined,
              },
            } as FavoriteResponse
          } catch {
            return fav
          }
        }
        return fav
      })
    )

    if (reset) {
      favorites.value = enrichedItems
    } else {
      favorites.value.push(...enrichedItems)
    }
    total.value = res.total

    return true
  } catch (err) {
    if (favorites.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore(): Promise<boolean> {
  if (hasMoreToRender.value) {
    revealNextBatch()
    return true
  }

  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchFavorites(false)
  if (!ok) {
    page.value = nextPage - 1
    return false
  }

  return true
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px', // 提前 800px 开始加载
  enabled: () => hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
})

async function removeFavorite(favoriteId: number) {
  try {
    await favoriteService.remove(favoriteId)
    favorites.value = favorites.value.filter((f) => f.id !== favoriteId)
    total.value = Math.max(0, total.value - 1)
    toastStore.success(t('favorites.removed'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    } else {
      toastStore.error(t('common.error'))
    }
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function goToPost(postId: string, thumbnailUrl?: string | null) {
  if (thumbnailUrl) {
    const mediaId = extractMediaIdFromUrl(thumbnailUrl)
    if (mediaId) {
      router.push(`/post/${postId}?mediaId=${mediaId}`)
      return
    }
  }
  router.push(`/post/${postId}`)
}

onMounted(() => {
  fetchFavorites()
})
</script>

<style scoped>
.favorites-tab {
  min-height: 400px;
}

.tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.tab-title {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin: 0;
}

.item-count {
  padding: 4px 12px;
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.posts-masonry {
  --masonry-columns: 4;
  --masonry-gap: var(--spacing-4);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > * {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (min-width: 1600px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

@media (min-width: 1200px) and (max-width: 1599px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

@media (min-width: 900px) and (max-width: 1199px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (min-width: 600px) and (max-width: 899px) {
  .posts-masonry {
    --masonry-columns: 3;
    --masonry-gap: var(--spacing-3);
  }
}

@media (min-width: 400px) and (max-width: 599px) {
  .posts-masonry {
    --masonry-columns: 2;
    --masonry-gap: var(--spacing-2);
  }
}

@media (max-width: 399px) {
  .posts-masonry {
    --masonry-columns: 1;
  }
}

.favorite-card {
  position: relative;
  cursor: pointer;
  transition: all var(--transition-base);
  overflow: hidden;
}

.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.favorite-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--glass-bg-light);
}

.favorite-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-tertiary);
}

.favorite-content {
  padding: var(--spacing-3);
}

.favorite-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--spacing-1) 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.favorite-author {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-2) 0;
}

.favorite-meta {
  display: flex;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.remove-btn {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  color: var(--color-white);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
}

.favorite-card:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--color-error);
  transform: scale(1.1);
}
</style>
