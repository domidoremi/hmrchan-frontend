<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section -->
      <section class="hero-section">
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

        <LoadingSpinner v-if="loading" size="lg" :text="$t('common.loading')" />

        <div v-else-if="posts.length > 0" class="posts-grid">
          <PostCard v-for="post in posts" :key="post.id" :post="post" />
        </div>

        <div v-else class="empty-state glass-card">
          <ImageIcon :size="64" />
          <p>{{ $t('search.noResults') }}</p>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Compass, ArrowRight, ImageIcon, Youtube, Twitter, Music2, Instagram } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import GlassButton from '@/components/ui/GlassButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PostCard from '@/components/features/PostCard.vue'

import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { PLATFORMS, PLATFORM_COLORS } from '@/types'
import { postsApi, statsApi } from '@/api/services'
import toast from '@/utils/toast'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

const { isAuthenticated } = storeToRefs(authStore)
const { posts, loading } = storeToRefs(postsStore)

const platforms = PLATFORMS
const platformStats = ref<Record<string, number>>({})

onMounted(async () => {
  try {
    // 加载最新内容
    await postsStore.fetchPosts({ page: 1, page_size: 8 })
    
    // 加载统计数据
    const stats = await statsApi.getPlatformStats()
    platformStats.value = stats.by_platform || {}
  } catch (error) {
    console.error('Failed to load data:', error)
    toast.error('Failed to load content')
  }
})

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

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3xl);
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  color: var(--color-text-tertiary);
}

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

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .posts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
