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

          <section class="favorites-toolbar glass-card">
            <div class="favorites-toolbar__copy">
              <h2 class="favorites-toolbar__title">{{ $t('favorites.organizeTitle') }}</h2>
              <p class="favorites-toolbar__hint">{{ $t('favorites.organizeHint') }}</p>
            </div>

            <div class="favorites-toolbar__controls">
              <Select v-model="selectedFolder" class="favorites-filter">
                <option value="">{{ $t('favorites.allFolders') }}</option>
                <option
                  v-for="folder in folders"
                  :key="folder.folder_name"
                  :value="folder.folder_name"
                >
                  {{ folder.folder_name }} ({{ folder.count }})
                </option>
              </Select>

              <Select v-model="selectedTag" class="favorites-filter">
                <option value="">{{ $t('favorites.allTags') }}</option>
                <option v-for="tag in tags" :key="tag.tag" :value="tag.tag">
                  #{{ tag.tag }} ({{ tag.count }})
                </option>
              </Select>

              <Select v-model="selectedSort" class="favorites-filter">
                <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </Select>
            </div>
          </section>

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
                <div v-if="fav.folder_name" class="favorite-chips">
                  <span class="favorite-chip">{{ fav.folder_name }}</span>
                </div>
                <p v-if="fav.notes" class="favorite-note">
                  {{ fav.notes }}
                </p>
                <div class="favorite-meta">
                  <span class="favorite-date">{{ formatDate(fav.created_at) }}</span>
                </div>
              </div>
              <div class="favorite-card-actions">
                <button
                  type="button"
                  class="card-action-btn"
                  :title="$t('common.edit')"
                  :aria-label="$t('common.edit')"
                  @click.stop="openFavoriteEditor(fav)"
                >
                  <AnimatedIcon name="sparkle" :fallback-icon="PencilLine" size="sm" />
                </button>
                <button
                  type="button"
                  class="card-action-btn card-action-btn--danger"
                  :title="$t('favorites.remove')"
                  :aria-label="$t('favorites.remove')"
                  @click.stop="removeFavorite(fav.id)"
                >
                  <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
                </button>
              </div>
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

    <Dialog
      :is-open="showEditDialog"
      :title="$t('favorites.editTitle')"
      :description="editingFavoriteTitle"
      size="sm"
      @update:isOpen="showEditDialog = $event"
    >
      <div class="favorite-editor">
        <div class="form-group">
          <label for="favorite-folder">{{ $t('favorites.folderLabel') }}</label>
          <Input
            id="favorite-folder"
            v-model="favoriteForm.folderName"
            type="text"
            :placeholder="$t('favorites.folderPlaceholder')"
          />
        </div>

        <div v-if="editingFavoriteTags.length" class="form-group">
          <label>{{ $t('favorites.tagsLabel') }}</label>
          <div class="favorite-chips favorite-chips--wrap">
            <span v-for="tag in editingFavoriteTags" :key="tag" class="favorite-chip"
              >#{{ tag }}</span
            >
          </div>
        </div>

        <div class="form-group">
          <label for="favorite-notes">{{ $t('favorites.notesLabel') }}</label>
          <Textarea
            id="favorite-notes"
            v-model="favoriteForm.notes"
            rows="4"
            :placeholder="$t('favorites.notesPlaceholder')"
          />
        </div>
      </div>

      <template #footer>
        <Button type="button" variant="ghost" size="sm" @click="showEditDialog = false">
          {{ $t('common.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          :loading="isSavingFavoriteMeta || isLoadingFavoriteDetail"
          @click="saveFavoriteEditor"
        >
          {{ $t('common.save') }}
        </Button>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'FavoritesPage' })

import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Heart, PencilLine, X } from 'lucide-vue-next'
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import { favoriteService, type FavoriteResponse } from '@/api/favoriteService'
import { normalizeToThumbnailUrl, getThumbnailSrcset } from '@/utils/mediaOptimizer'
import { formatDate } from '@/utils/date'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Select from '@/components/ui/Select.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()
const favStore = useFavoritesStore()
const { isAuthenticated } = storeToRefs(authStore)

const favorites = computed(() => favStore.items)
const folders = computed(() => favStore.folders)
const tags = computed(() => favStore.tags)
const isLoading = computed(() => favStore.isLoading)
const error = computed(() => (favStore.error ? t(favStore.error) : null))
const total = computed(() => favStore.total)
const hasMore = computed(() => favStore.hasMore)
const isLoadingMore = computed(() => favStore.isLoading && favStore.items.length > 0)
const preferredPageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

const selectedFolder = ref('')
const selectedTag = ref('')
const selectedSort = ref<'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc'>(
  'created_desc'
)
const showEditDialog = ref(false)
const isLoadingFavoriteDetail = ref(false)
const isSavingFavoriteMeta = ref(false)
const editingFavorite = ref<FavoriteResponse | null>(null)
const favoriteForm = ref({
  folderName: '',
  notes: '',
})

const sortOptions = computed(() => [
  { value: 'created_desc' as const, label: t('favorites.sortNewest') },
  { value: 'created_asc' as const, label: t('favorites.sortOldest') },
  { value: 'updated_desc' as const, label: t('favorites.sortUpdated') },
  { value: 'updated_asc' as const, label: t('favorites.sortUpdatedAsc') },
])

const {
  visibleItems: visibleFavorites,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(favorites, {
  initialCount: preferredPageSize,
  batchSize: preferredPageSize,
})

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)
const editingFavoriteTitle = computed(
  () => editingFavorite.value?.post?.title || t('favorites.unknownPost')
)
const editingFavoriteTags = computed(() => editingFavorite.value?.tags ?? [])

const thumbnailSizes =
  '(max-width: 500px) 100vw, (max-width: 900px) 50vw, (max-width: 1200px) 33vw, 25vw'

function parseSortValue(value: typeof selectedSort.value) {
  if (value === 'created_asc') {
    return { sort_by: 'created_at' as const, sort_order: 'asc' as const }
  }
  if (value === 'updated_desc') {
    return { sort_by: 'updated_at' as const, sort_order: 'desc' as const }
  }
  if (value === 'updated_asc') {
    return { sort_by: 'updated_at' as const, sort_order: 'asc' as const }
  }
  return { sort_by: 'created_at' as const, sort_order: 'desc' as const }
}

async function fetchFavorites(reset = true): Promise<boolean> {
  if (!isAuthenticated.value) return false
  return favStore.fetchFavorites(reset)
}

async function fetchFavoriteMetadata() {
  if (!isAuthenticated.value) return
  await Promise.allSettled([favStore.fetchFolders(), favStore.fetchTags()])
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
    await fetchFavoriteMetadata()
  } else {
    toastStore.error(t('common.error'))
  }
}

async function openFavoriteEditor(favorite: FavoriteResponse) {
  showEditDialog.value = true
  editingFavorite.value = favorite
  favoriteForm.value = {
    folderName: favorite.folder_name ?? '',
    notes: favorite.notes ?? '',
  }
  isLoadingFavoriteDetail.value = true

  try {
    const detail = await favoriteService.get(favorite.id)
    editingFavorite.value = {
      ...favorite,
      ...detail,
    }
    favoriteForm.value = {
      folderName: detail.folder_name ?? favorite.folder_name ?? '',
      notes: detail.notes ?? favorite.notes ?? '',
    }
  } catch {
    toastStore.error(t('favorites.loadDetailFailed'))
  } finally {
    isLoadingFavoriteDetail.value = false
  }
}

async function saveFavoriteEditor() {
  if (!editingFavorite.value || isSavingFavoriteMeta.value) return

  isSavingFavoriteMeta.value = true

  const folderName = favoriteForm.value.folderName.trim()
  const notes = favoriteForm.value.notes.trim()

  try {
    const result = await favStore.updateFavorite(editingFavorite.value.id, {
      folder_name: folderName || null,
      notes: notes || null,
    })

    if (!result.success) {
      toastStore.error(t('favorites.updateFailed'))
      return
    }

    showEditDialog.value = false
    editingFavorite.value = result.data ?? editingFavorite.value
    toastStore.success(t('favorites.updated'))
    await Promise.all([fetchFavoriteMetadata(), fetchFavorites(true)])
  } finally {
    isSavingFavoriteMeta.value = false
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

watch([selectedFolder, selectedTag, selectedSort], () => {
  if (!isAuthenticated.value) return
  const sort = parseSortValue(selectedSort.value)
  favStore.setFilter({
    folder: selectedFolder.value || undefined,
    tag: selectedTag.value || undefined,
    sort_by: sort.sort_by,
    sort_order: sort.sort_order,
  })
})

watch(
  isAuthenticated,
  async (authenticated) => {
    if (!authenticated) {
      favStore.$reset()
      return
    }

    await fetchFavoriteMetadata()
    await fetchFavorites(true)
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

.favorites-toolbar {
  display: grid;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.favorites-toolbar__copy {
  display: grid;
  gap: var(--spacing-1);
}

.favorites-toolbar__title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.favorites-toolbar__hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.favorites-toolbar__controls {
  display: grid;
  gap: var(--spacing-2);
}

.favorites-filter {
  width: 100%;
}

@media (min-width: 768px) {
  .favorites-toolbar__controls {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
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
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15.625rem), 1fr));
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

.favorite-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.favorite-chips--wrap {
  margin-top: 0;
}

.favorite-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.125rem 0.625rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-size: var(--text-xs);
}

.favorite-note {
  margin: var(--spacing-2) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.favorite-card-actions {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.card-action-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}

.card-action-btn:hover {
  background: rgba(0, 0, 0, 0.75);
}

.card-action-btn--danger:hover {
  background: var(--color-error);
}

.favorite-card:hover .favorite-card-actions {
  opacity: 1;
}

.favorite-card:focus-visible .favorite-card-actions {
  opacity: 1;
}

.favorite-editor {
  display: grid;
  gap: var(--spacing-3);
}

.form-group {
  display: grid;
  gap: var(--spacing-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
</style>
