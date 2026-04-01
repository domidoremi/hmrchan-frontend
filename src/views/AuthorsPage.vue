<template>
  <div class="authors-page">
    <!-- MindMarket 风格背景装饰 -->
    <div class="authors-bg" aria-hidden="true">
      <div class="authors-bg__blob authors-bg__blob--purple" />
      <div class="authors-bg__blob authors-bg__blob--teal" />
    </div>

    <div class="container">
      <PageHeroShell class="authors-hero" bare>
        <template #heading>
          <span class="page-hero-shell__eyebrow">{{ $t('nav.authors') }}</span>
          <div class="page-hero-shell__title-row">
            <h1 class="page-hero-shell__title">{{ $t('nav.authors') }}</h1>
            <span class="page-hero-shell__badge">{{ total }}</span>
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
          <PageMetaRow>
            <PageMetaChip>
              <strong>{{ total }}</strong>
              <span>{{ $t('nav.authors') }}</span>
            </PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <div v-if="showPreviewNotice" class="fallback-preview empty-surface">
        <span class="fallback-preview__label">{{ $t('home.preview.label') }}</span>
        <p>{{ $t('home.preview.desc') }}</p>
        <span v-if="fallbackReason" class="fallback-preview__detail">{{ fallbackReason }}</span>
      </div>

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
            :total="total"
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
import { authorCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { shouldExposeFallbackPreviewNotice } from '@/utils/runtimeHost'
import { getFallbackAuthors } from '@/fallbacks/authorsFallback'
import {
  isServiceUnavailableError,
  resolvePublicFallbackReason,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import PageMetaRow from '@/components/appearance/PageMetaRow.vue'
import AuthorCard from '@/components/business/AuthorCard.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'

const router = useRouter()

const { t } = useI18n()

const authors = ref<AuthorListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const dataSource = ref<PublicPageDataSource>('live')
const fallbackReason = ref<string | null>(null)
const isUsingFallback = computed(() => dataSource.value === 'fallback')
const showPreviewNotice = computed(
  () =>
    Boolean(fallbackReason.value) && isUsingFallback.value && shouldExposeFallbackPreviewNotice()
)

const page = ref(1)
const total = ref(0)
const pageSize = 24
const isPageActive = ref(true)

const hasMore = computed(() => authors.value.length < total.value)

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

let hasPrefetchedAuthorDetailPage = false
let fetchAuthorsController: AbortController | null = null
let fetchAuthorsToken = 0

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
    page.value = 1
    if (!hadData) {
      authors.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  const params = { page: page.value, page_size: pageSize }
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
        total.value = cached.total
      }
    }

    const res = await authorService.listAuthors(params, {
      signal: controller.signal,
      skipErrorToast: true,
    })
    if (controller.signal.aborted || requestToken !== fetchAuthorsToken) return false

    if (reset) {
      authors.value = res.items
      // 写入缓存
      await authorCache.setList(params, res.items, res.total)
    } else {
      authors.value.push(...res.items)
    }
    total.value = res.total
    dataSource.value = 'live'
    fallbackReason.value = null

    return true
  } catch (err) {
    if (controller.signal.aborted || requestToken !== fetchAuthorsToken) return false

    if (isServiceUnavailableError(err) && authors.value.length === 0) {
      const fallbackResult = getFallbackAuthors(params)
      authors.value = reset ? fallbackResult.items : [...authors.value, ...fallbackResult.items]
      total.value = fallbackResult.total
      dataSource.value = 'fallback'
      fallbackReason.value = resolvePublicFallbackReason(err) ?? t('error.serviceUnavailable')
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

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchAuthors(false)
  if (!ok) {
    page.value = nextPage - 1
  }
  return ok
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

/* ========== MindMarket 风格背景 ========== */
.authors-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  /* Keep page blobs behind the global contextual 3D background */
  z-index: -2;
  overflow: hidden;
}

.authors-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(6.25rem);
  opacity: 0.3;
}

.authors-bg__blob--purple {
  width: 28.125rem;
  height: 28.125rem;
  top: 10%;
  right: -10%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.5) 0%, transparent 70%);
}

.authors-bg__blob--teal {
  width: 25rem;
  height: 25rem;
  bottom: 15%;
  left: -8%;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.4) 0%, transparent 70%);
}

/* 暗色模式调整 */
[data-color-mode='dark'] .authors-bg__blob {
  opacity: 0.15;
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .authors-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
