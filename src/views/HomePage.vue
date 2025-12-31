<template>
  <div class="home-page">
    <!-- Hero Section - 增强版 v2 -->
    <section v-if="settings.showHeroSection" class="hero" :class="{ 'hero--animated': shouldAnimate }">
      <div class="hero-bg">
        <div class="hero-glow hero-glow--primary" />
        <div class="hero-glow hero-glow--accent" />
        <div class="hero-glow hero-glow--secondary" />
        <div class="hero-grid" />
      </div>
      <div class="container hero-content">
        <div class="hero-main">
          <div class="hero-badge animate-slide-up">
            <span class="hero-badge-dot" />
            <Sparkles :size="14" />
            <span>{{ $t('home.hero.badge') }}</span>
          </div>
          <h1 class="hero-title animate-slide-up stagger-1">
            <span class="hero-title-line">{{ $t('home.hero.title') }}</span>
          </h1>
          <p class="hero-subtitle animate-slide-up stagger-2">{{ $t('home.hero.subtitle') }}</p>
          <div class="hero-actions animate-slide-up stagger-3">
            <Button size="lg" variant="primary" class="hero-btn-primary" @click="goToExplore">
              <Compass :size="20" />
              {{ $t('nav.explore') }}
            </Button>
            <Button size="lg" variant="ghost" class="hero-btn-ghost" @click="scrollToBento">
              <ArrowDown :size="20" class="hero-arrow-icon" />
              {{ $t('common.learnMore') }}
            </Button>
          </div>
          <div class="hero-highlights animate-slide-up stagger-4">
            <div v-for="item in heroHighlights" :key="item.titleKey" class="hero-highlight">
              <div class="hero-highlight-icon">
                <component :is="item.icon" :size="18" />
              </div>
              <div class="hero-highlight-text">
                <div class="hero-highlight-title">{{ $t(item.titleKey) }}</div>
                <div class="hero-highlight-desc">{{ $t(item.descKey) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-scroll-hint animate-slide-up stagger-5">
          <div class="scroll-mouse">
            <div class="scroll-wheel" />
          </div>
        </div>
      </div>
    </section>

    <!-- Quick Links (Bento Grid) - 增强版 -->
    <section ref="bentoRef" class="section bento">
      <div class="container">
        <div class="bento-header">
          <h2 class="bento-header-title">{{ $t('home.quickStart.title') }}</h2>
          <p class="bento-header-subtitle">{{ $t('home.quickStart.subtitle') }}</p>
        </div>

        <div class="bento-grid">
          <!-- Feature Card - 大卡片 -->
          <RouterLink
            to="/explore"
            class="bento-card bento-feature glass-card glass-card--interactive glass-card--glow"
          >
            <div class="bento-feature-bg">
              <div class="bento-feature-pattern" />
            </div>
            <div class="bento-card-content">
              <div class="bento-eyebrow">
                <Layers :size="14" />
                <span>{{ $t('nav.explore') }}</span>
              </div>
              <div class="bento-feature-title">{{ $t('home.bento.featureTitle') }}</div>
              <div class="bento-feature-subtitle">{{ $t('home.bento.featureSubtitle') }}</div>
            </div>
            <div class="bento-feature-icon">
              <ArrowUpRight :size="18" />
            </div>
          </RouterLink>

          <!-- Search Card -->
          <RouterLink to="/search" class="bento-card bento-search glass-card glass-card--interactive">
            <div class="bento-card-content">
              <div class="bento-icon-wrapper bento-icon--search">
                <Search :size="22" />
              </div>
              <div class="bento-title">{{ $t('nav.search') }}</div>
              <div class="bento-meta">{{ $t('home.bento.searchMeta') }}</div>
            </div>
            <div class="bento-card-arrow">
              <ChevronRight :size="16" />
            </div>
          </RouterLink>

          <!-- Community Card -->
          <RouterLink to="/community" class="bento-card bento-community glass-card glass-card--interactive">
            <div class="bento-card-content">
              <div class="bento-icon-wrapper bento-icon--community">
                <MessageSquare :size="22" />
              </div>
              <div class="bento-title">{{ $t('nav.community') }}</div>
              <div class="bento-meta">{{ $t('home.bento.communityMeta') }}</div>
            </div>
            <div class="bento-card-arrow">
              <ChevronRight :size="16" />
            </div>
          </RouterLink>

          <!-- Authors Card -->
          <RouterLink to="/authors" class="bento-card bento-authors glass-card glass-card--interactive">
            <div class="bento-card-content">
              <div class="bento-icon-wrapper bento-icon--authors">
                <Users :size="22" />
              </div>
              <div class="bento-title">{{ $t('nav.authors') }}</div>
              <div class="bento-meta">{{ $t('home.bento.authorsMeta') }}</div>
            </div>
            <div class="bento-card-arrow">
              <ChevronRight :size="16" />
            </div>
          </RouterLink>

          <!-- Favorites Card -->
          <RouterLink :to="favoritesLink" class="bento-card bento-favorites glass-card glass-card--interactive">
            <div class="bento-card-content">
              <div class="bento-icon-wrapper bento-icon--favorites">
                <Heart :size="22" />
              </div>
              <div class="bento-title">{{ $t('nav.favorites') }}</div>
              <div class="bento-meta">
                {{ isAuthenticated ? $t('home.bento.favoritesMeta') : $t('home.bento.favoritesMetaGuest') }}
              </div>
            </div>
            <div class="bento-card-arrow">
              <ChevronRight :size="16" />
            </div>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Latest Posts -->
    <section class="section section--posts">
      <div class="container">
        <div class="section-header">
          <div class="section-header-left">
            <h2 class="section-title">{{ $t('home.latest') }}</h2>
            <div class="section-title-line" />
          </div>
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
            <PostCardSkeleton v-for="i in 8" :key="i" />
          </div>

          <template v-else>
            <!-- 多列瀑布流容器 -->
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
import {
  Accessibility,
  ArrowDown,
  ArrowUpRight,
  ChevronRight,
  Compass,
  Globe,
  Heart,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
  Users,
  Zap
} from 'lucide-vue-next'
import { useAuthStore, useSettingsStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import { postCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { prefersReducedMotion } from '@/utils/performance'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'
import PostCardSkeleton from '@/components/business/PostCardSkeleton.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)

const { t } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())

const heroHighlights = [
  {
    icon: Globe,
    titleKey: 'home.hero.highlights.multilingual.title',
    descKey: 'home.hero.highlights.multilingual.desc',
  },
  {
    icon: Accessibility,
    titleKey: 'home.hero.highlights.motion.title',
    descKey: 'home.hero.highlights.motion.desc',
  },
  {
    icon: Zap,
    titleKey: 'home.hero.highlights.performance.title',
    descKey: 'home.hero.highlights.performance.desc',
  },
]

const bentoRef = ref<HTMLElement | null>(null)

const favoritesLink = computed(() => {
  if (isAuthenticated.value) return '/favorites'
  return {
    path: '/login',
    query: { redirect: '/favorites' },
  }
})

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

      // 获取真实 DOM 高度，校准虚拟高度，防止新帖子堆积到单列
      const realHeights = getRealColumnHeights()
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

function scrollToBento() {
  bentoRef.value?.scrollIntoView({ behavior: shouldAnimate.value ? 'smooth' : 'auto', block: 'start' })
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

/* ========== Hero Section - 增强版 ========== */
.hero {
  position: relative;
  display: flex;
  min-height: calc(100vh - var(--navbar-height));
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
  padding: 0;
  overflow: hidden;
  margin-top: var(--navbar-height);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.6;
}

.hero--animated .hero-glow--primary,
.hero--animated .hero-glow--accent {
  animation: hero-glow-pulse 8s ease-in-out infinite alternate;
}

.hero--animated .hero-glow--secondary {
  animation: hero-glow-pulse-center 8s ease-in-out infinite alternate;
}

.hero-glow--primary {
  width: 600px;
  height: 600px;
  top: -200px;
  left: -100px;
  background: radial-gradient(
    circle,
    rgba(var(--color-primary-rgb), 0.3) 0%,
    transparent 70%
  );
}

.hero-glow--accent {
  width: 500px;
  height: 500px;
  bottom: -200px;
  right: -100px;
  background: radial-gradient(
    circle,
    rgba(var(--color-accent-rgb), 0.2) 0%,
    transparent 70%
  );
  animation-delay: 4s;
}

.hero-glow--secondary {
  width: 400px;
  height: 400px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(var(--color-secondary-rgb), 0.12) 0%,
    transparent 60%
  );
  animation-delay: 2s;
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    rgba(var(--color-primary-rgb), 0.03) 1px,
    transparent 1px
  ),
  linear-gradient(
    90deg,
    rgba(var(--color-primary-rgb), 0.03) 1px,
    transparent 1px
  );
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: stretch;
  justify-items: center;
  width: 100%;
  height: 100%;
  padding: var(--spacing-24) 0 var(--spacing-16);
}

.hero-main {
  align-self: center;
  width: 100%;
  max-width: 720px;
}

@keyframes hero-glow-pulse {
  0% {
    transform: scale(1) translate(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(1.1) translate(20px, -20px);
    opacity: 0.7;
  }
}

@keyframes hero-glow-pulse-center {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }

  100% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.7;
  }
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
  -webkit-backdrop-filter: blur(8px);
}

.hero-badge-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
}

.hero--animated .hero-badge-dot {
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.hero-badge svg {
  color: var(--color-accent);
}

.hero--animated .hero-badge svg {
  animation: sparkle 3s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: var(--font-bold);
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-4);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
  max-width: 540px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.hero-btn-primary {
  position: relative;
  overflow: hidden;
}

.hero-btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.hero-btn-primary:hover::before {
  transform: translateX(100%);
}

.hero--animated .hero-arrow-icon {
  animation: bounce-down 2s ease-in-out infinite;
}

@keyframes bounce-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(3px); }
}

.hero-scroll-hint {
  margin-top: var(--spacing-12);
  display: flex;
  justify-content: center;
}

.scroll-mouse {
  width: 24px;
  height: 40px;
  border: 2px solid rgba(var(--color-primary-rgb), 0.3);
  border-radius: 12px;
  position: relative;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.scroll-mouse:hover {
  opacity: 1;
}

.scroll-wheel {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 8px;
  background: var(--color-primary);
  border-radius: 2px;
}

.hero--animated .scroll-wheel {
  animation: scroll-wheel 2s ease-in-out infinite;
}

.hero:not(.hero--animated) .animate-slide-up {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}

/* ========== Hero Highlights ========== */
.hero-highlights {
  margin-top: var(--spacing-8);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--spacing-3);
  width: 100%;
}

.hero-highlight {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.hero-highlight-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  flex-shrink: 0;
}

.hero-highlight-text {
  min-width: 0;
}

.hero-highlight-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.hero-highlight-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--leading-relaxed);
}

@keyframes scroll-wheel {
  0%, 100% { opacity: 1; transform: translateX(-50%) translateY(0); }
  50% { opacity: 0.3; transform: translateX(-50%) translateY(10px); }
}

/* ========== Bento Grid - 增强版 ========== */
.bento.section {
  padding-top: var(--spacing-8);
  padding-bottom: var(--spacing-12);
}

.bento-header {
  margin-bottom: var(--spacing-6);
}

.bento-header-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-2);
}

.bento-header-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 65ch;
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto auto;
  gap: var(--spacing-4);
}

.bento-card {
  position: relative;
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: inherit;
  text-decoration: none;
  min-height: 140px;
}

.bento-card-content {
  position: relative;
  z-index: 1;
}

.bento-card:not(.bento-feature) .bento-card-content {
  padding-right: 40px;
}

.bento-card-arrow {
  position: absolute;
  bottom: var(--spacing-4);
  right: var(--spacing-4);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border-radius: var(--radius-full);
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.bento-card:hover .bento-card-arrow {
  background: var(--color-primary);
  color: var(--color-white);
  transform: translateX(4px);
}

.bento-eyebrow {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-primary);
  margin-bottom: var(--spacing-3);
}

.bento-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-3);
  transition: transform var(--transition-fast);
}

.bento-card:hover .bento-icon-wrapper {
  transform: scale(1.1);
}

.bento-icon--search {
  background: linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.15), rgba(var(--color-primary-rgb), 0.05));
  color: var(--color-primary);
}

.bento-icon--community {
  background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.15), rgba(var(--color-accent-rgb), 0.05));
  color: var(--color-accent);
}

.bento-icon--authors {
  background: linear-gradient(135deg, rgba(var(--color-secondary-rgb), 0.15), rgba(var(--color-secondary-rgb), 0.05));
  color: var(--color-secondary);
}

.bento-icon--favorites {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
  color: #ef4444;
}

.bento-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bento-meta {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  line-height: var(--leading-relaxed);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

/* Feature Card - 特殊样式 */
.bento-feature {
  grid-column: 1 / span 7;
  grid-row: 1 / span 2;
  min-height: 280px;
  padding: var(--spacing-6);
}

.bento-feature-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

.bento-feature-pattern {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(var(--color-accent-rgb), 0.06) 0%, transparent 50%);
}

.bento-feature-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
  margin-bottom: var(--spacing-2);
}

.bento-feature-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 50ch;
  line-height: var(--leading-relaxed);
}

.bento-feature-icon {
  position: absolute;
  top: var(--spacing-5);
  right: var(--spacing-5);
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  color: var(--color-white);
  box-shadow: var(--glass-glow);
  transition: transform var(--transition-fast);
  z-index: 2;
}

.bento-feature:hover .bento-feature-icon {
  transform: scale(1.1);
}

/* Grid Layout */
.bento-search {
  grid-column: 8 / span 5;
}

.bento-community {
  grid-column: 8 / span 5;
}

.bento-authors {
  grid-column: 1 / span 4;
}

.bento-favorites {
  grid-column: 5 / span 4;
}

/* ========== Posts Section ========== */
.section--posts {
  padding-top: var(--spacing-8);
}

.section {
  padding: var(--spacing-12) 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-8);
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: 0;
}

.section-title-line {
  width: 60px;
  height: 4px;
  background: var(--gradient-accent);
  border-radius: var(--radius-full);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-5);
}

/* 多列瀑布流容器 */
.masonry-container {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-5);
  width: 100%;
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  min-width: 0;
}

/* ========== Loading States ========== */
.post-card {
  overflow: hidden;
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

@media (min-width: 1024px) {
  .hero-main {
    max-width: 880px;
  }

  .hero-subtitle {
    font-size: var(--text-2xl);
    max-width: 660px;
  }

  .hero-highlights {
    gap: var(--spacing-4);
  }

  .hero-highlight {
    padding: var(--spacing-5);
  }

  .hero-highlight-icon {
    width: 40px;
    height: 40px;
  }

  .hero-highlight-title {
    font-size: var(--text-base);
  }

  .hero-highlight-desc {
    font-size: var(--text-sm);
  }
}

@media (min-width: 1536px) {
  .hero-main {
    max-width: 1040px;
  }

  .hero-title {
    font-size: clamp(3.25rem, 4.5vw, 5.25rem);
  }
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  .bento-feature {
    grid-column: 1 / -1;
    grid-row: auto;
    min-height: 200px;
  }

  .bento-search {
    grid-column: 1 / span 6;
  }

  .bento-community {
    grid-column: 7 / span 6;
  }

  .bento-authors {
    grid-column: 1 / span 6;
  }

  .bento-favorites {
    grid-column: 7 / span 6;
  }
}

@media (max-width: 768px) {
  .hero {
    text-align: center;
  }

  .hero-content {
    justify-items: center;
    padding: var(--spacing-16) var(--spacing-5) var(--spacing-12);
  }

  .hero-main {
    width: 100%;
  }

  .hero-subtitle {
    text-align: center;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-highlights {
    grid-template-columns: 1fr;
    text-align: left;
  }

  .hero-scroll-hint {
    justify-content: center;
  }

  .hero-glow--primary {
    width: 400px;
    height: 400px;
    top: -150px;
    left: -100px;
  }

  .hero-glow--accent {
    width: 350px;
    height: 350px;
  }

  .bento-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }

  .bento-header-title {
    font-size: var(--text-xl);
  }

  .bento-header-subtitle {
    font-size: var(--text-sm);
  }

  .bento-feature {
    grid-column: 1 / -1;
    min-height: 160px;
    padding: var(--spacing-5);
  }

  .bento-feature-title {
    font-size: var(--text-2xl);
  }

  .bento-feature-subtitle {
    font-size: var(--text-sm);
  }

  .bento-feature-icon {
    width: 36px;
    height: 36px;
  }

  .bento-search,
  .bento-community,
  .bento-authors,
  .bento-favorites {
    grid-column: span 1;
  }

  .bento-card {
    min-height: 120px;
    padding: var(--spacing-4);
  }

  .bento-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .bento-title {
    font-size: var(--text-base);
  }

  .bento-meta {
    font-size: var(--text-xs);
  }

  .masonry-container {
    gap: var(--spacing-3);
  }

  .masonry-column {
    gap: var(--spacing-3);
  }
}

@media (max-width: 480px) {
  .hero-content {
    padding: var(--spacing-12) var(--spacing-4) var(--spacing-10);
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .bento-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-3);
  }

  .bento-feature {
    grid-column: 1 / -1;
    min-height: 140px;
    padding: var(--spacing-4);
  }

  .bento-feature-title {
    font-size: var(--text-xl);
    margin-bottom: var(--spacing-1);
  }

  .bento-feature-subtitle {
    font-size: var(--text-xs);
  }

  .bento-feature-icon {
    width: 32px;
    height: 32px;
  }

  .bento-search,
  .bento-community,
  .bento-authors,
  .bento-favorites {
    grid-column: span 1;
  }

  .bento-card {
    min-height: 112px;
  }

  .bento-card-arrow {
    width: 28px;
    height: 28px;
  }

  .masonry-container {
    gap: var(--spacing-2);
  }

  .masonry-column {
    gap: var(--spacing-2);
  }
}
</style>
