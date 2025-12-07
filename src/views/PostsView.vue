<template>
  <MainLayout :disable-container="true" :enable-back-to-top="false">
    <div
      class="posts-page reduce-motion"
      :class="{ 'mobile-preview-open': previewVisible && !isDesktop }"
    >
      <section ref="heroRef" class="posts-hero">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-badge">
            <ImageIcon :size="20" />
            <span>{{ $t('nav.posts') }}</span>
          </div>
          <h1 class="hero-title">{{ $t('post.title') }}</h1>
          <p class="hero-subtitle">{{ $t('posts.subtitle') }}</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="stat-value">{{ formatNumber(posts.length) }}</span>
              <span class="stat-label">{{ $t('posts.totalPosts') }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="hero-stat">
              <span class="stat-value">
                {{ selectedPlatform === 'all' ? filterPlatforms.length - 1 : 1 }}
              </span>
              <span class="stat-label">{{ $t('posts.platforms') }}</span>
            </div>
          </div>
        </div>
      </section>

      <section ref="filterRef" class="posts-toolbar" :class="{ 'is-sticky': isFilterSticky }">
        <div class="toolbar-surface">
          <div class="search-block">
            <div class="search-field" :class="{ 'is-focused': isSearchFocused }">
              <Search :size="18" class="search-icon" />
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="$t('search.placeholder')"
                @input="onSearchInput"
                @focus="isSearchFocused = true"
                @blur="isSearchFocused = false"
              />
              <Transition name="fade-scale">
                <button v-if="searchQuery" class="clear-btn" type="button" @click="clearSearch">
                  <X :size="16" />
                </button>
              </Transition>
            </div>
          </div>

          <div class="platform-chips-wrapper">
            <div class="platform-chips" ref="platformChipsRef">
              <button
                v-for="platform in filterPlatforms"
                :key="platform.value"
                :class="['chip', { active: selectedPlatform === platform.value }]"
                type="button"
                @click="selectPlatform(platform.value)"
                :aria-label="`${t('filter.filterBy')} ${platform.label}`"
              >
                <span class="chip-icon">
                  <component :is="platform.icon" :size="18" />
                </span>
                <span class="chip-label">{{ platform.label }}</span>
                <Transition name="scale-in">
                  <span v-if="selectedPlatform === platform.value" class="chip-check">
                    <Check :size="14" />
                  </span>
                </Transition>
              </button>
            </div>
            <div v-if="showLeftScroll" class="chips-indicator left"></div>
            <div v-if="showRightScroll" class="chips-indicator right"></div>
          </div>

          <div class="toolbar-controls">
            <div class="sort-control">
              <SlidersHorizontal :size="16" class="control-icon" />
              <select v-model="sortBy" class="sort-select">
                <option value="latest">{{ $t('filter.latest') }}</option>
                <option value="popular">{{ $t('filter.popular') }}</option>
                <option value="oldest">{{ $t('filter.oldest') }}</option>
              </select>
              <ChevronDown :size="16" class="dropdown-arrow" />
            </div>

            <div class="view-toggle">
              <button
                :class="['view-button', { active: viewMode === 'grid' }]"
                type="button"
                @click="viewMode = 'grid'"
                aria-label="Grid view"
              >
                <Grid3x3 :size="18" />
              </button>
              <button
                :class="['view-button', { active: viewMode === 'list' }]"
                type="button"
                @click="viewMode = 'list'"
                aria-label="List view"
              >
                <List :size="18" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="posts-layout">
        <section class="feed-column">
          <p v-if="lastListFromFallback" class="offline-hint">
            {{ $t('offline.usingCache') }}
          </p>

          <div v-if="loading && posts.length === 0" class="skeleton-grid">
            <div v-for="i in 8" :key="i" class="skeleton-card">
              <div class="skeleton-image"></div>
              <div class="skeleton-lines">
                <div class="line"></div>
                <div class="line short"></div>
              </div>
            </div>
          </div>

          <div
            v-else-if="posts.length > 0"
            ref="postsGridRef"
            :class="['posts-grid', viewMode === 'list' ? 'is-list' : 'is-grid']"
          >
            <PostCard
              v-for="(post, index) in posts"
              :key="post.id"
              :post="post"
              :is-first-screen="index < 6"
              :preview-enabled="true"
              :show-actions="false"
              @open="openPreview"
            />
          </div>

          <EmptyState
            v-else-if="!loading"
            icon="image"
            :title="$t('search.noResults')"
            :description="$t('search.noResultsDesc')"
          />

          <Transition name="fade">
            <div v-if="isLoadingMore" class="loading-more">
              <div class="spinner spinner-md"></div>
              <span>{{ $t('common.loading') }}</span>
            </div>
          </Transition>

          <Transition name="fade">
            <div v-if="!hasMore && posts.length > 0" class="end-of-feed">
              <div class="end-icon">
                <CheckCircle2 :size="24" />
              </div>
              <span>{{ $t('common.noMore') }}</span>
            </div>
          </Transition>
        </section>

        <aside v-if="isDesktop" class="preview-column">
          <Transition name="preview-fade" mode="out-in">
            <PostPreviewPanel
              v-if="previewVisible"
              :key="previewPost?.id || 'preview-panel'"
              :post="previewPost"
              :loading="previewLoading"
              :error="previewError"
              @close="closePreview"
            />
            <div v-else class="preview-placeholder" key="preview-empty">
              <p>{{ $t('post.media') }}</p>
              <span>{{ $t('common.select') }}</span>
            </div>
          </Transition>
        </aside>
      </div>

      <Teleport to="body">
        <Transition name="preview-overlay">
          <div v-if="previewVisible && !isDesktop" class="preview-overlay">
            <div class="overlay-backdrop" @click="closePreview"></div>
            <div class="overlay-panel">
              <PostPreviewPanel
                :post="previewPost"
                :loading="previewLoading"
                :error="previewError"
                @close="closePreview"
              />
            </div>
          </div>
        </Transition>
      </Teleport>

      <Transition name="fab">
        <button
          v-show="showScrollTop"
          class="scroll-top"
          type="button"
          @click="scrollToTop"
          :aria-label="$t('common.backToTop')"
        >
          <ArrowUp :size="24" />
          <div class="fab-ripple"></div>
        </button>
      </Transition>

      <Transition name="slide-up">
        <div v-if="hasActiveFilters" class="active-filters">
          <div class="active-filters-content">
            <span>{{ activeFiltersText }}</span>
            <button class="clear-filters-btn" type="button" @click="clearAllFilters">
              <X :size="16" />
              {{ $t('filter.clearAll') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Search,
  X,
  ArrowUp,
  ImageIcon,
  Youtube,
  Twitter,
  Instagram,
  Music2,
  SlidersHorizontal,
  ChevronDown,
  Grid3x3,
  List,
  Check,
  CheckCircle2,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import PostCard from '@/components/business/PostCard.vue'
import EmptyState from '@/components/ui/empty/EmptyState.vue'
import PostPreviewPanel from '@/components/business/PostPreviewPanel.vue'

import { usePostsStore, useSettingsStore } from '@/stores'
import { useInfiniteScroll, useDebounceFn } from '@/composables'
import { useWaterfallLayout } from '@/composables'
import type { PostDetail } from '@/types'
import { withLogging } from '@/utils/error'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()
const postsStore = usePostsStore()
const settingsStore = useSettingsStore()
const { posts, loading, lastListFromFallback } = storeToRefs(postsStore)
const { settings } = storeToRefs(settingsStore)

// Refs
const heroRef = ref<HTMLElement | null>(null)
const filterRef = ref<HTMLElement | null>(null)
const postsGridRef = ref<HTMLElement | null>(null)
const platformChipsRef = ref<HTMLElement | null>(null)

// Preview & responsive state
const previewVisible = ref(false)
const previewPost = ref<PostDetail | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const isDesktop = ref(true)

// State (使用sessionStorage持久化关键状态)
const searchQuery = ref(sessionStorage.getItem('postsView_searchQuery') || '')
const selectedPlatform = ref<string>(sessionStorage.getItem('postsView_platform') || 'all')
const sortBy = ref(sessionStorage.getItem('postsView_sortBy') || 'latest')
const viewMode = ref<'grid' | 'list'>('grid')
const showScrollTop = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const isSearchFocused = ref(false)
const isFilterSticky = ref(false)
const showLeftScroll = ref(false)
const showRightScroll = ref(false)

// 瀑布流布局（仅网格模式使用）
const { updateLayout: updateWaterfallLayout, destroy: destroyWaterfallLayout } = useWaterfallLayout(
  postsGridRef as unknown as Ref<HTMLElement | null>,
  {
    columnGap: 24,
    rowGap: 24,
    breakpoints: {
      1600: 4,
      1360: 3,
      1024: 3,
      768: 2,
      0: 1,
    },
  },
)

// Computed
const filterPlatforms = computed(() => [
  { value: 'all', label: t('platform.all'), icon: ImageIcon },
  { value: 'youtube', label: t('platform.youtube'), icon: Youtube },
  { value: 'twitter', label: t('platform.twitter'), icon: Twitter },
  { value: 'instagram', label: t('platform.instagram'), icon: Instagram },
  { value: 'tiktok', label: t('platform.tiktok'), icon: Music2 },
])

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || selectedPlatform.value !== 'all' || sortBy.value !== 'latest'
})

const activeFiltersText = computed(() => {
  const filters: string[] = []
  if (searchQuery.value) filters.push(`"${searchQuery.value}"`)
  if (selectedPlatform.value !== 'all') {
    const platform = filterPlatforms.value.find((p) => p.value === selectedPlatform.value)
    if (platform) filters.push(platform.label)
  }
  if (sortBy.value !== 'latest') filters.push(t(`filter.${sortBy.value}`))
  return filters.length > 0 ? `${t('filter.active')}: ${filters.join(', ')}` : ''
})

// Utility Methods
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: num >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(num)
}

const { debounced: debouncedSearch } = useDebounceFn(() => {
  currentPage.value = 1
  loadPosts()
}, 300)

const checkScrollIndicators = () => {
  const el = platformChipsRef.value
  if (!el) return

  showLeftScroll.value = el.scrollLeft > 10
  showRightScroll.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 10
}

// Methods
const selectPlatform = (platform: string) => {
  if (selectedPlatform.value === platform) return
  selectedPlatform.value = platform
  currentPage.value = 1

  // Haptic feedback animation
  gsap.to('.chip.active', {
    scale: 0.95,
    duration: 0.1,
    yoyo: true,
    repeat: 1,
    ease: 'power2.inOut',
  })

  loadPosts()
}

const onSearchInput = () => {
  debouncedSearch()
}

const clearSearch = () => {
  searchQuery.value = ''
  sessionStorage.removeItem('postsView_searchQuery')
  currentPage.value = 1
  loadPosts()
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedPlatform.value = 'all'
  sortBy.value = 'latest'
  currentPage.value = 1
  // 清除sessionStorage
  sessionStorage.removeItem('postsView_searchQuery')
  sessionStorage.removeItem('postsView_platform')
  sessionStorage.removeItem('postsView_sortBy')
  loadPosts()
}

const loadPosts = async () => {
  try {
    const response = await withLogging(
      () =>
        postsStore.fetchPosts({
          page: currentPage.value,
          platform: selectedPlatform.value === 'all' ? undefined : selectedPlatform.value,
          sort_by:
            sortBy.value === 'latest'
              ? 'published_at'
              : sortBy.value === 'popular'
                ? 'view_count'
                : 'published_at',
          sort_order: sortBy.value === 'oldest' ? 'asc' : 'desc',
          ignoreFilters: true, // 重要：不要污染全局filters状态
        }),
      'PostsView:LoadPosts',
    )

    // 根据pagination设置hasMore
    if (response && response.page && response.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }

    await nextTick()
    if (viewMode.value === 'grid' && postsGridRef.value) {
      updateWaterfallLayout()
    }
  } catch {
    hasMore.value = false
  }
}

const ensurePreviewForDesktop = () => {
  if (!isDesktop.value) {
    return
  }
  if (previewVisible.value && previewPost.value) {
    return
  }
  const firstPost = posts.value && posts.value.length > 0 ? posts.value[0] : null
  if (firstPost) {
    openPreview(firstPost.id)
  }
}

const scrollToTop = () => {
  gsap.to(window, {
    scrollTo: { y: 0 },
    duration: 0.8,
    ease: 'power3.inOut',
  })
}

// Infinite scroll
const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value) return

  currentPage.value++
  try {
    const response = await withLogging(
      () =>
        postsStore.fetchPosts({
          page: currentPage.value,
          platform: selectedPlatform.value === 'all' ? undefined : selectedPlatform.value,
          sort_by:
            sortBy.value === 'latest'
              ? 'published_at'
              : sortBy.value === 'popular'
                ? 'view_count'
                : 'published_at',
          sort_order: sortBy.value === 'oldest' ? 'asc' : 'desc',
          append: true, // 追加模式
          ignoreFilters: true, // 重要：不要污染全局filters状态
        }),
      'PostsView:LoadMore',
    )

    // 更新hasMore状态
    if (response && response.page && response.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }

    await nextTick()
    if (viewMode.value === 'grid' && postsGridRef.value) {
      updateWaterfallLayout()
    }
  } catch {
    hasMore.value = false
  }
}

const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: loadMore,
  hasMore: () => hasMore.value,
  threshold: 300,
})

// Preview handlers
const openPreview = async (postId: string) => {
  previewVisible.value = true

  // 如果已经在预览同一条，直接返回，避免重复工作
  if (previewPost.value?.id === postId) {
    return
  }

  previewLoading.value = true
  previewError.value = null

  try {
    // 1) 优先复用当前 Store 中的详情
    const cachedDetail = postsStore.currentPost
    if (cachedDetail && cachedDetail.id === postId) {
      previewPost.value = cachedDetail
      previewLoading.value = false
      return
    }

    // 2) 从列表中做浅缓存，先展示基础信息
    const listItem = posts.value.find((p) => p.id === postId)
    if (listItem) {
      previewPost.value = {
        ...listItem,
        media_files: [],
        tags: [],
      } as PostDetail
      // 保持 previewLoading 为 true，这样媒体区域仍显示 loading
    }

    // 3) 拉取完整详情（命中 requestCache 时不会重复向后端请求）
    const detail = await withLogging(() => postsStore.fetchPost(postId), 'PostsView:FetchPreview')
    previewPost.value = detail
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : t('error.unknown')
  } finally {
    previewLoading.value = false
  }
}

const closePreview = () => {
  previewVisible.value = false
}

const handleBreakpointChange = () => {
  isDesktop.value = window.innerWidth >= 1024
  if (isDesktop.value) {
    document.body.classList.remove('no-scroll')
    ensurePreviewForDesktop()
  } else if (previewVisible.value) {
    document.body.classList.add('no-scroll')
  }
}

watch(previewVisible, (visible) => {
  if (!isDesktop.value) {
    document.body.classList.toggle('no-scroll', visible)
  }
})

// Lifecycle
onMounted(async () => {
  await loadPosts()
  await nextTick()

  // GSAP entrance animations
  if (settings.value.enableAnimations) {
    gsap.from('.header-badge', {
      y: -20,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    })

    gsap.from('.page-title', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      delay: 0.2,
      ease: 'power3.out',
    })

    gsap.from('.page-subtitle', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      delay: 0.4,
      ease: 'power3.out',
    })

    gsap.from('.stats-row', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      delay: 0.6,
      ease: 'power3.out',
    })
  }

  // Check scroll indicators
  if (platformChipsRef.value) {
    checkScrollIndicators()
    platformChipsRef.value.addEventListener('scroll', checkScrollIndicators)
  }

  // GSAP ScrollTrigger for filter bar sticky effect
  if (filterRef.value) {
    ScrollTrigger.create({
      trigger: heroRef.value,
      start: 'bottom top',
      end: 'bottom top',
      onEnter: () => (isFilterSticky.value = true),
      onLeaveBack: () => (isFilterSticky.value = false),
    })
  }

  // Animate post cards on scroll
  if (settings.value.enableAnimations && postsGridRef.value) {
    gsap.from('.post-card', {
      scrollTrigger: {
        trigger: postsGridRef.value,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      },
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'power3.out',
    })
  }

  // Scroll event for FAB button
  const handleScroll = () => {
    showScrollTop.value = window.scrollY > 600

    // Update filter bar shadow
    if (filterRef.value) {
      const scrolled = window.scrollY > 100
      if (scrolled !== isFilterSticky.value) {
        isFilterSticky.value = scrolled
      }
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', handleBreakpointChange, { passive: true })
  handleBreakpointChange()
  ensurePreviewForDesktop()

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', handleBreakpointChange)
    if (platformChipsRef.value) {
      platformChipsRef.value.removeEventListener('scroll', checkScrollIndicators)
    }
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
    destroyWaterfallLayout()
  })
})

// Watch sort changes
watch(sortBy, (newValue) => {
  // 保存到sessionStorage确保页面导航后保持
  sessionStorage.setItem('postsView_sortBy', newValue)
  currentPage.value = 1
  loadPosts()
})

// Watch platform changes
watch(selectedPlatform, (newValue) => {
  sessionStorage.setItem('postsView_platform', newValue)
})

// Watch search query changes
watch(searchQuery, (newValue) => {
  sessionStorage.setItem('postsView_searchQuery', newValue)
})

// Watch view mode
watch(viewMode, async (mode) => {
  await nextTick()

  if (mode === 'grid') {
    updateWaterfallLayout()
  } else {
    destroyWaterfallLayout()
  }

  if (settings.value.enableAnimations) {
    gsap.from('.post-card', {
      y: 20,
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
      ease: 'power2.out',
    })
  }
})

// 当posts变化时刷新瀑布流
watch(
  () => posts.value.length,
  async () => {
    await nextTick()
    if (viewMode.value === 'grid') {
      updateWaterfallLayout()
    }
    ensurePreviewForDesktop()
  },
)
</script>

<style scoped>
.posts-page {
  width: min(1400px, 100%);
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) clamp(16px, 5vw, 48px);
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 4vw, 40px);
  transition: padding 0.3s ease;
}

.posts-page.mobile-preview-open {
  overflow: hidden;
}

.posts-hero {
  position: relative;
  border-radius: clamp(24px, 3vw, 36px);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: clamp(32px, 5vw, 64px);
  overflow: hidden;
  box-shadow:
    0 24px 60px -32px rgba(76, 29, 149, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(96, 165, 250, 0.18), transparent 55%),
    radial-gradient(circle at 80% 0%, rgba(236, 72, 153, 0.18), transparent 60%);
  opacity: 0.75;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.5vw, 28px);
  color: var(--color-text-primary);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  font-size: 0.875rem;
  font-weight: 600;
  width: fit-content;
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: clamp(1rem, 2.4vw, 1.3rem);
  line-height: 1.65;
  max-width: min(680px, 100%);
  color: var(--color-text-secondary);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(16px, 3vw, 28px);
  align-items: center;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  font-weight: 700;
  color: var(--color-primary);
}

.offline-hint {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.stat-label {
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-tertiary);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--glass-border);
}

.posts-toolbar {
  position: sticky;
  top: calc(var(--app-navbar-height, 78px) + 12px);
  z-index: 80;
}

.posts-toolbar.is-sticky .toolbar-surface {
  box-shadow: 0 24px 48px -28px rgba(15, 23, 42, 0.35);
  border-color: rgba(148, 163, 184, 0.24);
}

.toolbar-surface {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  padding: clamp(16px, 2vw, 24px);
  border-radius: clamp(20px, 2.5vw, 28px);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(14px);
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

[data-theme='dark'] .toolbar-surface {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(148, 163, 184, 0.18);
}

.search-block {
  flex: 1 1 280px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.search-field.is-focused {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
}

.search-field input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.95rem;
  color: var(--color-text-primary);
  outline: none;
}

.search-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.12);
  color: var(--color-primary);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.clear-btn:hover {
  transform: translateY(-1px);
  background: rgba(139, 92, 246, 0.18);
}

.platform-chips-wrapper {
  position: relative;
  flex: 1 1 100%;
  order: 3;
}

.platform-chips {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.platform-chips::-webkit-scrollbar {
  display: none;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.chip.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(192, 132, 252, 0.15));
  border-color: rgba(139, 92, 246, 0.6);
  color: var(--color-primary);
  box-shadow: 0 8px 22px -12px rgba(139, 92, 246, 0.45);
}

.chip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.chip-check {
  display: inline-flex;
}

.chips-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(15, 23, 42, 0.18), transparent);
}

.chips-indicator.right {
  right: 0;
  transform: rotate(180deg);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.sort-control {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 14px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.sort-select {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding-right: 22px;
  cursor: pointer;
}

.dropdown-arrow {
  position: absolute;
  right: 14px;
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.view-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 999px;
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
}

.view-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-button.active {
  background: var(--color-primary);
  color: #fff;
  box-shadow: 0 12px 24px -14px rgba(139, 92, 246, 0.5);
}

.posts-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: clamp(24px, 4vw, 40px);
  align-items: flex-start;
}

.feed-column {
  display: flex;
  flex-direction: column;
  gap: clamp(20px, 3vw, 32px);
}

.posts-grid {
  position: relative;
  min-height: 200px;
}

.posts-grid.is-grid {
  padding-bottom: clamp(16px, 2.5vw, 32px);
}

.posts-grid.is-list {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2vw, 24px);
}

.posts-grid.is-list :deep(.post-card) {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  width: 100% !important;
  display: flex;
  gap: clamp(16px, 2vw, 24px);
}

.posts-grid.is-list :deep(.card-media) {
  width: clamp(220px, 28%, 280px);
  flex-shrink: 0;
}

.posts-grid.is-list :deep(.card-content) {
  flex: 1;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: clamp(18px, 2.8vw, 28px);
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(16px, 2.4vw, 24px);
  border-radius: clamp(18px, 2.4vw, 24px);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  box-shadow: 0 16px 40px -32px rgba(15, 23, 42, 0.2);
}

.skeleton-image,
.line {
  background: linear-gradient(
    120deg,
    rgba(148, 163, 184, 0.16),
    rgba(226, 232, 240, 0.3),
    rgba(148, 163, 184, 0.16)
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

.skeleton-image {
  width: 100%;
  height: clamp(160px, 18vw, 220px);
  border-radius: clamp(14px, 2vw, 18px);
}

.line {
  height: 14px;
  border-radius: 999px;
}

.line.short {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

/* Spinner styles moved to base.css and utilities.css - use .spinner.spinner-md */

.loading-more,
.end-of-feed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px;
  color: var(--color-text-tertiary);
}

.end-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.12);
  color: var(--color-primary);
}

.preview-column {
  position: sticky;
  top: calc(var(--app-navbar-height, 78px) + 24px);
  display: flex;
  align-items: stretch;
}

.preview-column > * {
  width: 100%;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 420px;
  border-radius: clamp(20px, 2.5vw, 28px);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--color-text-tertiary);
}

.preview-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 120;
}

.overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
}

.overlay-panel {
  position: relative;
  width: min(720px, 100%);
  margin: 0 auto;
  padding: clamp(12px, 3vw, 24px);
}

.scroll-top {
  position: fixed;
  bottom: clamp(16px, 4vw, 32px);
  right: clamp(16px, 4vw, 32px);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(192, 132, 252, 0.95));
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 20px 40px -20px rgba(139, 92, 246, 0.6),
    0 8px 16px -10px rgba(79, 70, 229, 0.35);
  overflow: hidden;
  transition: transform 0.3s ease;
  z-index: 110;
}

.scroll-top:hover {
  transform: translateY(-4px);
}

.fab-ripple {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.scroll-top:hover .fab-ripple {
  opacity: 1;
}

.active-filters {
  position: fixed;
  bottom: clamp(16px, 5vw, 32px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 105;
}

.active-filters-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.85);
  color: #fff;
  box-shadow: 0 20px 40px -28px rgba(15, 23, 42, 0.45);
}

.clear-filters-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: inherit;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.preview-overlay-enter-active,
.preview-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.preview-overlay-enter-from,
.preview-overlay-leave-to {
  opacity: 0;
}

.fab-enter-active,
.fab-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fab-enter-from,
.fab-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

/* Responsive tweaks */
@media (max-width: 1280px) {
  .posts-layout {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  }
}

@media (max-width: 1023px) {
  .posts-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-column {
    display: none;
  }

  .toolbar-surface {
    gap: 12px;
  }

  .platform-chips-wrapper {
    order: 2;
    flex: 1 1 100%;
  }

  .toolbar-controls {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 767px) {
  .posts-page {
    padding: clamp(16px, 4vw, 24px);
    gap: 24px;
  }

  .posts-hero {
    padding: clamp(24px, 6vw, 32px);
  }

  .hero-stats {
    gap: 16px;
  }

  .posts-toolbar {
    top: calc(var(--app-navbar-height, 64px) + 8px);
  }

  .toolbar-controls {
    justify-content: stretch;
  }

  .toolbar-controls > * {
    flex: 1 1 100%;
  }

  .platform-chips {
    padding-inline: 2px;
  }

  .chip {
    padding: 8px 14px;
  }

  .posts-grid.is-list :deep(.post-card) {
    flex-direction: column;
  }

  .posts-grid.is-list :deep(.card-media) {
    width: 100%;
  }

  .overlay-panel {
    width: 100%;
  }

  .scroll-top {
    bottom: clamp(12px, 6vw, 20px);
    right: clamp(12px, 6vw, 20px);
    width: 48px;
    height: 48px;
  }
}

[data-theme='dark'] .hero-badge {
  background: rgba(63, 63, 70, 0.5);
  border-color: rgba(63, 63, 70, 0.65);
}

[data-theme='dark'] .hero-subtitle {
  color: rgba(226, 232, 240, 0.78);
}

[data-theme='dark'] .posts-toolbar.is-sticky .toolbar-surface {
  border-color: rgba(139, 92, 246, 0.24);
}

[data-theme='dark'] .platform-chips-wrapper .chip {
  background: rgba(15, 23, 42, 0.72);
  color: rgba(226, 232, 240, 0.85);
}

[data-theme='dark'] .search-field {
  background: rgba(17, 24, 39, 0.9);
}

[data-theme='dark'] .sort-control {
  background: rgba(17, 24, 39, 0.9);
}

[data-theme='dark'] .view-toggle {
  background: rgba(17, 24, 39, 0.9);
}
</style>
