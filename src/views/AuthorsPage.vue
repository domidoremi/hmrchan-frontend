<template>
  <div class="authors-page">
    <!-- MindMarket 风格背景装饰 -->
    <div class="authors-bg" aria-hidden="true">
      <div class="authors-bg__blob authors-bg__blob--purple" />
      <div class="authors-bg__blob authors-bg__blob--teal" />
    </div>

    <div class="container">
      <header class="page-hero authors-hero">
        <div class="page-hero__content">
          <div class="page-title-row">
            <div>
              <span class="page-hero__eyebrow">{{ $t('nav.authors') }}</span>
              <h1 class="page-title">{{ $t('nav.authors') }}</h1>
            </div>
            <div class="page-hero__actions">
              <button type="button" class="glass-button" @click="goToExplore">
                {{ $t('nav.explore') }}
              </button>
              <span v-if="isLoading && authors.length > 0" class="spinner spinner-sm" />
            </div>
          </div>

          <div class="page-hero__meta">
            <span class="page-hero__stat">
              <strong>{{ total }}</strong>
              <span>{{ $t('nav.authors') }}</span>
            </span>
          </div>
        </div>
      </header>

      <div v-if="showPreviewNotice" class="fallback-preview glass-card">
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
          <div v-for="i in 8" :key="i" class="author-card glass-card">
            <Skeleton variant="avatar" width="64px" height="64px" />
            <div class="author-info">
              <Skeleton width="60%" height="20px" />
              <Skeleton width="40%" height="14px" />
            </div>
          </div>
        </div>

        <template v-else>
          <div class="authors-grid">
            <button
              v-for="author in authors"
              :key="author.id"
              type="button"
              class="author-card glass-card author-card-btn content-auto-sm"
              @click="goToAuthor(author.id)"
              @mouseenter="prefetchAuthorDetailPage"
              @focus="prefetchAuthorDetailPage"
            >
              <div class="author-card__head">
                <img
                  v-if="author.avatar_url"
                  class="author-avatar"
                  :src="normalizeAvatarUrl(author.avatar_url) || author.avatar_url"
                  :alt="author.display_name || author.name"
                  loading="lazy"
                  decoding="async"
                  style="object-fit: cover"
                />
                <div v-else class="author-avatar skeleton" />
                <span v-if="author.is_verified" class="author-verified">
                  <BadgeCheck :size="14" />
                </span>
              </div>

              <div class="author-info">
                <div class="author-topline">
                  <h3 class="author-name">{{ author.display_name || author.name }}</h3>
                  <span class="author-platform">{{ author.platform }}</span>
                </div>
                <p class="author-username">@{{ author.username }}</p>
                <p v-if="author.description" class="author-description">{{ author.description }}</p>
                <div class="author-meta">
                  <span v-if="author.follower_count" class="author-metric">
                    <Users :size="14" />
                    {{ formatCompactCount(author.follower_count) }}
                  </span>
                  <span v-if="author.post_count" class="author-metric">
                    <FileText :size="14" />
                    {{ formatCompactCount(author.post_count) }}
                  </span>
                </div>
              </div>

              <span class="author-card__cta">
                <ArrowRight :size="16" />
              </span>
            </button>
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

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, BadgeCheck, FileText, Users } from 'lucide-vue-next'
import { authorService, type AuthorListItem, ApiError } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { authorCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import { getFallbackAuthors } from '@/mocks/authorsFallback'
import {
  isServiceUnavailableError,
  resolvePublicFallbackReason,
  type PublicPageDataSource,
} from '@/mocks/publicPageFallback'
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
const showPreviewNotice = computed(() => Boolean(fallbackReason.value) && isUsingFallback.value)

const page = ref(1)
const total = ref(0)
const pageSize = 24

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
  enabled: () => hasMore.value && !isLoading.value && !isLoadingMore.value,
})

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

function goToExplore() {
  router.push('/explore')
}

function formatCompactCount(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`
  return String(value)
}

onMounted(() => {
  if (authors.value.length === 0) {
    void fetchAuthors()
  }
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
[data-theme='dark'] .authors-bg__blob {
  opacity: 0.15;
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: 0;
}

.page-title {
  margin-bottom: 0;
  font-size: var(--text-xl);
}

.fallback-preview {
  display: grid;
  gap: var(--spacing-2);
  padding: clamp(1rem, 1.8vw, 1.25rem);
  margin-block-end: var(--spacing-4);
}

.fallback-preview__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.fallback-preview p {
  margin: 0;
  max-width: 52ch;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.fallback-preview__detail {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

@media (min-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
  }
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
}

@media (min-width: 640px) {
  .authors-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .authors-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1280px) {
  .authors-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1600px) {
  .authors-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 1920px) {
  .authors-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

.author-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}

.author-card-btn {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.author-card__head {
  position: relative;
}

.author-avatar {
  width: 4rem;
  height: 4rem;
  border-radius: 1.4rem;
  flex-shrink: 0;
  box-shadow: 0 1rem 1.8rem -1.3rem rgba(15, 23, 42, 0.45);
}

@media (min-width: 768px) {
  .author-avatar {
    width: 4.5rem;
    height: 4.5rem;
  }
}

.author-verified {
  position: absolute;
  inset-inline-end: -0.25rem;
  inset-block-end: -0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-accent-rgb), 0.18);
  color: var(--color-accent-dark);
  border: 1px solid rgba(var(--color-accent-rgb), 0.22);
}

.author-info {
  flex: 1;
  display: grid;
  gap: var(--spacing-2);
  min-width: 0;
}

.author-topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.author-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-platform {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding-inline: 0.75rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

.author-username {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.author-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.author-metric {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2rem;
  padding-inline: 0.8rem;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.author-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  color: var(--color-text-tertiary);
  transition:
    transform var(--transition-fast),
    color var(--transition-fast);
}

.author-card-btn:hover .author-card__cta {
  color: var(--color-text-primary);
  transform: translateX(0.2rem);
}
</style>
