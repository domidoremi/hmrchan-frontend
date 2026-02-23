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
        <Skeleton variant="image" width="100%" />
        <div class="post-content">
          <Skeleton width="80%" height="18px" />
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
                normalizeToThumbnailUrl(fav.post.thumbnail_url, 'medium') || fav.post.thumbnail_url
              "
              :srcset="getThumbnailSrcset(fav.post.thumbnail_url) || undefined"
              :sizes="thumbnailSizes"
              :alt="fav.post?.title"
              loading="lazy"
              decoding="async"
            />
            <div v-else class="image-placeholder">
              <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" />
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
            <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
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
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import {
  normalizeToThumbnailUrl,
  getThumbnailSrcset,
  extractMediaIdFromUrl,
} from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const favStore = useFavoritesStore()
const { isAuthenticated } = storeToRefs(authStore)

const favorites = computed(() => favStore.items)
const isLoading = computed(() => favStore.isLoading)
const error = computed(() => (favStore.error ? t(favStore.error) : null))
const total = computed(() => favStore.total)
const hasMore = computed(() => favStore.hasMore)
const isLoadingMore = computed(() => favStore.isLoading && favStore.items.length > 0)

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

async function fetchFavorites(reset = true): Promise<boolean> {
  if (!isAuthenticated.value) return false
  await favStore.fetchFavorites(reset)
  return !favStore.error
}

async function loadMore(): Promise<boolean> {
  if (hasMoreToRender.value) {
    revealNextBatch()
    return true
  }

  if (!hasMore.value || isLoading.value) return false
  await favStore.loadMore()
  return !favStore.error
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px',
  enabled: () => hasMoreForUi.value && !isLoading.value,
})

async function removeFavorite(favoriteId: string) {
  const result = await favStore.removeFavorite(favoriteId)
  if (result.success) {
    toastStore.success(t('favorites.removed'))
  } else {
    toastStore.error(t('common.error'))
  }
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
  if (favStore.items.length === 0) {
    fetchFavorites()
  }
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
  padding: 0.25rem 0.75rem;
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

@media (max-width: 768px) {
  .tab-header {
    margin-bottom: var(--spacing-4);
  }

  .tab-title {
    font-size: var(--text-lg);
  }

  .favorite-content {
    padding: var(--spacing-2);
  }

  .favorite-title {
    font-size: var(--text-xs);
  }

  .remove-btn {
    opacity: 1;
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
  line-clamp: 2;
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
  width: 1.75rem;
  height: 1.75rem;
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
