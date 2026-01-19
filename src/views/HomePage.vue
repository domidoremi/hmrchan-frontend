<template>
  <div class="home-page">
    <!-- 全局背景层 - 连续流动 -->
    <div class="home-bg" aria-hidden="true">
      <div class="home-bg__blob home-bg__blob--1" />
      <div class="home-bg__blob home-bg__blob--2" />
      <div class="home-bg__blob home-bg__blob--3" />
    </div>

    <!-- Hero Section -->
    <section
      v-if="settings.showHeroSection"
      class="hero"
      :class="{ 'hero--animated': shouldAnimate }"
    >
      <div class="hero-content container">
        <div class="hero-badge">
          <span class="hero-badge__dot" />
          <Sparkles :size="14" />
          <span>{{ $t('home.hero.badge') }}</span>
        </div>

        <h1 class="hero-title">{{ $t('home.hero.title') }}</h1>
        <p class="hero-subtitle">{{ $t('home.hero.subtitle') }}</p>

        <div class="hero-actions">
          <Button size="lg" variant="primary" class="hero-btn" @click="goToExplore">
            <Compass :size="20" />
            {{ $t('nav.explore') }}
          </Button>
          <Button size="lg" variant="ghost" @click="scrollToBento">
            <ArrowDown :size="20" class="hero-arrow" />
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
              <Layers :size="24" />
            </div>
            <h3>{{ $t('home.bento.featureTitle') }}</h3>
            <p>{{ $t('home.bento.featureSubtitle') }}</p>
            <ArrowUpRight :size="18" class="bento-card__arrow" />
          </RouterLink>

          <RouterLink to="/search" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--search">
              <Search :size="22" />
            </div>
            <h3>{{ $t('nav.search') }}</h3>
            <p>{{ $t('home.bento.searchMeta') }}</p>
          </RouterLink>

          <RouterLink to="/community" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--community">
              <MessageSquare :size="22" />
            </div>
            <h3>{{ $t('nav.community') }}</h3>
            <p>{{ $t('home.bento.communityMeta') }}</p>
          </RouterLink>

          <RouterLink to="/authors" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--authors">
              <Users :size="22" />
            </div>
            <h3>{{ $t('nav.authors') }}</h3>
            <p>{{ $t('home.bento.authorsMeta') }}</p>
          </RouterLink>

          <RouterLink :to="favoritesLink" class="bento-card glass-card">
            <div class="bento-card__icon bento-card__icon--favorites">
              <Heart :size="22" />
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
                  @click="goToPost"
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
import { postCache } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useMasonryColumns } from '@/composables/useMasonryColumns'
import { prefersReducedMotion } from '@/utils/performance'
import { createResizeObserver } from '@/utils/modernAPIs'
import { isFilteredAuthor } from '@/config/filters'
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
const bentoRef = ref<HTMLElement | null>(null)

const favoritesLink = computed(() =>
  isAuthenticated.value ? '/favorites' : { path: '/login', query: { redirect: '/favorites' } }
)

// Posts state
const posts = ref<PostListItem[]>([])
const allPosts = ref<PostListItem[]>([])

// Loading & error state
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

// Pagination state
const page = ref(1)
const total = ref(0)
const pageSize = 20

// DOM refs
const containerRef = ref<HTMLElement | null>(null)
const columnRefs = ref<(HTMLElement | null)[]>([])
const sentinelRef = ref<HTMLElement | null>(null)

const hasMore = computed(() => posts.value.length < total.value)

const setColumnRef = (el: Element | ComponentPublicInstance | null, index: number) => {
  if (el) columnRefs.value[index] = el as HTMLElement
}

const getRealColumnHeights = (): number[] => columnRefs.value.map((el) => el?.offsetHeight ?? 0)

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

const handleContainerResize = (width: number) => {
  if (Math.abs(width - lastContainerWidth) < 50) return
  lastContainerWidth = width
  const newCount = getResponsiveColumnCount()
  if (newCount !== columnCount.value) {
    columnCount.value = newCount
    redistribute(allPosts.value, getColumnWidth(width))
  }
}

const visiblePostsCount = computed(() => columns.value.reduce((sum, col) => sum + col.length, 0))

// 骨架屏列数和每列数量 - 与真实 masonry 布局保持一致，避免 CLS
const skeletonColumnCount = computed(() => columnCount.value)
const skeletonPerColumn = computed(() => Math.ceil(8 / skeletonColumnCount.value))

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

  if (reset) {
    const cached = await postCache.getList(params)
    if (cached && !hadData) {
      posts.value = cached.data as PostListItem[]
      total.value = cached.total
      const filtered = (cached.data as PostListItem[]).filter(
        (p) => !isFilteredAuthor(p.author_name)
      )
      allPosts.value = filtered
      distributePosts(filtered, getColumnWidth(getContainerWidth()), false)
    }
  }

  try {
    const res = await postService.listPosts(params)
    const filtered = res.items.filter((p: PostListItem) => !isFilteredAuthor(p.author_name))

    if (reset) {
      posts.value = res.items
      allPosts.value = filtered
      distributePosts(filtered, getColumnWidth(getContainerWidth()), false)
    } else {
      posts.value.push(...res.items)
      allPosts.value.push(...filtered)
      distributePosts(filtered, getColumnWidth(getContainerWidth()), true, getRealColumnHeights())
    }
    total.value = res.total

    if (reset) await postCache.setList(params, res.items, res.total)
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

function goToPost(postId: string, thumbnailSrc: string | null) {
  if (thumbnailSrc) sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
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
  min-height: 100vh;
}

/* ========== 全局背景层 ========== */
.home-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.home-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.4;
  will-change: transform;
}

.home-bg__blob--1 {
  width: 600px;
  height: 600px;
  top: -15%;
  left: -10%;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.5) 0%, transparent 70%);
}

.home-bg__blob--2 {
  width: 500px;
  height: 500px;
  top: 40%;
  right: -15%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%);
}

.home-bg__blob--3 {
  width: 450px;
  height: 450px;
  bottom: 10%;
  left: 20%;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, transparent 70%);
}

.hero--animated .home-bg__blob--1 {
  animation: blob-float-1 20s ease-in-out infinite;
}

.hero--animated .home-bg__blob--2 {
  animation: blob-float-2 25s ease-in-out infinite;
}

.hero--animated .home-bg__blob--3 {
  animation: blob-float-3 22s ease-in-out infinite;
}

@keyframes blob-float-1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, 20px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 10px) scale(0.95);
  }
}

@keyframes blob-float-2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-40px, 30px) scale(1.08);
  }
}

@keyframes blob-float-3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(25px, -15px) scale(0.92);
  }
  80% {
    transform: translate(-15px, 25px) scale(1.03);
  }
}

/* ========== Hero Section ========== */
.hero {
  position: relative;
  min-height: calc(100vh - var(--navbar-height));
  min-height: calc(100svh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-12) 0;
}

.hero-content {
  max-width: 720px;
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
  background: linear-gradient(
    180deg,
    rgba(var(--mm-green-rgb), 0.02) 0%,
    transparent 50%,
    rgba(var(--mm-purple-rgb), 0.02) 100%
  );
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
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.15),
    rgba(var(--color-primary-rgb), 0.05)
  );
  color: var(--color-primary);
}

.bento-card__icon--search {
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.15),
    rgba(var(--color-primary-rgb), 0.05)
  );
  color: var(--color-primary);
}

.bento-card__icon--community {
  background: linear-gradient(
    135deg,
    rgba(var(--color-accent-rgb), 0.15),
    rgba(var(--color-accent-rgb), 0.05)
  );
  color: var(--color-accent);
}

.bento-card__icon--authors {
  background: linear-gradient(
    135deg,
    rgba(var(--color-secondary-rgb), 0.15),
    rgba(var(--color-secondary-rgb), 0.05)
  );
  color: var(--color-secondary);
}

.bento-card__icon--favorites {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
  color: #ef4444;
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
  min-height: 160px;
  padding: var(--spacing-4);
}

@media (min-width: 768px) {
  .bento-card--feature {
    grid-column: span 7;
    grid-row: span 2;
    min-height: 220px;
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
[data-theme='dark'] .home-bg__blob {
  opacity: 0.2;
}

[data-theme='dark'] .bento-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

/* ========== Responsive ========== */
@media (max-width: 1024px) {
  .bento-card--feature {
    grid-column: span 12;
    grid-row: span 1;
    min-height: 160px;
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
    min-height: calc(70vh - var(--navbar-height));
    padding: var(--spacing-6) 0;
  }
  .hero-title {
    font-size: clamp(1.75rem, 6vw, 2.5rem);
  }
  .hero-subtitle {
    font-size: var(--text-base);
  }

  .home-bg__blob {
    filter: blur(80px);
  }
  .home-bg__blob--1 {
    width: 350px;
    height: 350px;
  }
  .home-bg__blob--2 {
    width: 300px;
    height: 300px;
  }
  .home-bg__blob--3 {
    width: 280px;
    height: 280px;
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
  .home-bg__blob {
    animation: none !important;
  }
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
