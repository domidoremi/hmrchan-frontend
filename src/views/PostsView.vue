<template>
  <MainLayout>
    <div class="posts-view">
      <!-- Hero Header with Gradient Background -->
      <section ref="heroRef" class="posts-header">
        <div class="header-bg-gradient"></div>
        <div class="header-content">
          <div class="header-badge">
            <ImageIcon :size="20" />
            <span>{{ $t('nav.posts') }}</span>
          </div>
          <h1 class="page-title">
            {{ $t('post.title') }}
          </h1>
          <p class="page-subtitle">
            {{ $t('posts.subtitle') }}
          </p>
          <!-- Stats Row -->
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-value">{{ formatNumber(posts.length) }}</div>
              <div class="stat-label">{{ $t('posts.totalPosts') }}</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value">{{ selectedPlatform === 'all' ? filterPlatforms.length - 1 : 1 }}</div>
              <div class="stat-label">{{ $t('posts.platforms') }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Advanced Filter Bar with Glassmorphism -->
      <section ref="filterRef" class="filter-bar" :class="{ 'is-sticky': isFilterSticky }">
        <div class="filter-wrapper">
          <!-- Search with Icon Animation -->
          <div class="search-container">
            <div class="search-input" :class="{ 'is-focused': isSearchFocused }">
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
                <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
                  <X :size="16" />
                </button>
              </Transition>
            </div>
          </div>

          <!-- Platform Filter Chips -->
          <div class="platform-chips-wrapper">
            <div class="platform-chips" ref="platformChipsRef">
              <button
                v-for="platform in filterPlatforms"
                :key="platform.value"
                :class="['chip', { active: selectedPlatform === platform.value }]"
                @click="selectPlatform(platform.value)"
                :aria-label="`Filter by ${platform.label}`"
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
            <!-- Scroll indicators for mobile -->
            <div class="scroll-indicator left" v-if="showLeftScroll"></div>
            <div class="scroll-indicator right" v-if="showRightScroll"></div>
          </div>

          <!-- Advanced Controls -->
          <div class="controls-group">
            <!-- Sort Dropdown with Custom Style -->
            <div class="sort-control">
              <SlidersHorizontal :size="16" class="control-icon" />
              <select v-model="sortBy" class="sort-dropdown">
                <option value="latest">{{ $t('filter.latest') }}</option>
                <option value="popular">{{ $t('filter.popular') }}</option>
                <option value="oldest">{{ $t('filter.oldest') }}</option>
              </select>
              <ChevronDown :size="16" class="dropdown-arrow" />
            </div>

            <!-- View Toggle (Grid/List) -->
            <div class="view-toggle">
              <button
                :class="['view-btn', { active: viewMode === 'grid' }]"
                @click="viewMode = 'grid'"
                aria-label="Grid view"
              >
                <Grid3x3 :size="18" />
              </button>
              <button
                :class="['view-btn', { active: viewMode === 'list' }]"
                @click="viewMode = 'list'"
                aria-label="List view"
              >
                <List :size="18" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Posts Content with Adaptive Layout -->
      <section class="posts-section">
        <!-- Loading Skeleton -->
        <div v-if="loading && posts.length === 0" class="skeleton-grid">
          <div v-for="i in 8" :key="i" class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-line"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>

        <!-- Posts Grid (Responsive Masonry) -->
        <div
          v-else-if="posts.length > 0"
          ref="postsGridRef"
          :class="['posts-grid', `view-${viewMode}`]"
        >
          <PostCard
            v-for="(post, index) in posts"
            :key="post.id"
            :post="post"
            :is-first-screen="index < 6"
          />
        </div>

        <!-- Empty State with Illustration -->
        <EmptyState
          v-else-if="!loading"
          icon="image"
          :title="$t('search.noResults')"
          :description="$t('search.noResultsDesc')"
        />

        <!-- Load More Indicator -->
        <Transition name="fade">
          <div v-if="isLoadingMore" class="loading-more">
            <div class="loading-spinner"></div>
            <span>{{ $t('common.loading') }}</span>
          </div>
        </Transition>

        <!-- End of Content -->
        <Transition name="fade">
          <div v-if="!hasMore && posts.length > 0" class="end-content">
            <div class="end-icon">
              <CheckCircle2 :size="24" />
            </div>
            <span>{{ $t('common.noMore') }}</span>
          </div>
        </Transition>
      </section>

      <!-- Floating Action Button (FAB) - Scroll to Top -->
      <Transition name="fab">
        <button 
          v-show="showScrollTop" 
          class="fab-scroll-top" 
          @click="scrollToTop"
          aria-label="Scroll to top"
        >
          <ArrowUp :size="24" />
          <div class="fab-ripple"></div>
        </button>
      </Transition>

      <!-- Filter Active Indicator -->
      <Transition name="slide-up">
        <div v-if="hasActiveFilters" class="active-filters-bar">
          <div class="active-filters-content">
            <span>{{ activeFiltersText }}</span>
            <button class="clear-filters-btn" @click="clearAllFilters">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import PostCard from '@/components/features/PostCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

import { usePostsStore } from '@/stores/posts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()
const postsStore = usePostsStore()
const { posts, loading } = storeToRefs(postsStore)

// Refs
const heroRef = ref<HTMLElement | null>(null)
const filterRef = ref<HTMLElement | null>(null)
const postsGridRef = ref<HTMLElement | null>(null)
const platformChipsRef = ref<HTMLElement | null>(null)

// State
const searchQuery = ref('')
const selectedPlatform = ref<string>('all')
const sortBy = ref('latest')
const viewMode = ref<'grid' | 'list'>('grid')
const showScrollTop = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const isSearchFocused = ref(false)
const isFilterSticky = ref(false)
const showLeftScroll = ref(false)
const showRightScroll = ref(false)

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
    const platform = filterPlatforms.value.find(p => p.value === selectedPlatform.value)
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
  // Debounce search
  setTimeout(() => {
    currentPage.value = 1
    loadPosts()
  }, 300)
}

const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  loadPosts()
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedPlatform.value = 'all'
  sortBy.value = 'latest'
  currentPage.value = 1
  loadPosts()
}

const loadPosts = async () => {
  try {
    const response = await postsStore.fetchPosts({
      page: currentPage.value,
      platform: selectedPlatform.value === 'all' ? undefined : selectedPlatform.value,
      sort_by: sortBy.value === 'latest' ? 'published_at' : sortBy.value === 'popular' ? 'view_count' : 'published_at',
      sort_order: sortBy.value === 'oldest' ? 'asc' : 'desc',
    })
    
    // 根据pagination设置hasMore
    if (response && response.page && response.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Failed to load posts:', error)
    hasMore.value = false
  }
}

const scrollToTop = () => {
  gsap.to(window, {
    scrollTo: { y: 0 },
    duration: 0.8,
    ease: 'power3.inOut',
  })
}

// Check scroll indicators for platform chips
const checkScrollIndicators = () => {
  const el = platformChipsRef.value
  if (!el) return
  
  showLeftScroll.value = el.scrollLeft > 10
  showRightScroll.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 10
}

// Infinite scroll
const loadMore = async () => {
  if (!hasMore.value || isLoadingMore.value) return
  
  currentPage.value++
  try {
    const response = await postsStore.fetchPosts({
      page: currentPage.value,
      platform: selectedPlatform.value === 'all' ? undefined : selectedPlatform.value,
      sort_by: sortBy.value === 'latest' ? 'published_at' : sortBy.value === 'popular' ? 'view_count' : 'published_at',
      sort_order: sortBy.value === 'oldest' ? 'asc' : 'desc',
      append: true, // 追加模式
    })
    
    // 更新hasMore状态
    if (response && response.page && response.pages) {
      hasMore.value = response.page < response.pages
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('Failed to load more posts:', error)
    hasMore.value = false
  }
}

const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: loadMore,
  hasMore: () => hasMore.value,
  threshold: 300,
})

// Lifecycle
onMounted(async () => {
  await loadPosts()
  await nextTick()

  // GSAP entrance animations
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
  if (postsGridRef.value) {
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
  
  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    if (platformChipsRef.value) {
      platformChipsRef.value.removeEventListener('scroll', checkScrollIndicators)
    }
    ScrollTrigger.getAll().forEach(trigger => trigger.kill())
  })
})

// Watch sort changes
watch(sortBy, () => {
  currentPage.value = 1
  loadPosts()
})

// Watch view mode
watch(viewMode, async () => {
  await nextTick()
  // Re-animate cards
  gsap.from('.post-card', {
    y: 20,
    opacity: 0,
    duration: 0.4,
    stagger: 0.05,
    ease: 'power2.out',
  })
})
</script>

<style scoped>
/* ========================================
   Modern Posts View - Apple HIG + Material Design 3
   Responsive-First, Accessible, Performant
   ======================================== */

:root {
  /* Elevation Shadows (Material Design 3) */
  --elevation-1: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --elevation-2: 0 3px 6px rgba(0, 0, 0, 0.08), 0 3px 6px rgba(0, 0, 0, 0.05);
  --elevation-3: 0 10px 20px rgba(0, 0, 0, 0.1), 0 6px 6px rgba(0, 0, 0, 0.08);
  --elevation-4: 0 14px 28px rgba(0, 0, 0, 0.12), 0 10px 10px rgba(0, 0, 0, 0.1);
  
  /* Smooth Transitions */
  --transition-swift: cubic-bezier(0.4, 0.0, 0.2, 1);
  --transition-smooth: cubic-bezier(0.4, 0.0, 0.6, 1);
}

.posts-view {
  min-height: 100vh;
  background: var(--color-bg-primary);
  padding-bottom: 80px;
  position: relative;
}

/* ========================================
   Hero Header - Apple-inspired
   ======================================== */

.posts-header {
  position: relative;
  padding: clamp(60px, 10vw, 120px) clamp(20px, 5vw, 40px) clamp(48px, 8vw, 80px);
  text-align: center;
  overflow: hidden;
}

.header-bg-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 120% 80% at 50% 0%,
    rgba(139, 92, 246, 0.08) 0%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
}

.header-content {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
  z-index: 1;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.15);
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 24px;
  backdrop-filter: blur(8px);
  transition: all 0.3s var(--transition-smooth);
}

.header-badge:hover {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(139, 92, 246, 0.25);
  transform: translateY(-2px);
}

.page-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin: 0 0 20px 0;
  background: linear-gradient(
    135deg,
    var(--color-text-primary) 0%,
    var(--color-primary) 50%,
    rgba(139, 92, 246, 0.8) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 100%;
  animation: gradient-shift 8s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.page-subtitle {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  line-height: 1.6;
  color: var(--color-text-secondary);
  margin: 0 auto 32px;
  max-width: 640px;
  font-weight: 450;
}

/* Stats Row */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 40px;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  padding: 12px 20px;
}

.stat-value {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--glass-border);
}

/* ========================================
   Compact Filter Bar
   ======================================== */

.filter-bar {
  position: sticky;
  top: 68px;
  z-index: 90;
  padding: 16px 20px;
  background: rgba(var(--color-bg-primary-rgb, 255, 255, 255), 0.95);
  backdrop-filter: blur(12px) saturate(180%);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.search-input {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 260px;
  min-width: 200px;
  padding: 10px 14px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.search-input:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.08);
}

.search-input svg {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input input {
  flex: 1;
  margin: 0 10px;
  border: none;
  background: none;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  outline: none;
}

.search-input input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-btn {
  padding: 4px;
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-primary);
}

.platform-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 0 1 auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(139, 92, 246, 0.05);
}

.tab-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
}

.tab-label {
  display: inline-block;
}

.controls {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.sort-dropdown {
  padding: 8px 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-dropdown:hover {
  border-color: var(--color-primary);
}

.sort-dropdown:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.08);
}

/* ========================================
   Posts Section - Masonry Layout
   ======================================== */

.posts-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px) 20px 100px;
  min-height: 60vh;
}

.posts-masonry {
  column-count: 1;
  column-gap: 20px;
}

.posts-masonry :deep(.post-card) {
  break-inside: avoid;
  margin-bottom: 20px;
  display: inline-block;
  width: 100%;
}

.loading-more,
.no-more {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  margin-top: 20px;
}

.no-more span {
  padding: 10px 20px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ========================================
   Scroll to Top Button
   ======================================== */

.scroll-top-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  box-shadow: 
    0 8px 16px -4px rgba(139, 92, 246, 0.4),
    0 16px 32px -8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
}

.scroll-top-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 12px 24px -6px rgba(139, 92, 246, 0.5),
    0 24px 48px -12px rgba(0, 0, 0, 0.25);
}

.scroll-top-btn:active {
  transform: translateY(-2px) scale(0.98);
}

/* ========================================
   Animations
   ======================================== */

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* ========================================
   Responsive Design - Multiple Breakpoints
   ======================================== */

/* Small phones: < 375px */
@media (max-width: 374px) {
  .posts-header {
    padding: 32px 16px 24px;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .filter-bar {
    padding: 12px 16px;
  }
  
  .filter-wrapper {
    gap: 10px;
  }
  
  .tab-label {
    display: none; /* 只显示图标 */
  }
  
  .tab-btn {
    padding: 8px 10px;
  }
  
  .scroll-top-btn {
    bottom: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
  }
}

/* Phones: 375px - 639px */
@media (min-width: 375px) and (max-width: 639px) {
  .posts-masonry {
    column-count: 1;
    column-gap: 16px;
  }
  
  .filter-wrapper {
    gap: 10px;
  }
  
  .search-input {
    flex: 1 1 100%;
  }
  
  .platform-tabs {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .platform-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .controls {
    margin-left: 0;
    width: 100%;
  }
  
  .sort-dropdown {
    width: 100%;
  }
}

/* Large phones / Small tablets: 640px - 767px */
@media (min-width: 640px) and (max-width: 767px) {
  .posts-masonry {
    column-count: 2;
    column-gap: 18px;
  }
  
  .filter-wrapper {
    gap: 12px;
  }
  
  .tab-label {
    display: inline-block;
  }
}

/* Tablets: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .posts-masonry {
    column-count: 2;
    column-gap: 20px;
  }
  
  .filter-wrapper {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .search-input {
    flex: 1 1 300px;
  }
  
  .platform-tabs {
    flex: 1 1 auto;
  }
  
  .controls {
    margin-left: 0;
  }
}

/* Small desktops: 1024px - 1279px */
@media (min-width: 1024px) and (max-width: 1279px) {
  .posts-masonry {
    column-count: 3;
    column-gap: 20px;
  }
}

/* Medium desktops: 1280px - 1535px */
@media (min-width: 1280px) and (max-width: 1535px) {
  .posts-masonry {
    column-count: 3;
    column-gap: 24px;
  }
}

/* Large desktops: >= 1536px */
@media (min-width: 1536px) {
  .posts-masonry {
    column-count: 4;
    column-gap: 24px;
  }
  
  .filter-wrapper {
    max-width: 1600px;
  }
}

/* ========================================
   Dark Theme Enhancements
   ======================================== */

[data-theme='dark'] .posts-header {
  background: linear-gradient(
    to bottom,
    rgba(139, 92, 246, 0.06) 0%,
    transparent 100%
  );
}

[data-theme='dark'] .filter-bar {
  background: rgba(15, 23, 42, 0.95);
  border-bottom-color: rgba(139, 92, 246, 0.15);
}
</style>
