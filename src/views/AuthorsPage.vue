<template>
  <div class="authors-page">
    <!-- MindMarket 风格背景装饰 -->
    <div class="authors-bg" aria-hidden="true">
      <div class="authors-bg__blob authors-bg__blob--purple" />
      <div class="authors-bg__blob authors-bg__blob--teal" />
    </div>

    <div class="container">
      <div class="page-title-row">
        <h1 class="page-title">{{ $t('nav.authors') }}</h1>
        <span v-if="isLoading && authors.length > 0" class="spinner spinner-sm" />
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchAuthors" />

      <template v-else>
        <div v-if="isLoading && authors.length === 0" class="authors-grid">
          <div v-for="i in 8" :key="i" class="author-card glass-card">
            <div class="author-avatar skeleton" />
            <div class="author-info">
              <div class="skeleton" style="height: 20px; width: 60%" />
              <div class="skeleton" style="height: 14px; width: 40%; margin-top: 8px" />
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
              <img
                v-if="author.avatar_url"
                class="author-avatar"
                :src="normalizeAvatarUrl(author.avatar_url) || author.avatar_url"
                :alt="author.name"
                loading="lazy"
                decoding="async"
                style="object-fit: cover"
              />
              <div v-else class="author-avatar skeleton" />

              <div class="author-info">
                <h3 class="author-name">{{ author.name }}</h3>
                <p class="author-username">@{{ author.username }}</p>
              </div>
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

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorListItem, ApiError } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { authorCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()

const { t } = useI18n()

const authors = ref<AuthorListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

const page = ref(1)
const total = ref(0)
const pageSize = 24

const hasMore = computed(() => authors.value.length < total.value)

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

let hasPrefetchedAuthorDetailPage = false

function prefetchAuthorDetailPage() {
  if (hasPrefetchedAuthorDetailPage) return
  hasPrefetchedAuthorDetailPage = true
  import('@/views/AuthorDetailPage.vue').catch(() => {})
}

async function fetchAuthors(reset = true): Promise<boolean> {
  const hadData = authors.value.length > 0

  if (reset) {
    if (isLoading.value) return false
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

  // 从缓存快速加载（仅首次加载时）
  if (reset && !hadData) {
    const cached = await authorCache.getList(params)
    if (cached) {
      authors.value = cached.data as AuthorListItem[]
      total.value = cached.total
    }
  }

  try {
    const res = await authorService.listAuthors(params)

    if (reset) {
      authors.value = res.items
      // 写入缓存
      await authorCache.setList(params, res.items, res.total)
    } else {
      authors.value.push(...res.items)
    }
    total.value = res.total

    return true
  } catch (err) {
    if (authors.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
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

onMounted(() => {
  if (authors.value.length === 0) {
    fetchAuthors()
  }
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
  filter: blur(100px);
  opacity: 0.3;
}

.authors-bg__blob--purple {
  width: 450px;
  height: 450px;
  top: 10%;
  right: -10%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.5) 0%, transparent 70%);
}

.authors-bg__blob--teal {
  width: 400px;
  height: 400px;
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
  margin-bottom: var(--spacing-4);
}

.page-title {
  margin-bottom: 0;
  font-size: var(--text-xl);
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
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
}

.author-card-btn {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .author-avatar {
    width: 56px;
    height: 56px;
  }
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-username {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: var(--spacing-1) 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
