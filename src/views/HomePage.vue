<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section with transition -->
      <Transition name="hero-fade">
        <section v-if="settingsStore.settings.showHeroSection" class="hero-section">
          <div class="hero-content glass-card">
            <h1 class="hero-title fade-in">
              {{ $t('app.name') }}
            </h1>
            <p class="hero-subtitle slide-up">
              {{ $t('app.description') }}
            </p>
            <div class="hero-actions slide-up">
              <GlassButton size="lg" @click="goToExplore">
                <Compass :size="20" />
                {{ $t('nav.explore') }}
              </GlassButton>
              <GlassButton v-if="!isAuthenticated" size="lg" variant="secondary" @click="goToLogin">
                {{ $t('nav.login') }}
              </GlassButton>
            </div>
          </div>
        </section>
      </Transition>

      <!-- Platform Stats -->
      <section class="stats-section">
        <div class="stats-grid">
          <div v-for="platform in platforms" :key="platform" class="stat-card glass-card">
            <div class="stat-icon" :style="{ background: getPlatformColor(platform) }">
              <component :is="getPlatformIcon(platform)" :size="32" />
            </div>
            <h3>{{ $t(`platform.${platform}`) }}</h3>
            <p class="stat-count">{{ formatNumber(platformStats[platform] || 0) }}</p>
            <p class="stat-label">{{ $t('post.title') }}</p>
          </div>
        </div>
      </section>

      <!-- Latest Posts -->
      <section class="latest-section">
        <div class="section-header">
          <h2>{{ $t('filter.latest') }}</h2>
          <RouterLink to="/explore">
            <GlassButton variant="ghost">
              {{ $t('common.more') }}
              <ArrowRight :size="18" />
            </GlassButton>
          </RouterLink>
        </div>

        <!-- Access Limit Banner -->
        <AccessLimitBanner :current-count="posts.length" :total-limit="accessLimit" />

        <!-- 初始加载状态 -->
        <LoadingSpinner
          v-if="loading && posts.length === 0"
          size="lg"
          :text="$t('common.loading')"
        />

        <!-- Posts列表 -->
        <div v-else-if="posts.length > 0" class="posts-grid">
          <PostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading" class="empty-state glass-card">
          <ImageIcon :size="64" />
          <p>{{ $t('search.noResults') }}</p>
        </div>

        <!-- 加载更多指示器 -->
        <div v-if="isLoadingMore" class="loading-more">
          <LoadingSpinner size="sm" :text="$t('common.loading')" />
        </div>

        <!-- 没有更多数据提示 -->
        <div v-if="!hasMore && posts.length > 0" class="no-more-hint">
          <p>{{ $t('common.noMore') }}</p>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import {
  Compass,
  ArrowRight,
  ImageIcon,
  Youtube,
  Twitter,
  Music2,
  Instagram,
} from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PostCard from '@/components/features/PostCard.vue'
import AccessLimitBanner from '@/components/AccessLimitBanner.vue'

import type { Post } from '@/types'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { usePostsStore } from '@/stores/posts'
import { useSmartPreload } from '@/composables/useSmartPreload'
import { PLATFORMS, PLATFORM_COLORS } from '@/types'
import { postsApi, statsApi } from '@/api/services'
import toast from '@/utils/toast'
import { formatNumber } from '@/utils/format'
import logger from '@/utils/logger'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const postsStore = usePostsStore()

const { isAuthenticated, user } = storeToRefs(authStore)
const { posts, loading } = storeToRefs(postsStore)

// 访问限制
const accessLimit = computed(() => {
  if (!isAuthenticated.value) return 40 // 未登录：40条
  if (user.value?.is_admin) return Infinity // 管理员：无限制
  return 100 // 已登录：100条
})

const platforms = PLATFORMS
const platformStats = ref<Record<string, number>>({})
const currentPage = ref(1)
const isLoadingMore = ref(false)
const hasMore = ref(true)

const { t } = useI18n()

// 智能预加载
const { refresh: refreshPreload } = useSmartPreload(posts, {
  batchSize: 10,
  rootMargin: '400px 0px',
  enabled: true,
})

onMounted(async () => {
  try {
    // 重置筛选条件，确保首页总是显示最新内容
    postsStore.resetFilters()

    // 并行加载帖子和统计数据（不互相阻塞）
    await Promise.all([
      postsStore.fetchPosts({ page: 1, page_size: 8 }),
      statsApi.getPlatformStats().then(stats => {
        platformStats.value = stats.by_platform || {}
      }).catch(err => {
        logger.error('Failed to load stats:', err)
        // 统计数据失败不影响主内容
      })
    ])

    // 监听滚动事件
    window.addEventListener('scroll', handleScroll)
  } catch (error) {
    logger.error('Failed to load data:', error)
    toast.error(t('common.loadFailed'))
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 滚动加载更多
const handleScroll = () => {
  if (isLoadingMore.value || !hasMore.value) return
  if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight

  // 距离底部200px时触发加载
  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore()
  }
}

// 加载更多帖子
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  if (!isAuthenticated.value && posts.value.length >= accessLimit.value) return

  isLoadingMore.value = true
  currentPage.value++

  try {
    const result = await postsStore.fetchPosts({
      page: currentPage.value,
      page_size: 8,
      append: true, // 追加到现有列表
    })

    // 检查是否还有更多数据
    if (!result || result.items.length === 0) {
      hasMore.value = false
    }
  } catch (error) {
    logger.error('Failed to load more posts:', error)
    currentPage.value-- // 恢复页码
  } finally {
    isLoadingMore.value = false
  }
}

const goToExplore = () => {
  router.push('/explore')
}

const goToLogin = () => {
  router.push('/login')
}

const getPlatformColor = (platform: string) => {
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#666'
}

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, any> = {
    youtube: Youtube,
    twitter: Twitter,
    tiktok: Music2,
    instagram: Instagram,
  }
  return icons[platform] || ImageIcon
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3xl);
}

/* Hero Section Transition */
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-fade-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.hero-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Hero Section */
.hero-section {
  text-align: center;
  padding: var(--spacing-3xl) 0;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-3xl);
}

.hero-title {
  font-size: 4rem;
  font-weight: var(--font-bold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-lg);
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2xl);
  animation-delay: 0.1s;
}

.hero-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  animation-delay: 0.2s;
}

/* Stats Section */
.stats-section {
  padding: var(--spacing-2xl) 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-lg);
}

.stat-card {
  padding: var(--spacing-xl);
  text-align: center;
  transition: all var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--spacing-md);
  border-radius: var(--radius-2xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.stat-count {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Latest Section */
.latest-section {
  padding: var(--spacing-2xl) 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
  width: 100%;
  grid-auto-rows: auto;
  align-items: start;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-secondary);
}

.loading-more {
  display: flex;
  justify-content: center;
  padding: var(--spacing-xl);
}

.no-more-hint {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* 大屏幕优化 (> 1400px) */
@media (min-width: 1400px) {
  .posts-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

/* 中型屏幕 (1024px - 1400px) */
@media (min-width: 1024px) and (max-width: 1399px) {
  .posts-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

/* 平板端适配 (769px - 1023px) */
@media (min-width: 769px) and (max-width: 1023px) {
  .posts-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .stats-section {
    padding: var(--spacing-lg) 0;
  }

  .stats-grid {
    display: flex;
    gap: var(--spacing-sm);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: var(--spacing-xs) 0;
  }

  .stats-grid::-webkit-scrollbar {
    display: none;
  }

  .stat-card {
    flex: 0 0 140px;
    scroll-snap-align: start;
    padding: var(--spacing-md);
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    margin-bottom: var(--spacing-xs);
  }

  .stat-icon svg {
    width: 20px;
    height: 20px;
  }

  .stat-card h3 {
    font-size: var(--text-sm);
    margin-bottom: var(--spacing-xs);
  }

  .stat-count {
    font-size: var(--text-lg);
  }

  .stat-label {
    font-size: var(--text-xs);
  }

  /* 移动端瀑布流布局 - 两列 */
  .posts-grid {
    display: block;
    column-count: 2;
    column-gap: var(--spacing-md);
  }

  .posts-grid :deep(.post-card) {
    display: inline-block;
    width: 100%;
    margin-bottom: var(--spacing-md);
    break-inside: avoid;
    page-break-inside: avoid;
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-content {
    padding: var(--spacing-xl);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  /* 极小屏幕保持两列但缩小间距 */
  .posts-grid {
    column-gap: var(--spacing-sm);
  }

  .posts-grid :deep(.post-card) {
    margin-bottom: var(--spacing-sm);
  }
}
</style>
