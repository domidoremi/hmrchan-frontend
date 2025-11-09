<template>
  <MainLayout>
    <div class="posts-view">
      <!-- Hero Header with GSAP Animation -->
      <section ref="heroRef" class="posts-hero">
        <div class="hero-background">
          <div class="gradient-orb orb-1"></div>
          <div class="gradient-orb orb-2"></div>
          <div class="gradient-orb orb-3"></div>
        </div>
        
        <div class="hero-content">
          <h1 class="hero-title">
            <span class="title-line">{{ $t('post.title') }}</span>
            <span class="title-accent">{{ $t('common.explore') }}</span>
          </h1>
          <p class="hero-subtitle">{{ $t('posts.subtitle') }}</p>
          
          <!-- Stats -->
          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-value">{{ formatNumber(totalPosts) }}</div>
              <div class="stat-label">{{ $t('post.total') }}</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value">{{ platforms.length }}</div>
              <div class="stat-label">{{ $t('common.platforms') }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Filter Bar -->
      <section ref="filterRef" class="filter-section">
        <div class="filter-container">
          <!-- Search -->
          <div class="search-box">
            <Search :size="20" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('search.placeholder')"
              @input="onSearchInput"
            />
            <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
              <X :size="16" />
            </button>
          </div>

          <!-- Platform Filter -->
          <div class="filter-group">
            <button
              v-for="platform in filterPlatforms"
              :key="platform.value"
              :class="['platform-chip', { active: selectedPlatform === platform.value }]"
              @click="selectPlatform(platform.value)"
            >
              <component :is="platform.icon" :size="18" />
              <span>{{ platform.label }}</span>
            </button>
          </div>

          <!-- Sort Options -->
          <select v-model="sortBy" class="sort-select">
            <option value="latest">{{ $t('filter.latest') }}</option>
            <option value="popular">{{ $t('filter.popular') }}</option>
            <option value="oldest">{{ $t('filter.oldest') }}</option>
          </select>

          <!-- View Toggle -->
          <div class="view-toggle">
            <button
              :class="['toggle-btn', { active: viewMode === 'grid' }]"
              @click="viewMode = 'grid'"
            >
              <LayoutGrid :size="20" />
            </button>
            <button
              :class="['toggle-btn', { active: viewMode === 'masonry' }]"
              @click="viewMode = 'masonry'"
            >
              <Columns3 :size="20" />
            </button>
          </div>
        </div>
      </section>

      <!-- Posts Grid/Masonry -->
      <section class="posts-section">
        <!-- Loading State -->
        <LoadingSpinner
          v-if="loading && posts.length === 0"
          size="lg"
          :text="$t('common.loading')"
        />

        <!-- Posts Grid -->
        <div
          v-else-if="posts.length > 0"
          ref="postsGridRef"
          :class="['posts-grid', `view-${viewMode}`]"
        >
          <PostCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
            :is-first-screen="false"
          />
        </div>

        <!-- Empty State -->
        <EmptyState
          v-else-if="!loading"
          icon="image"
          :title="$t('search.noResults')"
          :description="$t('search.noResultsDesc')"
        />

        <!-- Load More -->
        <div v-if="isLoadingMore" class="loading-more">
          <LoadingSpinner size="sm" :text="$t('common.loading')" />
        </div>

        <!-- No More -->
        <div v-if="!hasMore && posts.length > 0" class="no-more">
          <span>{{ $t('common.noMore') }}</span>
        </div>
      </section>

      <!-- Scroll to Top Button -->
      <Transition name="fade-scale">
        <button v-show="showScrollTop" class="scroll-top-btn" @click="scrollToTop">
          <ArrowUp :size="24" />
        </button>
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
  LayoutGrid,
  Columns3,
  ArrowUp,
  ImageIcon,
  Youtube,
  Twitter,
  Instagram,
  Music2,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import PostCard from '@/components/features/PostCard.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

import { usePostsStore } from '@/stores/posts'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { PLATFORMS } from '@/types'
import { formatNumber } from '@/utils/format'

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger)

const { t } = useI18n()
const postsStore = usePostsStore()
const { posts, loading } = storeToRefs(postsStore)

// Refs
const heroRef = ref<HTMLElement | null>(null)
const filterRef = ref<HTMLElement | null>(null)
const postsGridRef = ref<HTMLElement | null>(null)

// State
const searchQuery = ref('')
const selectedPlatform = ref<string>('all')
const sortBy = ref('latest')
const viewMode = ref<'grid' | 'masonry'>('grid')
const showScrollTop = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)

// Computed
const platforms = PLATFORMS
const totalPosts = computed(() => posts.value.length)

const filterPlatforms = computed(() => [
  { value: 'all', label: t('platform.all'), icon: ImageIcon },
  { value: 'youtube', label: t('platform.youtube'), icon: Youtube },
  { value: 'twitter', label: t('platform.twitter'), icon: Twitter },
  { value: 'instagram', label: t('platform.instagram'), icon: Instagram },
  { value: 'tiktok', label: t('platform.tiktok'), icon: Music2 },
])

// Methods
const selectPlatform = (platform: string) => {
  selectedPlatform.value = platform
  currentPage.value = 1
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

const loadPosts = async () => {
  try {
    await postsStore.fetchPosts({
      page: currentPage.value,
      platform: selectedPlatform.value === 'all' ? undefined : selectedPlatform.value,
    })
  } catch (error) {
    console.error('Failed to load posts:', error)
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
  if (!hasMore.value) return
  
  currentPage.value++
  await loadPosts()
}

const { isLoading: isLoadingMore } = useInfiniteScroll({
  onLoadMore: loadMore,
  hasMore: () => hasMore.value,
  threshold: 300,
})

// GSAP Animations
onMounted(async () => {
  await loadPosts()
  await nextTick()

  // Hero animation
  if (heroRef.value) {
    const tl = gsap.timeline()
    tl.from('.hero-title .title-line', {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    })
    .from('.hero-title .title-accent', {
      y: 60,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.6')
    .from('.hero-subtitle', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    }, '-=0.4')
    .from('.hero-stats', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    }, '-=0.3')

    // Animate gradient orbs
    gsap.to('.gradient-orb', {
      y: '+=30',
      duration: 3,
      ease: 'sine.inOut',
      stagger: 0.2,
      repeat: -1,
      yoyo: true,
    })
  }

  // Filter animation
  if (filterRef.value) {
    gsap.from(filterRef.value, {
      y: -30,
      opacity: 0,
      duration: 0.6,
      delay: 0.3,
      ease: 'power3.out',
    })
  }

  // Scroll event
  const handleScroll = () => {
    showScrollTop.value = window.scrollY > 400
  }
  window.addEventListener('scroll', handleScroll)
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))
})

// Watch view mode changes
watch(viewMode, async () => {
  await nextTick()
  ScrollTrigger.refresh()
})

// Watch sort changes
watch(sortBy, () => {
  currentPage.value = 1
  loadPosts()
})
</script>

<style scoped>
/* ========================================
   Posts View - Modern Design System
   Inspired by Google Material, Apple HIG, GSAP
   ======================================== */

.posts-view {
  min-height: 100vh;
  background: var(--color-bg-primary);
}

/* ========================================
   Hero Section
   ======================================== */

.posts-hero {
  position: relative;
  padding: 120px 24px 80px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.05) 0%,
    rgba(6, 182, 212, 0.05) 50%,
    rgba(244, 114, 182, 0.05) 100%
  );
}

.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: rgba(139, 92, 246, 0.3);
  top: -200px;
  left: -100px;
}

.orb-2 {
  width: 350px;
  height: 350px;
  background: rgba(6, 182, 212, 0.3);
  top: 50px;
  right: -100px;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: rgba(244, 114, 182, 0.3);
  bottom: -150px;
  left: 50%;
  transform: translateX(-50%);
}

.hero-content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.hero-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  overflow: hidden;
}

.title-line {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.03em;
}

.title-accent {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #F472B6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: 48px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 24px 32px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--glass-border);
}

/* ========================================
   Filter Section
   ======================================== */

.filter-section {
  position: sticky;
  top: 64px;
  z-index: 100;
  padding: 24px;
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
}

.filter-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 280px;
  padding: 12px 16px;
  background: var(--glass-bg);
  border: 2px solid var(--glass-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.search-box:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}

.search-box svg {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  margin: 0 12px;
  border: none;
  background: none;
  font-size: 1rem;
  color: var(--color-text-primary);
  outline: none;
}

.clear-btn {
  padding: 4px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-primary);
}

.filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--glass-bg);
  border: 2px solid var(--glass-border);
  border-radius: 24px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.platform-chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.platform-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.sort-select {
  padding: 10px 16px;
  background: var(--glass-bg);
  border: 2px solid var(--glass-border);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-select:hover,
.sort-select:focus {
  border-color: var(--color-primary);
  outline: none;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background: var(--glass-bg);
  border: 2px solid var(--glass-border);
  border-radius: 12px;
  padding: 4px;
}

.toggle-btn {
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-primary);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: white;
}

/* ========================================
   Posts Section
   ======================================== */

.posts-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  min-height: 60vh;
}

.posts-grid {
  display: grid;
  gap: 24px;
}

.posts-grid.view-grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.posts-grid.view-masonry {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-auto-rows: 20px;
}

.posts-grid.view-masonry :deep(.post-card) {
  grid-row: span 20;
}

.loading-more,
.no-more {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.no-more span {
  padding: 12px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
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
   Responsive Design
   ======================================== */

@media (max-width: 768px) {
  .posts-hero {
    padding: 80px 16px 60px;
  }

  .hero-stats {
    gap: 16px;
    padding: 16px 20px;
  }

  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: 100%;
  }

  .filter-group {
    justify-content: center;
  }

  .posts-grid.view-grid {
    grid-template-columns: 1fr;
  }

  .scroll-top-btn {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
}

/* ========================================
   Dark Theme Enhancements
   ======================================== */

[data-theme='dark'] .posts-hero {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.08) 0%,
    rgba(6, 182, 212, 0.08) 50%,
    rgba(244, 114, 182, 0.08) 100%
  );
}

[data-theme='dark'] .gradient-orb {
  opacity: 0.4;
}

[data-theme='dark'] .filter-section {
  background: rgba(15, 23, 42, 0.95);
}
</style>
