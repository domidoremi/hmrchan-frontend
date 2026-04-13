<template>
  <div class="favorites-page">
    <div class="container">
      <PageHeroShell
        class="favorites-hero"
        :eyebrow="$t('nav.favorites')"
        :title="$t('nav.favorites')"
        :subtitle="$t('favorites.organizeHint')"
      >
        <template #meta>
          <PageMetaRow v-if="isAuthenticated">
            <PageMetaChip>
              <span v-if="isLoading" class="spinner spinner-sm" />
              <span>{{ $t('favorites.totalCount', { count: total ?? 0 }) }}</span>
            </PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <div v-if="!isAuthenticated" class="empty-state empty-surface">
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
          <div v-for="i in 6" :key="i" class="post-card page-list-card">
            <Skeleton variant="image" width="100%" />
            <div class="post-content">
              <Skeleton width="80%" height="18px" />
            </div>
          </div>
        </div>

        <template v-else>
          <PageToolbar tag="section" class="favorites-toolbar">
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
          </PageToolbar>

          <StateIndicator
            v-if="favorites.length === 0"
            variant="empty"
            :description="$t('favorites.empty')"
          />

          <div v-else class="posts-masonry">
            <ProfilePostPreviewCard
              v-for="{ favorite, preview } in visibleFavoriteCards"
              :key="favorite.id"
              class="favorite-card page-list-card content-auto-lg"
              :preview="preview"
              :sizes="thumbnailSizes"
              :empty-label="$t('favorites.unknownPost')"
              :empty-hint="$t('favorites.organizeHint')"
              @select="goToPreview"
            >
              <template #meta>
                <div v-if="favorite.folder_name" class="favorite-chips">
                  <span class="favorite-chip">{{ favorite.folder_name }}</span>
                </div>
                <p v-if="favorite.notes" class="favorite-note">
                  {{ favorite.notes }}
                </p>
                <div class="favorite-meta">
                  <span class="favorite-date">{{ formatDate(favorite.created_at) }}</span>
                </div>
              </template>
              <template #actions>
                <div class="favorite-card-actions">
                  <ControlButton
                    class="card-action-btn"
                    size="square"
                    icon-only
                    :title="$t('common.edit')"
                    :aria-label="$t('common.edit')"
                    @click.stop="openFavoriteEditor(favorite)"
                  >
                    <template #start>
                      <AnimatedIcon name="sparkle" :fallback-icon="PencilLine" size="sm" />
                    </template>
                  </ControlButton>
                  <ControlButton
                    class="card-action-btn card-action-btn--danger"
                    size="square"
                    icon-only
                    :title="$t('favorites.remove')"
                    :aria-label="$t('favorites.remove')"
                    @click.stop="removeFavorite(favorite.id)"
                  >
                    <template #start>
                      <AnimatedIcon name="sparkle" :fallback-icon="X" size="sm" />
                    </template>
                  </ControlButton>
                </div>
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

import { computed, ref, watch, onActivated, onDeactivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Heart, PencilLine, X } from '@lucide/vue'
import { useAuthStore, useToastStore, useFavoritesStore } from '@/stores'
import { favoriteService, type FavoriteResponse } from '@/api/favoriteService'
import { formatDate } from '@/utils/date'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { usePreferredPageSize } from '@/composables/usePreferredPageSize'
import { ensureProtectedPageReady } from '@/composables/useProtectedPageBootstrap'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import PageMetaRow from '@/components/appearance/PageMetaRow.vue'
import PageToolbar from '@/components/appearance/PageToolbar.vue'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import Select from '@/components/ui/Select.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import Textarea from '@/components/ui/Textarea.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ProfilePostPreviewCard from '@/components/profile/ProfilePostPreviewCard.vue'
import { buildFavoritePostPreview, type PostPreviewModel } from '@/components/profile/postPreview'

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
const total = computed(() => favStore.total ?? (favStore.items.length || undefined))
const hasMore = computed(() => favStore.hasMore)
const isLoadingMore = computed(() => favStore.isLoading && favStore.items.length > 0)
const preferredPageSize = usePreferredPageSize({ fallback: 20, min: 10, max: 50 })

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()
const isPageActive = ref(true)
const isBootstrapping = ref(false)
const isProtectedDataReady = ref(false)
const isLogoutInvalidated = ref(false)
let bootstrapPromise: Promise<boolean> | null = null
let bootstrapRunId = 0

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
const visibleFavoriteCards = computed(() =>
  visibleFavorites.value.map((favorite) => ({
    favorite,
    preview: buildFavoritePostPreview(favorite, t('favorites.unknownPost')),
  }))
)
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

function nextBootstrapRunId(): number {
  bootstrapRunId += 1
  return bootstrapRunId
}

function isBootstrapRunActive(runId: number): boolean {
  return (
    runId === bootstrapRunId &&
    isPageActive.value &&
    isAuthenticated.value &&
    !isLogoutInvalidated.value
  )
}

function invalidateFavoritesBootstrap() {
  nextBootstrapRunId()
  bootstrapPromise = null
  isBootstrapping.value = false
  isProtectedDataReady.value = false
  favStore.$reset()
}

async function fetchFavorites(reset = true): Promise<boolean> {
  if (!isAuthenticated.value) return false
  if (!isProtectedDataReady.value) {
    return bootstrapFavoritesPage(reset)
  }
  return favStore.fetchFavorites(reset)
}

async function fetchFavoriteMetadata() {
  if (!isAuthenticated.value) return
  const runId = nextBootstrapRunId()
  if (!(await ensureFavoritesSessionReady(runId))) return
  if (!isBootstrapRunActive(runId)) return
  await Promise.allSettled([favStore.fetchFolders(), favStore.fetchTags()])
}

async function ensureFavoritesSessionReady(runId = bootstrapRunId): Promise<boolean> {
  const ready = await ensureProtectedPageReady(authStore, 'authenticated')

  if (!ready) {
    isProtectedDataReady.value = false
    favStore.$reset()
    return false
  }

  if (!isBootstrapRunActive(runId)) {
    return false
  }

  isProtectedDataReady.value = true
  return true
}

async function bootstrapFavoritesPage(reset = true): Promise<boolean> {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    const runId = nextBootstrapRunId()
    isBootstrapping.value = true

    const ready = await ensureFavoritesSessionReady(runId)
    if (!ready) {
      return false
    }

    await Promise.allSettled([favStore.fetchFolders(), favStore.fetchTags()])
    if (!isBootstrapRunActive(runId)) {
      return false
    }
    return favStore.fetchFavorites(reset)
  })().finally(() => {
    isBootstrapping.value = false
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
  enabled: () =>
    isPageActive.value && hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
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

function goToPreview(preview: PostPreviewModel) {
  const navigationItems = favorites.value.map((favorite) => ({ post_id: favorite.post_id }))
  storePostNavigationContext(navigationItems, preview.postId, 'favorites')
  cachePostThumbnailPreview(preview.postId, preview.thumbnailUrl)
  router.push(preview.target)
}

function goToLogin() {
  router.push('/login')
}

watch([selectedFolder, selectedTag, selectedSort], () => {
  if (!isAuthenticated.value || !isProtectedDataReady.value || isBootstrapping.value) return
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
      isLogoutInvalidated.value = true
      invalidateFavoritesBootstrap()
      return
    }

    isLogoutInvalidated.value = false
    await bootstrapFavoritesPage(true)
  },
  { immediate: true }
)

function handleAuthLogout() {
  isLogoutInvalidated.value = true
  invalidateFavoritesBootstrap()
}

onActivated(() => {
  isPageActive.value = true
  window.addEventListener('auth:logout', handleAuthLogout)
  if (!isAuthenticated.value || isBootstrapping.value) return
  if (isProtectedDataReady.value && (favorites.value.length > 0 || isLoading.value)) return
  void bootstrapFavoritesPage(favorites.value.length === 0)
})

onDeactivated(() => {
  isPageActive.value = false
  window.removeEventListener('auth:logout', handleAuthLogout)
})

onUnmounted(() => {
  window.removeEventListener('auth:logout', handleAuthLogout)
})
</script>

<style scoped>
.favorites-page {
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

.container {
  display: grid;
  gap: var(--spacing-4);
}

.favorites-hero .page-hero-shell__meta {
  align-items: center;
}

.favorites-toolbar.page-toolbar-shell {
  align-items: flex-end;
  gap: var(--spacing-3);
}

.favorites-toolbar__copy {
  flex: 1 1 16rem;
  display: grid;
  gap: var(--spacing-1);
  min-inline-size: 0;
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
  flex: 1 1 22rem;
  display: grid;
  gap: var(--spacing-2);
  min-inline-size: 0;
}

.favorites-filter {
  inline-size: 100%;
  min-inline-size: 0;
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
  justify-self: stretch;
  padding-block: var(--spacing-8);
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

.favorite-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: 0;
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
  margin: 0;
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
  margin-top: 0;
}

.favorite-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.favorite-card-actions {
  position: absolute;
  inset-block-start: var(--spacing-2);
  inset-inline-end: var(--spacing-2);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.card-action-btn.page-control {
  min-inline-size: var(--ui-action-size);
  block-size: var(--ui-action-size);
  padding: 0;
  box-shadow: none;
}

.card-action-btn--danger.page-control {
  color: var(--color-error);
  border-color: rgba(var(--color-error-rgb), 0.18);
  background: rgba(var(--color-error-rgb), 0.08);
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
