<template>
  <div class="authors-page">
    <div class="container">
      <PageHeroShell class="authors-hero" bare>
        <template #heading>
          <div class="page-hero-shell__title-row">
            <h1 class="page-hero-shell__title">{{ $t('nav.authors') }}</h1>
            <span v-if="heroBadgeLabel" class="page-hero-shell__badge">{{ heroBadgeLabel }}</span>
          </div>
          <p class="page-hero-shell__subtitle">{{ $t('authors.subtitle') }}</p>
        </template>

        <template #actions>
          <div class="page-hero-shell__actions">
            <ControlButton @click="goToExplore">{{ $t('nav.explore') }}</ControlButton>
            <span v-if="isLoading && authors.length > 0" class="spinner spinner-sm" />
          </div>
        </template>

        <template #meta>
          <PageMetaRow class="page-meta-row--comfortable">
            <PageMetaChip>
              <strong>{{ authors.length }}</strong>
              <span>{{ $t('nav.authors') }}</span>
            </PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <h2 class="sr-only">{{ $t('nav.authors') }}</h2>

      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchAuthors"
      />

      <template v-else>
        <div v-if="isLoading && authors.length === 0" class="authors-grid">
          <div v-for="i in 8" :key="i" class="author-skeleton-card page-list-card">
            <Skeleton variant="avatar" width="64px" height="64px" />
            <div class="author-skeleton__info">
              <Skeleton width="60%" height="20px" />
              <Skeleton width="40%" height="14px" />
            </div>
          </div>
        </div>

        <template v-else>
          <div class="authors-grid">
            <AuthorCard
              v-for="author in authors"
              :key="author.id"
              :author="author"
              :prefetch-on-hover="true"
              @click="goToAuthor"
              @mouseenter="prefetchAuthorDetailPage"
              @focus="prefetchAuthorDetailPage"
            />
          </div>

          <StateIndicator v-if="authors.length === 0" variant="empty" />

          <LoadMoreSection
            v-if="authors.length > 0"
            :count="authors.length"
            :total="loadMoreTotal"
            :has-more="hasMore"
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
defineOptions({ name: 'AuthorsPage' })

import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorListItem, ApiError } from '@/api'
import { authorCache, getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { getFallbackAuthors } from '@/fallbacks/authorsFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import { ControlButton, PageHeroShell, PageMetaChip, PageMetaRow } from '@/components/appearance'
import AuthorCard from '@/components/business/AuthorCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import {
  buildAuthorsListParams,
  extractAuthorsCursorState,
  mergeUniqueAuthorsById,
} from '@/views/authors/authorsFeed'

const router = useRouter()

const { t } = useI18n()

const authors = ref<AuthorListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const dataSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => dataSource.value === 'fallback')

const nextCursor = ref<string | null>(null)
const hasMoreState = ref(false)
const pageSize = 24
const isPageActive = ref(true)

const hasMore = computed(() => hasMoreState.value)
const heroBadgeLabel = computed(() =>
  authors.value.length > 0 ? String(authors.value.length) : ''
)
const loadMoreTotal = computed(() =>
  hasMore.value ? authors.value.length + Math.max(pageSize, 1) : Math.max(authors.value.length, 1)
)

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

let hasPrefetchedAuthorDetailPage = false
let fetchAuthorsController: AbortController | null = null
let fetchAuthorsToken = 0
const AUTHORS_LIST_SNAPSHOT_SCOPE = 'authors/list'

function abortFetchAuthors() {
  fetchAuthorsController?.abort()
  fetchAuthorsController = null
}

function prefetchAuthorDetailPage() {
  if (hasPrefetchedAuthorDetailPage) return
  hasPrefetchedAuthorDetailPage = true
  import('@/views/AuthorDetailPage.vue').catch(() => {})
}

async function fetchAuthors(reset = true): Promise<boolean> {
  const hadData = authors.value.length > 0

  if (reset) {
    abortFetchAuthors()
    isLoading.value = true
    if (!hadData) {
      authors.value = []
    }
    nextCursor.value = null
    hasMoreState.value = false
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  const params = buildAuthorsListParams({
    cursor: reset ? null : nextCursor.value,
    pageSize,
  })
  const controller = new AbortController()
  fetchAuthorsController = controller
  const requestToken = ++fetchAuthorsToken

  try {
    // 从缓存快速加载（仅首次加载时）
    if (reset && !hadData) {
      const cached = await authorCache.getList(params)
      if (controller.signal.aborted || requestToken !== fetchAuthorsToken) return false
      if (cached) {
        authors.value = cached.data as AuthorListItem[]
        nextCursor.value =
          typeof cached.meta?.['next_cursor'] === 'string' || cached.meta?.['next_cursor'] === null
            ? (cached.meta['next_cursor'] as string | null)
            : null
        hasMoreState.value = Boolean(cached.meta?.['has_more'] && nextCursor.value)
      }
    }

    const res = await authorService.listAuthors(params, {
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== fetchAuthorsToken) return false

    const cursorState = extractAuthorsCursorState(res)
    if (reset) {
      authors.value = res.items
      // 写入缓存
      await authorCache.setList(params, res.items, res.items.length, undefined, {
        next_cursor: res.next_cursor ?? null,
        has_more: Boolean(res.has_more),
      })
    } else {
      authors.value = mergeUniqueAuthorsById(authors.value, res.items)
    }
    nextCursor.value = cursorState.nextCursor
    hasMoreState.value = cursorState.hasMore
    dataSource.value = 'live'
    await setPublicSnapshot(AUTHORS_LIST_SNAPSHOT_SCOPE, params, res)

    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== fetchAuthorsToken) return false

    if (isServiceUnavailableError(err) && authors.value.length === 0) {
      const cachedSnapshot = await getPublicSnapshot<{
        items: AuthorListItem[]
        total?: number
        next_cursor?: string | null
        has_more?: boolean
      }>(AUTHORS_LIST_SNAPSHOT_SCOPE, params)
      const fallbackResult = cachedSnapshot ?? getFallbackAuthors(params)
      const cursorState = extractAuthorsCursorState({
        next_cursor: fallbackResult.next_cursor ?? null,
        has_more: Boolean(fallbackResult.has_more),
      })
      authors.value = reset
        ? fallbackResult.items
        : mergeUniqueAuthorsById(authors.value, fallbackResult.items)
      nextCursor.value = cursorState.nextCursor
      hasMoreState.value = cursorState.hasMore
      dataSource.value = cachedSnapshot ? 'cached' : 'fallback'
      error.value = null
      return true
    }

    if (authors.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    if (requestToken === fetchAuthorsToken) {
      isLoading.value = false
      isLoadingMore.value = false
      if (fetchAuthorsController === controller) {
        fetchAuthorsController = null
      }
    }
  }
}

async function loadMore(): Promise<boolean> {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  return fetchAuthors(false)
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px', // 提前 800px 开始加载
  enabled: () => isPageActive.value && hasMore.value && !isLoading.value && !isLoadingMore.value,
})

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

function goToExplore() {
  router.push('/explore')
}

onMounted(() => {
  if (authors.value.length === 0) {
    void fetchAuthors()
  }
})

onActivated(() => {
  isPageActive.value = true
  if (authors.value.length === 0) {
    void fetchAuthors()
  }
})

onDeactivated(() => {
  isPageActive.value = false
  abortFetchAuthors()
})

onUnmounted(() => {
  abortFetchAuthors()
})
</script>

<style scoped>
.authors-page {
  position: relative;
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

.authors-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--spacing-3);
}

.author-skeleton-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  pointer-events: none;
}

.author-skeleton__info {
  display: grid;
  gap: var(--spacing-2);
  inline-size: 100%;
}

@media (min-width: 640px) {
  .authors-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .authors-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .authors-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 1600px) {
  .authors-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (min-width: 1920px) {
  .authors-grid {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}
</style>
