<template>
  <div class="favorites-page">
    <div class="container">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <div v-if="!isAuthenticated" class="empty-state glass-card">
        <Heart :size="48" class="empty-icon" />
        <p>{{ $t('favorites.loginRequired') }}</p>
        <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
      </div>

      <template v-else>
        <StateIndicator
          v-if="error"
          variant="error"
          :description="error"
          @action="fetchFavorites"
        />

        <div v-else-if="isLoading && favorites.length === 0" class="posts-grid">
          <div v-for="i in 6" :key="i" class="post-card glass-card">
            <div class="post-image skeleton" style="aspect-ratio: 1;" />
            <div class="post-content">
              <div class="skeleton" style="height: 18px; width: 80%;" />
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
              v-for="fav in favorites"
              :key="fav.id"
              class="favorite-card glass-card"
              @click="goToPost(fav.post_id)"
            >
              <div class="favorite-image">
                <img
                  v-if="fav.post?.thumbnail_url"
                  :src="normalizeToThumbnailUrl(fav.post.thumbnail_url, 'medium') || fav.post.thumbnail_url"
                  :alt="fav.post?.title"
                  loading="lazy"
                />
                <div v-else class="image-placeholder">
                  <Heart :size="24" />
                </div>
              </div>
              <div class="favorite-content">
                <h3 class="favorite-title">{{ fav.post?.title || $t('favorites.unknownPost') }}</h3>
                <p v-if="fav.post?.author_name" class="favorite-author">{{ fav.post.author_name }}</p>
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

          <div v-if="hasMore" class="load-more">
            <Button variant="secondary" :disabled="isLoading" @click="loadMore">
              <span v-if="isLoading" class="spinner spinner-sm" />
              {{ $t('common.viewMore') }}
            </Button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'FavoritesPage' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Heart, X } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { favoriteService, type FavoriteResponse, ApiError } from '@/api'
import { normalizeToThumbnailUrl } from '@/utils/mediaOptimizer'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { isAuthenticated } = storeToRefs(authStore)

const favorites = ref<FavoriteResponse[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 20

const hasMore = computed(() => favorites.value.length < total.value)

async function fetchFavorites(reset = false) {
  if (isLoading.value) return
  if (!isAuthenticated.value) return

  if (reset) {
    page.value = 1
    favorites.value = []
  }

  isLoading.value = true
  error.value = null

  try {
    const res = await favoriteService.list({
      page: page.value,
      page_size: pageSize,
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    if (reset) {
      favorites.value = res.items
    } else {
      favorites.value.push(...res.items)
    }
    total.value = res.total
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

function loadMore() {
  page.value++
  fetchFavorites()
}

async function removeFavorite(favoriteId: number) {
  try {
    await favoriteService.remove(favoriteId)
    favorites.value = favorites.value.filter(f => f.id !== favoriteId)
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

function goToPost(postId: string) {
  router.push(`/post/${postId}`)
}

function goToLogin() {
  router.push('/login')
}

watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    fetchFavorites(true)
  }
})

onMounted(() => {
  if (isAuthenticated.value) {
    fetchFavorites(true)
  }
})
</script>

<style scoped>
.favorites-page {
  padding: var(--spacing-8) 0;
  min-height: 100vh;
}

.page-title {
  margin-bottom: var(--spacing-6);
}

.favorites-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
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
  --masonry-columns: 4;
  --masonry-gap: var(--spacing-4);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > * {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

@media (max-width: 1200px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

@media (max-width: 900px) {
  .posts-masonry {
    --masonry-columns: 2;
  }
}

@media (max-width: 500px) {
  .posts-masonry {
    --masonry-columns: 1;
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
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast), background var(--transition-fast);
}

.favorite-card:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: var(--color-error);
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-8);
}
</style>
