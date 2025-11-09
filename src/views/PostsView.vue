<template>
  <MainLayout>
    <div class="posts-view">
      <!-- Simplified Header -->
      <section ref="heroRef" class="posts-header">
        <div class="header-content">
          <h1 class="page-title">{{ $t('post.title') }}</h1>
          <p class="page-subtitle">{{ $t('posts.subtitle') }}</p>
        </div>
      </section>

      <!-- Compact Filter Bar -->
      <section ref="filterRef" class="filter-bar">
        <div class="filter-wrapper">
          <!-- Search -->
          <div class="search-input">
            <Search :size="18" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('search.placeholder')"
              @input="onSearchInput"
            />
            <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
              <X :size="14" />
            </button>
          </div>

          <!-- Platform Tabs -->
          <div class="platform-tabs">
            <button
              v-for="platform in filterPlatforms"
              :key="platform.value"
              :class="['tab-btn', { active: selectedPlatform === platform.value }]"
              @click="selectPlatform(platform.value)"
            >
              <component :is="platform.icon" :size="16" />
              <span class="tab-label">{{ platform.label }}</span>
            </button>
          </div>

          <!-- Sort & View -->
          <div class="controls">
            <select v-model="sortBy" class="sort-dropdown">
              <option value="latest">{{ $t('filter.latest') }}</option>
              <option value="popular">{{ $t('filter.popular') }}</option>
              <option value="oldest">{{ $t('filter.oldest') }}</option>
            </select>
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

        <!-- Posts Masonry Grid -->
        <div
          v-else-if="posts.length > 0"
          ref="postsGridRef"
          class="posts-masonry"
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
const showScrollTop = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)

// Computed
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

  // Header animation
  if (heroRef.value) {
    gsap.from('.page-title', {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    })
    gsap.from('.page-subtitle', {
      y: 20,
      opacity: 0,
      duration: 0.6,
      delay: 0.2,
      ease: 'power3.out',
    })
  }

  // Filter bar animation
  if (filterRef.value) {
    gsap.from(filterRef.value, {
      y: -20,
      opacity: 0,
      duration: 0.5,
      delay: 0.4,
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

// Watch sort changes
watch(sortBy, () => {
  currentPage.value = 1
  loadPosts()
})
</script>

<style scoped>
/* ========================================
   Simplified Posts View - Clean & Responsive
   ======================================== */

.posts-view {
  min-height: 100vh;
  background: var(--color-bg-primary);
  padding-bottom: 80px;
}

/* ========================================
   Simplified Header
   ======================================== */

.posts-header {
  padding: clamp(40px, 8vw, 80px) 20px clamp(32px, 6vw, 48px);
  text-align: center;
  background: linear-gradient(
    to bottom,
    rgba(139, 92, 246, 0.03) 0%,
    transparent 100%
  );
}

.header-content {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: clamp(0.95rem, 2vw, 1.125rem);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0;
  max-width: 560px;
  margin: 0 auto;
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
