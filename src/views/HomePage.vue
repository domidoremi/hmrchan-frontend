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
                <!-- 使用真实 DOM 结构减少 CLS -->
                <h3 class="post-title skeleton-text" style="height: 24px; width: 80%" />
                <div class="post-footer">
                  <p class="post-author skeleton-text" style="height: 16px; width: 60%" />
                </div>
              </div>
            </div>
          </div>

          <template v-else>
            <!-- 多列瀑布流容器 - 物理隔离，零重排 -->
            <div ref="containerRef" class="masonry-container">
              <div
                v-for="(column, index) in columns"
                :key="`col-${index}`"
                :ref="(el) => setColumnRef(el, index)"
                class="masonry-column"
              >
                <PostCard v-for="post in column" :key="post.id" :post="post" @click="goToPost" />
              </div>
            </div>

            <StateIndicator v-if="posts.length === 0" variant="empty" />

            <!-- Load More / Quota Indicator -->
            <LoadMoreSection
              v-if="posts.length > 0"
              :count="visiblePostsCount"
              :total="total"
              :has-more="hasMoreForUi"
              :loading="isLoadingMore"
              :sentinel-ref="setSentinelRef"
              @load-more="loadMore"
            />
          </template>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import { ref, computed, onMounted, onBeforeUnmount, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Compass } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import { postCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const { t } = useI18n()

const posts = ref<PostListItem[]>([])
const allPosts = ref<PostListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const total = ref(0)
const pageSize = 20
const containerRef = ref<HTMLElement | null>(null)
const columnRefs = ref<(HTMLElement | null)[]>([])

const hasMore = computed(() => posts.value.length < total.value)

// 设置列元素引用
const setColumnRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el) {
    columnRefs.value[index] = el as HTMLElement
  }
}

// 获取所有列的真实 DOM 高度
const getRealColumnHeights = (): number[] => {
  return columnRefs.value.map((el) => el?.offsetHeight ?? 0)
}

const sentinelRef = ref<HTMLElement | null>(null)

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

/** 需要过滤的作者名称（无效数据） */
const FILTERED_AUTHORS = ['twitter_unknown_unknown']

// 响应式列数配置
const getResponsiveColumnCount = () => {
  if (typeof window === 'undefined') return 3
  const width = window.innerWidth
  if (width < 640) return 2 // 移动端
  if (width < 1024) return 3 // 平板
  return 4 // 桌面
}

const { columns, columnCount, distributePosts, redistribute, getColumnWidth } = useMasonryColumns({
  initialColumnCount: getResponsiveColumnCount(),
})

// 计算容器宽度
const getContainerWidth = () => {
  if (!containerRef.value) return 1200
  return containerRef.value.offsetWidth
}

// 响应式调整列数
let resizeTimer: ReturnType<typeof setTimeout> | null = null
const handleResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const newCount = getResponsiveColumnCount()
    if (newCount !== columnCount.value) {
      columnCount.value = newCount
      const containerWidth = getContainerWidth()
      const colWidth = getColumnWidth(containerWidth)
      redistribute(allPosts.value, colWidth)
    }
  }, 300)
}

const visiblePostsCount = computed(() => {
  return columns.value.reduce((sum, col) => sum + col.length, 0)
})

const hasMoreForUi = computed(() => hasMore.value)

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
      allPosts.value = []
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

      // 过滤无效作者
      const filtered = res.items.filter(
        (post) => !FILTERED_AUTHORS.includes(post.author_name?.toLowerCase() ?? '')
      )
      allPosts.value = filtered

      // 智能分发到各列（瀑布流核心逻辑）
      const containerWidth = getContainerWidth()
      const colWidth = getColumnWidth(containerWidth)
      distributePosts(filtered, colWidth, false)
    } else {
      // Load More: 追加新内容到最矮列
      posts.value.push(...res.items)

      const filtered = res.items.filter(
        (post) => !FILTERED_AUTHORS.includes(post.author_name?.toLowerCase() ?? '')
      )
      allPosts.value.push(...filtered)

      const containerWidth = getContainerWidth()
      const colWidth = getColumnWidth(containerWidth)

      // 🔑 关键修复：获取真实 DOM 高度，校准虚拟高度，防止新帖子堆积到单列
      const realHeights = getRealColumnHeights()
      if (import.meta.env.DEV) {
        console.log('[Home] LoadMore realHeights:', realHeights)
      }
      distributePosts(filtered, colWidth, true, realHeights)
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
  if (posts.value.length === 0) {
    fetchLatestPosts()
  }

  // 监听窗口大小变化以调整列数
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
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

/* 多列瀑布流容器 - 使用 Flexbox 实现物理隔离 */
.masonry-container {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-4);
  width: 100%;
}

/* 单列容器 - 每列独立的 Flex 容器 */
.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  min-width: 0; /* 防止 Flex 子项溢出 */
}

/* 响应式间距调整 */
@media (max-width: 768px) {
  .masonry-container {
    gap: var(--spacing-3);
  }

  .masonry-column {
    gap: var(--spacing-3);
  }
}

@media (max-width: 480px) {
  .masonry-container {
    gap: var(--spacing-2);
  }

  .masonry-column {
    gap: var(--spacing-2);
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

.loading-indicator {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-16) var(--spacing-4);
  gap: var(--spacing-4);
}

.loading-indicator p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
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
