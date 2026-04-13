<template>
  <div class="favorites-tab">
    <ProfileTabHeader v-if="showHeader" :title="$t('profile.tabs.favorites')" :count="total" />

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
        <ProfilePostPreviewCard
          v-for="{ favorite, preview } in visibleFavoriteCards"
          :key="favorite.id"
          class="favorite-card glass-surface--base content-auto-lg"
          :preview="preview"
          :sizes="thumbnailSizes"
          :empty-label="$t('favorites.unknownPost')"
          :empty-hint="$t('favorites.organizeHint')"
          @select="goToPreview"
        >
          <template #meta>
            <div class="favorite-meta">
              <span class="favorite-date">{{ formatDate(favorite.created_at) }}</span>
            </div>
          </template>
          <template #actions>
            <button
              type="button"
              class="remove-btn"
              :title="$t('favorites.remove')"
              :aria-label="$t('favorites.remove')"
              @click.stop="removeFavorite(favorite.id)"
            >
              <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
            </button>
          </template>
        </ProfilePostPreviewCard>
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
import { X } from '@lucide/vue'
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { formatDate } from '@/utils/date'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { ensureProtectedPageReady } from '@/composables/useProtectedPageBootstrap'
import ProfileTabHeader from '@/components/profile/ProfileTabHeader.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ProfilePostPreviewCard from '@/components/profile/ProfilePostPreviewCard.vue'
import { buildFavoritePostPreview, type PostPreviewModel } from '@/components/profile/postPreview'

withDefaults(
  defineProps<{
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  }
)

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const favStore = useFavoritesStore()
const { isAuthenticated } = storeToRefs(authStore)

const favorites = computed(() => favStore.items)
const isLoading = computed(() => favStore.isLoading)
const error = computed(() => (favStore.error ? t(favStore.error) : null))
const total = computed(() => favStore.total ?? (favStore.items.length || undefined))
const hasMore = computed(() => favStore.hasMore)
const isLoadingMore = computed(() => favStore.isLoading && favStore.items.length > 0)
const preferredPageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()
let bootstrapPromise: Promise<boolean> | null = null

const {
  visibleItems: visibleFavorites,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(favorites, {
  initialCount: preferredPageSize,
  batchSize: preferredPageSize,
})

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)
const visibleFavoriteCards = computed(() =>
  visibleFavorites.value.map((favorite) => ({
    favorite,
    preview: buildFavoritePostPreview(favorite, t('favorites.unknownPost')),
  }))
)

const thumbnailSizes =
  '(max-width: 500px) 100vw, (max-width: 900px) 50vw, (max-width: 1200px) 33vw, 25vw'

async function fetchFavorites(reset = true): Promise<boolean> {
  if (!isAuthenticated.value) return false
  if (bootstrapPromise) {
    return bootstrapPromise
  }
  return favStore.fetchFavorites(reset)
}

async function bootstrapFavorites(reset = true): Promise<boolean> {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    const ready = await ensureProtectedPageReady(authStore, 'authenticated')
    if (!ready) {
      favStore.$reset()
      return false
    }

    return favStore.fetchFavorites(reset)
  })().finally(() => {
    bootstrapPromise = null
  })

  return bootstrapPromise
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

function goToPreview(preview: PostPreviewModel) {
  cachePostThumbnailPreview(preview.postId, preview.thumbnailUrl)
  router.push(preview.target)
}

watch(
  isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      favStore.$reset()
      return
    }
    void bootstrapFavorites(favStore.items.length === 0)
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
  .remove-btn {
    opacity: 1;
    width: 1.5rem;
    height: 1.5rem;
  }
}
</style>
