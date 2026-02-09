<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section
      v-if="settings.showHeroSection"
      class="hero"
      :class="{ 'hero--animated': shouldAnimate }"
    >
      <div class="hero-content container">
        <div class="hero-badge">
          <span class="hero-badge__dot" />
          <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
          <span>{{ $t('home.hero.badge') }}</span>
        </div>

        <h1 class="hero-title gradient-text">{{ $t('home.hero.title') }}</h1>
        <p class="hero-subtitle">{{ $t('home.hero.subtitle') }}</p>

        <div class="hero-actions">
          <Button size="lg" variant="primary" class="hero-btn" @click="goToExplore">
            <AnimatedIcon name="explore" :fallback-icon="Compass" size="md" />
            {{ $t('nav.explore') }}
          </Button>
          <Button size="lg" variant="ghost" @click="scrollToBento">
            <AnimatedIcon name="explore" :fallback-icon="ArrowDown" size="md" class="hero-arrow" />
            {{ $t('common.learnMore') }}
          </Button>
        </div>
      </div>

      <!-- Hero → Bento 过渡 -->
      <div class="hero-transition" />
    </section>

    <!-- Bento Grid -->
    <section ref="bentoRef" class="bento">
      <div class="bento-bg" aria-hidden="true" />
      <div class="container">
        <header class="bento-header">
          <h2>{{ $t('home.quickStart.title') }}</h2>
          <p>{{ $t('home.quickStart.subtitle') }}</p>
        </header>

        <div class="bento-grid">
          <RouterLink to="/explore" class="bento-card bento-card--feature glass-card">
            <div class="bento-card__icon bento-card__icon--primary">
              <AnimatedIcon name="explore" :fallback-icon="Layers" size="lg" />
            </div>
            <h3>{{ $t('home.bento.featureTitle') }}</h3>
            <p>{{ $t('home.bento.featureSubtitle') }}</p>
            <AnimatedIcon
              name="explore"
              :fallback-icon="ArrowUpRight"
              size="sm"
              class="bento-card__arrow"
            />
          </RouterLink>

          <RouterLink to="/search" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--search">
              <AnimatedIcon name="search" :fallback-icon="Search" size="lg" />
            </div>
            <h3>{{ $t('nav.search') }}</h3>
            <p>{{ $t('home.bento.searchMeta') }}</p>
          </RouterLink>

          <RouterLink to="/community" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--community">
              <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="lg" />
            </div>
            <h3>{{ $t('nav.community') }}</h3>
            <p>{{ $t('home.bento.communityMeta') }}</p>
          </RouterLink>

          <RouterLink to="/authors" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--authors">
              <AnimatedIcon name="user" :fallback-icon="Users" size="lg" />
            </div>
            <h3>{{ $t('nav.authors') }}</h3>
            <p>{{ $t('home.bento.authorsMeta') }}</p>
          </RouterLink>

          <RouterLink :to="favoritesLink" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--favorites">
              <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" />
            </div>
            <h3>{{ $t('nav.favorites') }}</h3>
            <p>
              {{
                isAuthenticated
                  ? $t('home.bento.favoritesMeta')
                  : $t('home.bento.favoritesMetaGuest')
              }}
            </p>
          </RouterLink>
        </div>
      </div>

      <!-- Bento → Posts 过渡 -->
      <div class="bento-transition" />
    </section>

    <!-- Latest Posts -->
    <section class="posts">
      <div class="posts-bg" aria-hidden="true" />
      <div class="container">
        <header class="posts-header">
          <h2>{{ $t('home.latest') }}</h2>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </header>

        <StateIndicator
          v-if="error"
          variant="error"
          :description="error"
          @action="fetchLatestPosts"
        />

        <template v-else>
          <!-- 骨架屏：使用与真实内容相同的 masonry 布局结构，避免 CLS -->
          <div v-if="isLoading && posts.length === 0" ref="containerRef" class="masonry">
            <div
              v-for="colIndex in skeletonColumnCount"
              :key="`skeleton-col-${colIndex}`"
              class="masonry__col"
            >
              <PostCardSkeleton v-for="i in skeletonPerColumn" :key="`skeleton-${colIndex}-${i}`" />
            </div>
          </div>

          <template v-else>
            <div ref="containerRef" class="masonry">
              <div
                v-for="(column, index) in columns"
                :key="`col-${index}`"
                :ref="(el) => setColumnRef(el, index)"
                class="masonry__col"
              >
                <PostCard
                  v-for="(post, postIndex) in column"
                  :key="post.id"
                  :post="post"
                  :priority="postIndex < 2"
                  @click="(_id, thumb) => openPostPreview(post, thumb)"
                />
              </div>
            </div>

            <StateIndicator v-if="posts.length === 0" variant="empty" />

            <LoadMoreSection
              v-if="posts.length > 0"
              :count="visiblePostsCount"
              :total="total"
              :has-more="hasMore"
              :loading="isLoadingMore"
              :sentinel-ref="setSentinelRef"
              @load-more="loadMore"
            />
          </template>
        </template>
      </div>
    </section>

    <PostPreviewModal
      v-model:isOpen="isPreviewOpen"
      :post-id="previewPostId"
      :initial-post="previewPost"
      :initial-thumbnail-src="previewThumbnailSrc"
      @open-detail="openDetailFromPreview"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import { ref, computed, onMounted, onBeforeUnmount, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  ArrowDown,
  ArrowUpRight,
  Compass,
  Heart,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from 'lucide-vue-next'
import { useAuthStore, useSettingsStore } from '@/stores'
import { postService, type PostListItem, ApiError, type ThumbnailQuality } from '@/api'
import { useCachedPostList } from '@/composables/useCachedPosts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { prefersReducedMotion, throttleRAF } from '@/utils/performance'
import { createResizeObserver, scheduleTask } from '@/utils/modernAPIs'
import { isFilteredAuthor } from '@/config/filters'
import { storePostNavigationContext } from '@/utils/postNavigation'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'
import PostPreviewModal from '@/components/business/PostPreviewModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)
const { t } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())
const bentoRef = ref<HTMLElement | null>(null)

const favoritesLink = computed(() =>
  isAuthenticated.value ? '/favorites' : { path: '/login', query: { redirect: '/favorites' } }
)

// Posts state
const posts = ref<PostListItem[]>([])
const allPosts = ref<PostListItem[]>([])

// Home click → preview modal
const isPreviewOpen = ref(false)
const previewPostId = ref<string | null>(null)
const previewThumbnailSrc = ref<string | null>(null)
const previewPost = ref<PostListItem | null>(null)

// Loading & error state
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

// Pagination state
const page = ref(1)
const pageSize = 20
const initialMasonryCount = typeof window !== 'undefined' && window.innerWidth < 640 ? 6 : 12

// 使用缓存感知的帖子列表加载
const { total, load: loadCachedPosts } = useCachedPostList<PostListItem>(
  async (params) => {
    const result = await postService.listPosts(
      params as Parameters<typeof postService.listPosts>[0]
    )
    return { data: result.items, total: result.total }
  },
  { revalidate: false } // 不自动后台更新，减少重复请求
)

// DOM refs
const containerRef = ref<HTMLElement | null>(null)
const columnRefs = ref<(HTMLElement | null)[]>([])
const sentinelRef = ref<HTMLElement | null>(null)

const hasMore = computed(() => posts.value.length < total.value)

const setColumnRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el) columnRefs.value[index] = el as HTMLElement
}

const setSentinelRef = (el: Element | null) => {
  sentinelRef.value = el as HTMLElement | null
}

const getResponsiveColumnCount = () => {
  if (typeof window === 'undefined') return 3
  const width = window.innerWidth
  if (width < 640) return 2
  if (width < 1024) return 3
  return 4
}

const getResponsiveThumbnailQuality = (): ThumbnailQuality => {
  if (typeof window === 'undefined') return 'medium'
  const width = window.innerWidth
  if (width < 640) return 'medium'
  return 'large'
}

const { columns, columnCount, distributePosts, redistribute, getColumnWidth } = useMasonryColumns({
  initialColumnCount: getResponsiveColumnCount(),
})

const getContainerWidth = () => containerRef.value?.offsetWidth || 1200

let resizeObserver: ResizeObserver | null = null
let lastContainerWidth = 0

const handleContainerResize = throttleRAF((width: number) => {
  if (Math.abs(width - lastContainerWidth) < 50) return
  lastContainerWidth = width
  const newCount = getResponsiveColumnCount()
  if (newCount !== columnCount.value) {
    columnCount.value = newCount
    redistribute(allPosts.value, getColumnWidth(width))
  }
})

const visiblePostsCount = computed(() => columns.value.reduce((sum, col) => sum + col.length, 0))

// 骨架屏列数和每列数量 - 与真实 masonry 布局保持一致，避免 CLS
const skeletonColumnCount = computed(() => columnCount.value)
const skeletonPerColumn = computed(() => Math.ceil(8 / skeletonColumnCount.value))

let masonryTaskId = 0

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

  const params = {
    page: page.value,
    page_size: pageSize,
    sort_by: 'published_at' as const,
    sort_order: 'desc' as const,
    thumbnail_quality: getResponsiveThumbnailQuality(),
  }

  try {
    // 使用缓存感知加载，避免重复请求
    const result = await loadCachedPosts(params)
    const filtered = result.data.filter((p: PostListItem) => !isFilteredAuthor(p.author_name))

    if (reset) {
      posts.value = result.data
      allPosts.value = filtered

      const initialPosts = filtered.slice(0, initialMasonryCount)
      distributePosts(initialPosts, getColumnWidth(getContainerWidth()), false)

      const remaining = filtered.slice(initialMasonryCount)
      if (remaining.length > 0) {
        const taskId = ++masonryTaskId
        void scheduleTask(
          () => {
            if (taskId !== masonryTaskId) return
            distributePosts(remaining, getColumnWidth(getContainerWidth()), true)
          },
          { priority: 'background', delay: 200 }
        )
      }
    } else {
      posts.value.push(...result.data)
      allPosts.value.push(...filtered)
      distributePosts(filtered, getColumnWidth(getContainerWidth()), true)
    }
    return true
  } catch (err) {
    if (posts.value.length === 0) {
      error.value = err instanceof ApiError ? err.message : t('common.error')
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
  if (!ok) page.value = nextPage - 1
  return ok
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px',
  enabled: () => hasMore.value && !isLoading.value && !isLoadingMore.value,
})

function goToExplore() {
  router.push('/explore')
}

function scrollToBento() {
  bentoRef.value?.scrollIntoView({
    behavior: shouldAnimate.value ? 'smooth' : 'auto',
    block: 'start',
  })
}

function openPostPreview(post: PostListItem, thumbnailSrc: string | null) {
  previewPostId.value = post.id
  previewPost.value = post
  previewThumbnailSrc.value = thumbnailSrc
  isPreviewOpen.value = true
}

function openDetailFromPreview(postId: string) {
  storePostNavigationContext(allPosts.value, postId, 'home')
  if (previewThumbnailSrc.value) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, previewThumbnailSrc.value)
  }
  isPreviewOpen.value = false
  router.push(`/post/${postId}`)
}

onMounted(() => {
  if (posts.value.length === 0 && !isLoading.value) fetchLatestPosts()

  if (containerRef.value) {
    lastContainerWidth = containerRef.value.offsetWidth
    resizeObserver = createResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) handleContainerResize(entry.contentRect.width)
    })
    resizeObserver?.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100svh;
  min-height: 100dvh;
}

/* ========== Hero Section ========== */
.hero {
  position: relative;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-12) 0;
}

.hero-content {
  max-width: min(90vw, 45rem);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-4);
  background: rgba(var(--color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--color-primary-rgb), 0.15);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-primary);
  margin-bottom: var(--spacing-6);
  backdrop-filter: blur(8px);
}

.hero-badge__dot {
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
}

.hero--animated .hero-badge__dot {
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.8);
  }
}

.hero-badge svg {
  color: var(--color-accent);
}

.hero-lottie {
  margin: 0 auto var(--spacing-6);
  opacity: 0.85;
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-4);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
  max-width: min(90vw, 34rem);
  margin-inline: auto;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-4);
}

.hero-btn {
  position: relative;
  overflow: hidden;
}

.hero-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.hero-btn:hover::before {
  transform: translateX(100%);
}

.hero--animated .hero-arrow {
  animation: bounce-down 2s ease-in-out infinite;
}

@keyframes bounce-down {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}

/* Hero → Bento 过渡 */
.hero-transition {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(180deg, transparent 0%, rgba(var(--mm-green-rgb), 0.03) 100%);
  pointer-events: none;
}

/* ========== Bento Section ========== */
.bento {
  position: relative;
  padding: var(--spacing-8) 0;
}

@media (min-width: 768px) {
  .bento {
    padding: var(--spacing-12) 0;
  }
}

.bento-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(var(--color-accent-rgb), 0.02) 0%, transparent 100%);
  pointer-events: none;
}

.bento-header {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.bento-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-2);
}

@media (min-width: 768px) {
  .bento-header h2 {
    font-size: var(--text-2xl);
  }
}

.bento-header p {
  color: var(--color-text-secondary);
  max-width: 50ch;
  margin-inline: auto;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(12, 1fr);
    gap: var(--spacing-4);
  }
}

.bento-card {
  position: relative;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.bento-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-1);
}

.bento-card p {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  line-height: var(--leading-relaxed);
}

.bento-card__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-3);
  transition: transform 0.2s ease;
}

.bento-card:hover .bento-card__icon {
  transform: scale(1.1);
}

.bento-card__icon--primary {
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.bento-card__icon--search {
  background: rgba(var(--color-primary-rgb), 0.08);
  color: var(--color-primary);
}

.bento-card__icon--community {
  background: rgba(var(--color-accent-rgb), 0.1);
  color: var(--color-accent);
}

.bento-card__icon--authors {
  background: rgba(var(--color-secondary-rgb), 0.1);
  color: var(--color-secondary);
}

.bento-card__icon--favorites {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
}

.bento-card__arrow {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  color: var(--color-text-tertiary);
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.bento-card:hover .bento-card__arrow {
  transform: translate(2px, -2px);
  color: var(--color-primary);
}

/* Feature card */
.bento-card--feature {
  grid-column: span 2;
  min-height: 10rem;
  padding: var(--spacing-4);
}

@media (min-width: 768px) {
  .bento-card--feature {
    grid-column: span 7;
    grid-row: span 2;
    min-height: 13.75rem;
    padding: var(--spacing-5);
  }
}

.bento-card--feature h3 {
  font-size: var(--text-lg);
}

@media (min-width: 768px) {
  .bento-card--feature h3 {
    font-size: var(--text-2xl);
  }
}

/* Grid layout - 仅桌面端 */
@media (min-width: 768px) {
  .bento-grid > :nth-child(2) {
    grid-column: span 5;
  }
  .bento-grid > :nth-child(3) {
    grid-column: span 5;
  }
  .bento-grid > :nth-child(4) {
    grid-column: span 4;
  }
  .bento-grid > :nth-child(5) {
    grid-column: span 4;
  }
}

/* Bento → Posts 过渡 */
.bento-transition {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100px;
  background: linear-gradient(180deg, transparent 0%, rgba(var(--mm-teal-rgb), 0.02) 100%);
  pointer-events: none;
}

/* ========== Posts Section ========== */
.posts {
  position: relative;
  padding: var(--spacing-6) 0 var(--spacing-8);
}

@media (min-width: 768px) {
  .posts {
    padding: var(--spacing-8) 0 var(--spacing-12);
  }
}

.posts-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(var(--mm-teal-rgb), 0.02) 0%, transparent 100%);
  pointer-events: none;
}

.posts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-4);
}

.posts-header h2 {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
}

@media (min-width: 768px) {
  .posts-header h2 {
    font-size: var(--text-2xl);
  }
}

.masonry {
  display: flex;
  gap: var(--spacing-3);
}

@media (min-width: 1024px) {
  .masonry {
    gap: var(--spacing-4);
  }
}

.masonry__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  min-width: 0;
}

@media (min-width: 1024px) {
  .masonry__col {
    gap: var(--spacing-4);
  }
}

/* ========== Dark Mode ========== */
[data-theme='dark'] .bento-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  .bento-card--feature {
    grid-column: span 12;
    grid-row: span 1;
    min-height: 10rem;
  }
  .bento-grid > :nth-child(2) {
    grid-column: span 6;
  }
  .bento-grid > :nth-child(3) {
    grid-column: span 6;
  }
  .bento-grid > :nth-child(4) {
    grid-column: span 6;
  }
  .bento-grid > :nth-child(5) {
    grid-column: span 6;
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: calc(70svh - var(--navbar-height));
    min-height: calc(70dvh - var(--navbar-height));
    padding: var(--spacing-6) 0;
  }
  .hero-title {
    font-size: clamp(1.75rem, 6vw, 2.5rem);
  }
  .hero-subtitle {
    font-size: var(--text-base);
  }
}

@media (max-width: 480px) {
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
  .hero-actions > * {
    width: 100%;
    justify-content: center;
  }
  .bento-card {
    padding: var(--spacing-3);
  }
  .bento-card__icon {
    width: 36px;
    height: 36px;
  }
  .bento-card h3 {
    font-size: var(--text-sm);
  }
}

/* ========== Reduced Motion ========== */
@media (prefers-reduced-motion: reduce) {
  .hero-badge__dot {
    animation: none !important;
  }
  .hero-arrow {
    animation: none !important;
  }
  .bento-card {
    transition: none;
  }
}
</style>
