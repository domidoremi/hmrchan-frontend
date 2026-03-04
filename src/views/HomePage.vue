<template>
  <div class="home-page">
    <!-- Hero + Bento 占满首屏视口 -->
    <div class="home-fold">
      <!-- Hero Section -->
      <section
        v-if="settings.showHeroSection"
        class="hero"
        :class="{ 'hero--animated': shouldAnimate }"
      >
        <div class="hero-content container">
          <h1 class="hero-title gradient-text">{{ $t('home.hero.title') }}</h1>
          <p class="hero-subtitle">{{ $t('home.hero.subtitle') }}</p>

          <div class="hero-actions">
            <Button size="lg" variant="primary" class="hero-btn" @click="goToExplore">
              <AnimatedIcon name="explore" :fallback-icon="Compass" size="md" />
              {{ $t('nav.explore') }}
            </Button>
          </div>
        </div>
      </section>

      <!-- Bento Grid -->
      <section ref="bentoRef" class="bento">
        <div v-once class="bento-bg" aria-hidden="true" />
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
        <div v-once class="bento-transition" />
      </section>
    </div>
    <!-- /.home-fold -->

    <!-- Latest Posts -->
    <section ref="postsSectionRef" class="posts">
      <div v-once class="posts-bg" aria-hidden="true" />
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
                  v-memo="getPostMemo(post, postIndex < 2)"
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

    <ScrollDownFab />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'HomePage' })

import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  useTemplateRef,
  type ComponentPublicInstance,
} from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ArrowUpRight, Compass, Heart, Layers, MessageSquare, Search, Users } from 'lucide-vue-next'
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
import ScrollDownFab from '@/components/ui/ScrollDownFab.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { isAuthenticated } = storeToRefs(authStore)
const { settings } = storeToRefs(settingsStore)
const { t } = useI18n()

const shouldAnimate = computed(() => settings.value.enableAnimations && !prefersReducedMotion())

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
const postsSectionRef = useTemplateRef<HTMLElement>('postsSectionRef')
const containerRef = useTemplateRef<HTMLElement>('containerRef')
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

onActivated(() => {
  attachResizeObserver()
  setupInitialPostsFetchTriggers()
})

onDeactivated(() => {
  detachResizeObserver()
  clearInitialPostsFetchTriggers()
  handleContainerResize.cancel?.()
})

const getContainerWidth = () => containerRef.value?.offsetWidth || 1200

let resizeObserver: ResizeObserver | null = null
let lastContainerWidth = 0
let postsFetchObserver: IntersectionObserver | null = null
let initialPostsFetchTimer: number | null = null
let hasTriggeredInitialFetch = false
const INITIAL_POSTS_FETCH_DELAY_MS = 2200

const handleContainerResize = throttleRAF((width: number) => {
  if (Math.abs(width - lastContainerWidth) < 50) return
  lastContainerWidth = width
  const newCount = getResponsiveColumnCount()
  if (newCount !== columnCount.value) {
    columnCount.value = newCount
    redistribute(allPosts.value, getColumnWidth(width))
  }
})

function detachResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
}

function clearInitialPostsFetchTriggers() {
  if (postsFetchObserver) {
    postsFetchObserver.disconnect()
    postsFetchObserver = null
  }
  if (initialPostsFetchTimer !== null) {
    clearTimeout(initialPostsFetchTimer)
    initialPostsFetchTimer = null
  }
}

function triggerInitialPostsFetch() {
  if (hasTriggeredInitialFetch || posts.value.length > 0 || isLoading.value) return
  hasTriggeredInitialFetch = true
  clearInitialPostsFetchTriggers()
  void fetchLatestPosts()
}

function setupInitialPostsFetchTriggers() {
  if (hasTriggeredInitialFetch || posts.value.length > 0 || isLoading.value) return
  if (typeof window === 'undefined') {
    triggerInitialPostsFetch()
    return
  }
  const el = postsSectionRef.value
  if (el && 'IntersectionObserver' in window) {
    postsFetchObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          triggerInitialPostsFetch()
        }
      },
      { rootMargin: '600px 0px' }
    )
    postsFetchObserver.observe(el)
  }
  initialPostsFetchTimer = window.setTimeout(() => {
    triggerInitialPostsFetch()
  }, INITIAL_POSTS_FETCH_DELAY_MS)
}

function attachResizeObserver() {
  const el = containerRef.value
  if (!el) return
  detachResizeObserver()
  lastContainerWidth = el.offsetWidth
  resizeObserver = createResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) handleContainerResize(entry.contentRect.width)
  })
  resizeObserver?.observe(el)
}

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

function getPostMemo(post: PostListItem, isPriority: boolean) {
  return [
    post.id,
    post.updated_at ?? post.published_at ?? '',
    post.like_count ?? 0,
    post.comment_count ?? 0,
    post.view_count ?? 0,
    isPriority,
  ]
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
  setupInitialPostsFetchTriggers()
  attachResizeObserver()
})

onBeforeUnmount(() => {
  detachResizeObserver()
  clearInitialPostsFetchTriggers()
  masonryTaskId += 1
  handleContainerResize.cancel?.()
})
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: 100svh;
  min-height: 100dvh;
  --home-section-bg: linear-gradient(
    180deg,
    rgba(var(--mm-teal-rgb), 0.02) 0%,
    rgba(var(--mm-green-rgb), 0.02) 55%,
    transparent 100%
  );
  --home-section-fade: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--mm-green-rgb), 0.02) 100%
  );
}

:global([data-theme='dark'] .home-page) {
  --home-section-bg: linear-gradient(
    180deg,
    rgba(var(--mm-teal-rgb), 0.015) 0%,
    rgba(var(--mm-green-rgb), 0.015) 55%,
    transparent 100%
  );
  --home-section-fade: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--mm-green-rgb), 0.015) 100%
  );
}

/* ========== Global Background ========== */
.home-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--home-section-bg);
  pointer-events: none;
  z-index: 0;
}

/* ========== First-fold wrapper: hero + bento fill viewport ========== */
.home-fold {
  display: flex;
  flex-direction: column;
  min-height: calc(100svh - var(--navbar-height));
  min-height: calc(100dvh - var(--navbar-height));
}

@media (max-width: 768px) {
  .home-fold {
    min-height: calc(100svh - var(--navbar-height) - var(--mobile-nav-height));
    min-height: calc(100dvh - var(--navbar-height) - var(--mobile-nav-height));
  }
}

/* ========== Hero Section ========== */
.hero {
  position: relative;
  display: grid;
  place-items: center;
  text-align: center;
  padding: clamp(2rem, 6dvh, 4rem) 0;
  z-index: 1;
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.75rem, 2dvh, 1.25rem);
  transform: translateY(clamp(2rem, 7.2dvh, 5rem));
}

.hero-title {
  font-size: clamp(2rem, 5vw + 0.5rem, 3.25rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  font-weight: var(--font-bold);
}

.hero-subtitle {
  font-size: clamp(0.95rem, 1.5vw + 0.4rem, 1.25rem);
  color: var(--color-text-secondary);
  max-width: 42ch;
  line-height: 1.5;
}

.hero-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-2);
}

/* ========== Bento Section ========== */
.bento {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(1.5rem, 4dvh, 3rem) 0;
  z-index: 1;
}

.bento-header {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: clamp(1rem, 3vw, 1.5rem);
}

.bento-header h2 {
  font-size: clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem);
  font-weight: var(--font-bold);
}

.bento-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-1);
  max-width: 40ch;
  margin-inline: auto;
}

/* ========== Bento Grid ========== */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(0.5rem, 1.5vw, 1rem);
  max-width: min(90vw, 1200px);
  margin: 0 auto;
}

.bento-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: clamp(0.75rem, 2vw, 1.5rem);
  height: 100%;
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out);
  overflow: hidden;
  contain: layout style;
}

.bento-card:hover {
  transform: translateY(-2px);
}

.bento-card__icon {
  width: clamp(2.25rem, 4vw, 3rem);
  height: clamp(2.25rem, 4vw, 3rem);
  border-radius: var(--radius-lg);
  display: grid;
  place-items: center;
  margin-bottom: var(--spacing-3);
  background: var(--surface-2);
  color: var(--color-text-primary);
}

.bento-card h3 {
  font-size: clamp(0.875rem, 1.2vw + 0.4rem, 1.125rem);
  font-weight: var(--font-bold);
  margin-bottom: 0.125rem;
}

.bento-card p {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.bento-card__arrow {
  position: absolute;
  top: var(--spacing-6);
  right: var(--spacing-6);
  opacity: 0;
  transform: translate(-4px, 4px);
  transition: all var(--duration-300) var(--ease-out);
  color: var(--color-text-tertiary);
}

.bento-card:hover .bento-card__arrow {
  opacity: 1;
  transform: translate(0, 0);
}

/* Icon Variants */
.bento-card__icon--primary {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}
[data-theme='dark'] .bento-card__icon--primary {
  background: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-primary-light);
}

.bento-card__icon--search {
  background: rgba(var(--color-info-rgb), 0.1);
  color: var(--color-info);
}

.bento-card__icon--community {
  background: rgba(168, 85, 247, 0.1); /* Purple */
  color: #a855f7;
}

.bento-card__icon--authors {
  background: rgba(var(--color-warning-rgb), 0.1);
  color: var(--color-warning);
}

.bento-card__icon--favorites {
  background: rgba(var(--color-error-rgb), 0.1);
  color: var(--color-error);
}

/* Bento card background decorations */
.bento-card--feature::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 60% 50% at 90% 10%,
      rgba(var(--color-primary-rgb), 0.08) 0%,
      transparent 70%
    ),
    radial-gradient(ellipse 40% 60% at 10% 90%, rgba(var(--mm-teal-rgb), 0.06) 0%, transparent 70%);
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.bento-grid > :nth-child(2)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 80% at 80% 20%,
    rgba(var(--color-info-rgb), 0.07) 0%,
    transparent 70%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.bento-grid > :nth-child(3)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 80% at 20% 80%,
    rgba(168, 85, 247, 0.07) 0%,
    transparent 70%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.bento-grid > :nth-child(4)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 80% at 80% 80%,
    rgba(var(--color-warning-rgb), 0.07) 0%,
    transparent 70%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

.bento-grid > :nth-child(5)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 80% at 20% 20%,
    rgba(var(--color-error-rgb), 0.07) 0%,
    transparent 70%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
}

[data-theme='dark'] .bento-card--feature::before {
  background:
    radial-gradient(
      ellipse 60% 50% at 90% 10%,
      rgba(var(--color-primary-rgb), 0.12) 0%,
      transparent 70%
    ),
    radial-gradient(ellipse 40% 60% at 10% 90%, rgba(var(--mm-teal-rgb), 0.08) 0%, transparent 70%);
}

[data-theme='dark'] .bento-grid > :nth-child(2)::before {
  background: radial-gradient(
    ellipse 80% 80% at 80% 20%,
    rgba(var(--color-info-rgb), 0.1) 0%,
    transparent 70%
  );
}

[data-theme='dark'] .bento-grid > :nth-child(3)::before {
  background: radial-gradient(
    ellipse 80% 80% at 20% 80%,
    rgba(168, 85, 247, 0.1) 0%,
    transparent 70%
  );
}

[data-theme='dark'] .bento-grid > :nth-child(4)::before {
  background: radial-gradient(
    ellipse 80% 80% at 80% 80%,
    rgba(var(--color-warning-rgb), 0.1) 0%,
    transparent 70%
  );
}

[data-theme='dark'] .bento-grid > :nth-child(5)::before {
  background: radial-gradient(
    ellipse 80% 80% at 20% 20%,
    rgba(var(--color-error-rgb), 0.1) 0%,
    transparent 70%
  );
}

.bento-card > * {
  position: relative;
  z-index: 1;
}

/* Responsive Grid */
.bento-card--feature {
  grid-column: span 2;
}

@media (min-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .bento-card--feature {
    grid-column: span 2;
    grid-row: span 2;
  }

  .bento-grid > :not(:first-child) {
    grid-column: span 2;
  }
}

@media (min-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(12, 1fr);
  }

  .bento-card--feature {
    grid-column: span 6;
    grid-row: span 2;
  }

  .bento-grid > :not(:first-child) {
    grid-column: span 3;
  }
}

/* ... existing bento styles ... */

.bento-transition {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6.25rem;
  background: linear-gradient(to bottom, transparent, var(--color-background));
  pointer-events: none;
  z-index: 0;
  display: none; /* Hide transition as we have unified bg now */
}

/* ========== Posts Section ========== */
.posts {
  position: relative;
  padding: var(--spacing-6) 0 var(--spacing-8);
  z-index: 1;
  content-visibility: auto;
  contain-intrinsic-size: 120rem;
}

@media (min-width: 768px) {
  .posts {
    padding: var(--spacing-8) 0 var(--spacing-12);
  }
}

/* Removed .posts-bg */

.posts-header {
  position: relative;
  z-index: 1;
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
  position: relative;
  z-index: 1;
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

@media (max-width: 480px) {
  .hero-actions {
    width: 100%;
  }
  .hero-actions > * {
    width: 100%;
    justify-content: center;
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
