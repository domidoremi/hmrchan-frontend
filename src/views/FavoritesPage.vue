<template>
  <div class="favorites-page">
    <div class="container">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <div v-if="!isAuthenticated" class="empty-state glass-card">
        <AnimatedIcon name="heart" :fallback-icon="Heart" size="xl" class="empty-icon" />
        <p>{{ $t('favorites.loginRequired') }}</p>
        <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
      </div>

      <template v-else>
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
          <div class="favorites-header">
            <span v-if="isLoading" class="spinner spinner-sm" />
            <span class="favorites-count">{{ $t('favorites.totalCount', { count: total }) }}</span>
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
              role="button"
              tabindex="0"
              @click="goToPost(fav.post_id, fav.post?.thumbnail_url)"
              @keydown.enter.prevent="goToPost(fav.post_id, fav.post?.thumbnail_url)"
              @keydown.space.prevent="goToPost(fav.post_id, fav.post?.thumbnail_url)"
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
                :aria-label="$t('favorites.remove')"
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
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'FavoritesPage' })

import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Heart, X } from 'lucide-vue-next'
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import { normalizeToThumbnailUrl, getThumbnailSrcset } from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import Button from '@/components/ui/Button.vue'
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

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

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
  return favStore.fetchFavorites(reset)
}

async function loadMore(): Promise<boolean> {
  if (hasMoreToRender.value) {
    revealNextBatch()
    return true
  }

  if (!hasMore.value || isLoading.value) return false
  return favStore.loadMore()
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
  const navigationItems = favorites.value.map((favorite) => ({ post_id: favorite.post_id }))
  storePostNavigationContext(navigationItems, postId, 'favorites')
  if (thumbnailUrl) {
    sessionStorage.setItem(
      `post-thumbnail-${postId}`,
      normalizeToThumbnailUrl(thumbnailUrl, 'medium') || thumbnailUrl
    )
  }
  router.push(`/post/${postId}`)
}

function goToLogin() {
  router.push('/login')
}

watch(
  isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      favStore.$reset()
      return
    }
    void fetchFavorites(true)
  },
  { immediate: true }
)
</script>

<style scoped>
.favorites-page {
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

.page-title {
  margin-bottom: var(--spacing-4);
  font-size: var(--text-xl);
}

@media (min-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
  }
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.favorites-count {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.posts-masonry {
  --masonry-columns: 2;
  --masonry-gap: var(--spacing-3);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > * {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (min-width: 640px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (min-width: 1024px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

@media (min-width: 1280px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

@media (min-width: 1600px) {
  .posts-masonry {
    --masonry-columns: 6;
  }
}

.post-card {
  overflow: hidden;
}

.post-content {
  padding: var(--spacing-3);
}

.favorite-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.favorite-card:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow:
    var(--shadow-lg),
    0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
}

.favorite-image {
  width: 100%;
  overflow: hidden;
  background: var(--glass-bg-light);
}

.favorite-image img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}

.favorite-content {
  padding: var(--spacing-3);
}

.favorite-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.favorite-author {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin: var(--spacing-1) 0 0;
}

.favorite-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.favorite-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.remove-btn {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    background var(--transition-fast);
}

.favorite-card:hover .remove-btn {
  opacity: 1;
}

.favorite-card:focus-visible .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--color-error);
}
</style>
