<template>
  <div class="favorites-tab">
    <ProfileTabHeader :title="$t('profile.tabs.favorites')" :count="total" />

    <StateIndicator
      v-if="error"
      variant="error"
      :description="error"
      @action="() => fetchFavorites(true)"
    />

    <div v-else-if="isLoading && favorites.length === 0" class="posts-grid">
      <div v-for="i in 6" :key="i" class="post-card glass-surface--base">
        <Skeleton variant="image" width="100%" />
        <div class="post-content">
          <Skeleton width="80%" height="1.125rem" />
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
          class="favorite-card glass-surface--base content-auto-lg"
          role="button"
          tabindex="0"
          @click="goToPost(fav.post_id, fav.post?.thumbnail_url)"
          @keydown.enter.prevent="goToPost(fav.post_id, fav.post?.thumbnail_url)"
          @keydown.space.prevent="goToPost(fav.post_id, fav.post?.thumbnail_url)"
        >
          <div class="favorite-image">
            <ThumbnailImage
              :src="fav.post?.thumbnail_url"
              :sizes="thumbnailSizes"
              :alt="fav.post?.title"
              responsive
              loading="lazy"
              decoding="async"
            >
              <template #fallback>
                <div class="image-placeholder">
                  <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" />
                </div>
              </template>
            </ThumbnailImage>
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, X } from '@lucide/vue'
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { extractMediaIdFromUrl } from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import ProfileTabHeader from '@/components/profile/ProfileTabHeader.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import ThumbnailImage from '@/components/ui/ThumbnailImage.vue'
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
const preferredPageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

const {
  visibleItems: visibleFavorites,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(favorites, {
  initialCount: preferredPageSize,
  batchSize: preferredPageSize,
})

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
  enabled: () => hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
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
  cachePostThumbnailPreview(postId, thumbnailUrl)
  if (thumbnailUrl) {
    const mediaId = extractMediaIdFromUrl(thumbnailUrl)
    if (mediaId) {
      router.push(`/post/${postId}?mediaId=${mediaId}`)
      return
    }
  }
  router.push(`/post/${postId}`)
}

watch(
  isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      favStore.$reset()
      return
    }
    void fetchFavorites(favStore.items.length === 0)
  },
  { immediate: true }
)
</script>

<style scoped>
.favorites-tab {
  min-height: 20rem;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4);
}

/* Skeleton Grid */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
  gap: var(--spacing-4);
}

.post-content {
  padding: var(--spacing-3);
}

/* Masonry */
.posts-masonry {
  --masonry-columns: 4;
  --masonry-gap: clamp(0.5rem, 1.5vw, 1rem);
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
  }
}

@media (min-width: 400px) and (max-width: 599px) {
  .posts-masonry {
    --masonry-columns: 2;
  }
}

@media (max-width: 399px) {
  .posts-masonry {
    --masonry-columns: 1;
  }
}

/* Favorite Card */
.favorite-card {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border-radius: var(--profile-section-radius);
  border: 1px solid var(--profile-surface-border);
  background: var(--profile-surface-bg-soft);
  box-shadow: var(--profile-surface-shadow);
  transition:
    transform var(--duration-normal) var(--ease-out-smooth),
    box-shadow var(--duration-normal) var(--ease-smooth),
    border-color var(--duration-fast) var(--ease-smooth);
}

.favorite-card:hover {
  transform: var(--lift-md);
  box-shadow: var(--profile-surface-shadow-hover);
  border-color: var(--profile-surface-border-strong);
}

.favorite-card:focus-visible {
  outline: none;
  transform: var(--lift-md);
  box-shadow:
    var(--glass-shadow-lg),
    0 0 0 2px rgba(var(--color-primary-rgb), 0.35);
}

.favorite-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--profile-muted-bg);
}

.favorite-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--duration-slow) var(--ease-smooth);
}

.favorite-card:hover .favorite-image img {
  transform: scale(1.01);
}

.favorite-card:focus-visible .favorite-image img {
  transform: scale(1.01);
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-tertiary);
}

/* Hover Overlay */
.favorite-content {
  position: absolute;
  inset: auto 0 0;
  padding: clamp(0.5rem, 1.5vw, 0.75rem);
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.3) 60%,
    transparent 100%
  );
  color: var(--color-white);
  opacity: 0;
  transform: translateY(0.5rem);
  transition:
    opacity var(--duration-normal) var(--ease-smooth),
    transform var(--duration-normal) var(--ease-out-smooth);
}

.favorite-card:hover .favorite-content {
  opacity: 1;
  transform: translateY(0);
}

.favorite-card:focus-visible .favorite-content {
  opacity: 1;
  transform: translateY(0);
}

.favorite-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0 0 0.125rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.35;
  color: var(--color-white);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.favorite-author {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.favorite-meta {
  display: flex;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.125rem;
}

/* Remove Button */
.remove-btn {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--profile-action-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--profile-action-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  opacity: 0;
  backdrop-filter: blur(0.25rem);
  transition:
    opacity var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth),
    transform var(--duration-fast) var(--ease-bounce-soft);
}

.favorite-card:hover .remove-btn {
  opacity: 1;
}

.favorite-card:focus-visible .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: var(--color-white);
  transform: scale(1.01);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .favorite-content {
    opacity: 1;
    transform: none;
    position: relative;
    background: none;
    color: var(--color-text-primary);
    padding: var(--spacing-2);
  }

  .favorite-title {
    font-size: var(--text-xs);
    color: var(--color-text-primary);
    text-shadow: none;
  }

  .favorite-author {
    color: var(--color-text-secondary);
  }

  .favorite-meta {
    color: var(--color-text-tertiary);
  }

  .remove-btn {
    opacity: 1;
    width: 1.5rem;
    height: 1.5rem;
  }
}
</style>

<style>
/* ===== Material 3 Overrides ===== */
#app[data-preset='material-calm'] .favorites-tab .favorite-card,
#app[data-preset='sketch-doodle'] .favorites-tab .favorite-card {
  border-radius: var(--radius-lg);
}

#app[data-preset='material-calm'] .favorites-tab .favorite-card:hover,
#app[data-preset='sketch-doodle'] .favorites-tab .favorite-card:hover {
  transform: none;
  box-shadow: var(--shadow-md);
}

#app[data-preset='material-calm'] .favorites-tab .remove-btn,
#app[data-preset='sketch-doodle'] .favorites-tab .remove-btn {
  border-radius: 50%;
}

#app[data-preset='material-calm'] .favorites-tab,
#app[data-preset='sketch-doodle'] .favorites-tab {
  --profile-tab-header-count-radius: var(--radius-sm);
}

/* ===== Dark Theme Overrides ===== */
[data-color-mode='dark'] .favorites-tab .favorite-content {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.4) 60%,
    transparent 100%
  );
}

[data-color-mode='dark'] .favorites-tab .remove-btn {
  background: rgba(0, 0, 0, 0.65);
}

[data-color-mode='dark'] .favorites-tab .image-placeholder {
  background: rgba(255, 255, 255, 0.04);
}

/* ===== Blue Theme Overrides ===== */
#app[data-preset='gradient-narrative'][data-color-mode='light'] .favorites-tab {
  --profile-tab-header-count-bg: rgba(59, 130, 246, 0.08);
  --profile-tab-header-count-color: #3b82f6;
}

#app[data-preset='gradient-narrative'][data-color-mode='light'] .favorites-tab .favorite-card {
  border-color: rgba(59, 130, 246, 0.08);
}

#app[data-preset='gradient-narrative'][data-color-mode='light']
  .favorites-tab
  .favorite-card:hover {
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.12);
}

/* ===== Material + Dark ===== */
#app[data-preset='material-calm'][data-color-mode='dark'] .favorites-tab .favorite-card,
#app[data-preset='sketch-doodle'][data-color-mode='dark'] .favorites-tab .favorite-card {
  background: var(--md-surface-container, rgba(28, 28, 32, 0.92));
  border-color: rgba(255, 255, 255, 0.06);
}

#app[data-preset='material-calm'][data-color-mode='dark'] .favorites-tab .favorite-card:hover,
#app[data-preset='sketch-doodle'][data-color-mode='dark'] .favorites-tab .favorite-card:hover {
  background: var(--md-surface-container-high, rgba(34, 34, 38, 0.95));
}
</style>
