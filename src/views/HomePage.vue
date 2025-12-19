<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section v-if="settings.showHeroSection" class="hero">
      <div class="container hero-content">
        <h1 class="hero-title animate-slide-up">{{ $t('home.hero.title') }}</h1>
        <p class="hero-subtitle animate-slide-up stagger-1">{{ $t('home.hero.subtitle') }}</p>
        <div class="hero-actions animate-slide-up stagger-2">
          <Button size="lg" @click="goToExplore">
            <Compass :size="20" />
            {{ $t('nav.explore') }}
          </Button>
        </div>
      </div>
    </section>

    <!-- Latest Posts -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">{{ $t('home.latest') }}</h2>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </div>

        <StateIndicator
          v-if="error"
          variant="error"
          :description="error"
          @action="fetchLatestPosts"
        />

        <template v-else>
          <div v-if="isLoading && posts.length === 0" class="posts-grid">
            <div v-for="i in 6" :key="i" class="post-card glass-card">
              <div class="post-image skeleton" style="aspect-ratio: 16/9" />
              <div class="post-content">
                <div class="skeleton" style="height: 24px; width: 80%" />
                <div class="skeleton" style="height: 16px; width: 60%; margin-top: 8px" />
              </div>
            </div>
          </div>

          <template v-else>
            <div class="posts-masonry">
              <PostCard
                v-for="post in visiblePosts"
                :key="post.id"
                :post="post"
                @click="goToPost"
              />
            </div>

            <StateIndicator v-if="posts.length === 0" variant="empty" />

            <!-- Load More / Quota Indicator -->
            <div v-if="posts.length > 0" class="load-more-section">
              <div class="quota-indicator">
                <span class="quota-text">{{
                  $t('common.showing', { count: visiblePosts.length, total })
                }}</span>
              </div>
              <div v-if="hasMoreForUi" ref="sentinelRef" class="scroll-sentinel">
                <span v-if="isLoadingMore" class="spinner spinner-sm" />
              </div>
              <Button
                v-if="hasMoreForUi"
                variant="secondary"
                :disabled="isLoadingMore"
                @click="loadMore"
              >
                <span v-if="isLoadingMore" class="spinner spinner-sm" />
                {{ $t('common.loadMore') }}
              </Button>
              <p v-else class="no-more-text">{{ $t('common.noMoreItems') }}</p>
            </div>
          </template>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Compass } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import { postCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useProgressiveRender } from '@/composables/useProgressiveRender'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const { t } = useI18n()

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 12

const hasMore = computed(() => posts.value.length < total.value)

const sentinelRef = ref<HTMLElement | null>(null)

const {
  visibleItems: visiblePosts,
  hasMoreToRender,
  revealNextBatch,
} = useProgressiveRender(posts, { initialCount: 20, batchSize: 20 })

const hasMoreForUi = computed(() => hasMore.value || hasMoreToRender.value)

function buildListParams(targetPage: number) {
  return {
    page: targetPage,
    page_size: pageSize,
    sort_by: 'published_at' as const,
    sort_order: 'desc' as const,
  }
}

async function fetchLatestPosts(reset = true): Promise<boolean> {
  const hadData = posts.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      posts.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  const params = buildListParams(page.value)

  if (reset) {
    const cached = await postCache.getList(params)
    if (cached && !hadData) {
      posts.value = cached.data as PostListItem[]
      total.value = cached.total
    }
  }

  try {
    const res = await postService.listPosts(params)

    if (reset) {
      posts.value = res.items
    } else {
      posts.value.push(...res.items)
    }
    total.value = res.total

    if (reset) {
      await postCache.setList(params, res.items, res.total)
    }

    return true
  } catch (err) {
    if (posts.value.length === 0) {
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
  if (hasMoreToRender.value) {
    revealNextBatch()
    return true
  }

  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchLatestPosts(false)
  if (!ok) {
    page.value = nextPage - 1
    return false
  }

  return true
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '400px',
  enabled: () => hasMoreForUi.value && !isLoading.value && !isLoadingMore.value,
})

function goToExplore() {
  router.push('/explore')
}

function goToPost(postId: string, thumbnailSrc: string | null) {
  // 存储缩略图 URL 用于详情页渐进加载
  if (thumbnailSrc) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
  }
  router.push(`/post/${postId}`)
}

onMounted(() => {
  fetchLatestPosts()
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.hero {
  padding: var(--spacing-20) 0;
  text-align: center;
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, transparent 100%);
}

.hero-content {
  max-width: 800px;
}

.hero-title {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-4);
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
}

.section {
  padding: var(--spacing-12) 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.section-title {
  font-size: var(--text-2xl);
  margin-bottom: 0;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.posts-masonry {
  --masonry-columns: 5;
  --masonry-gap: var(--spacing-4);

  column-count: var(--masonry-columns);
  column-gap: var(--masonry-gap);
}

.posts-masonry > :deep(*) {
  break-inside: avoid;
  margin-bottom: var(--masonry-gap);
}

/* 超大屏幕 */
@media (min-width: 1920px) {
  .posts-masonry {
    --masonry-columns: 5;
  }
}

/* 大屏幕 */
@media (min-width: 1600px) and (max-width: 1919px) {
  .posts-masonry {
    --masonry-columns: 4;
  }
}

/* 中等屏幕 */
@media (min-width: 1200px) and (max-width: 1599px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

/* 小屏幕 */
@media (min-width: 900px) and (max-width: 1199px) {
  .posts-masonry {
    --masonry-columns: 3;
  }
}

/* 平板 */
@media (min-width: 600px) and (max-width: 899px) {
  .posts-masonry {
    --masonry-columns: 3;
    --masonry-gap: var(--spacing-3);
  }
}

/* 手机 */
@media (min-width: 400px) and (max-width: 599px) {
  .posts-masonry {
    --masonry-columns: 2;
    --masonry-gap: var(--spacing-2);
  }
}

/* 小手机 */
@media (max-width: 399px) {
  .posts-masonry {
    --masonry-columns: 1;
  }
}

.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.post-image {
  width: 100%;
}

.post-content {
  padding: var(--spacing-4);
}

.load-more-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-8);
  padding: var(--spacing-4);
}

.quota-indicator {
  text-align: center;
}

.quota-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.no-more-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .hero {
    padding: var(--spacing-12) 0;
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }
}
</style>
