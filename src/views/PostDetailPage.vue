<template>
  <MainLayout>
    <div class="post-detail-page">
      <LoadingSpinner v-if="loading" size="lg" :text="$t('common.loading')" />

      <div v-else-if="post" class="post-detail">
        <!-- 返回按钮 -->
        <button class="back-button glass-button" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back') }}
        </button>

        <!-- 主要内容 -->
        <div class="post-header glass-card">
          <h1 class="post-title">{{ post.title || 'Untitled' }}</h1>

          <div class="post-meta">
            <div class="meta-item">
              <Calendar :size="18" />
              <span>{{ formatDate(post.published_at || post.scraped_at) }}</span>
            </div>
            <div class="meta-item">
              <span class="platform-badge" :style="{ background: platformColor }">
                {{ platformName }}
              </span>
            </div>
          </div>

          <div v-if="post.author_name" class="author-info">
            <div class="author-avatar">
              <User :size="24" />
            </div>
            <div class="author-details">
              <h3>{{ post.author_name }}</h3>
              <p v-if="post.author_username">@{{ post.author_username }}</p>
            </div>
          </div>

          <div class="post-stats">
            <div v-if="post.view_count" class="stat-item">
              <Eye :size="20" />
              <span>{{ formatNumber(post.view_count) }} {{ $t('post.views') }}</span>
            </div>
            <div v-if="post.like_count" class="stat-item">
              <Heart :size="20" />
              <span>{{ formatNumber(post.like_count) }} {{ $t('post.likes') }}</span>
            </div>
            <div v-if="post.comment_count" class="stat-item">
              <MessageCircle :size="20" />
              <span>{{ formatNumber(post.comment_count) }} {{ $t('post.comments') }}</span>
            </div>
          </div>

          <div v-if="post.description" class="post-description">
            <p>{{ post.description }}</p>
          </div>

          <div class="post-actions">
            <GlassButton @click="toggleFavorite">
              <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
              {{ $t('favorite.add') }}
            </GlassButton>
            <a :href="post.url" target="_blank" rel="noopener noreferrer">
              <GlassButton variant="secondary">
                <ExternalLink :size="18" />
                {{ $t('post.viewOriginal') }}
              </GlassButton>
            </a>
          </div>
        </div>

        <!-- 媒体文件 -->
        <div v-if="post.media_files && post.media_files.length > 0" class="media-section">
          <h2>{{ $t('post.media') }} ({{ post.media_files.length }})</h2>
          <div class="media-grid">
            <div
              v-for="media in post.media_files"
              :key="media.id"
              class="media-item glass-card"
            >
              <img
                v-if="media.file_type === 'image'"
                :src="`/api/media/${media.id}/stream`"
                :alt="post.title || ''"
                loading="lazy"
              />
              <video v-else-if="media.file_type === 'video'" controls>
                <source :src="`/api/media/${media.id}/stream`" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>

        <!-- 标签 -->
        <div v-if="post.tags && post.tags.length > 0" class="tags-section glass-card">
          <h3>{{ $t('post.tags') }}</h3>
          <div class="tags-list">
            <span v-for="tag in post.tags" :key="tag" class="tag glass-badge">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="error-state glass-card">
        <AlertCircle :size="64" />
        <h3>{{ $t('common.error') }}</h3>
        <p>Post not found</p>
        <GlassButton @click="goBack">
          {{ $t('common.back') }}
        </GlassButton>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  AlertCircle,
} from 'lucide-vue-next'
import dayjs from 'dayjs'

import MainLayout from '@/components/layout/MainLayout.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import GlassButton from '@/components/ui/GlassButton.vue'

import { usePostsStore } from '@/stores/posts'
import type { PostDetail } from '@/types'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'

const route = useRoute()
const router = useRouter()
const postsStore = usePostsStore()

const post = ref<PostDetail | null>(null)
const loading = ref(true)
const isFavorited = ref(false)

const platformName = computed(
  () => PLATFORM_NAMES[post.value?.platform as keyof typeof PLATFORM_NAMES] || post.value?.platform,
)
const platformColor = computed(
  () => PLATFORM_COLORS[post.value?.platform as keyof typeof PLATFORM_COLORS] || '#666',
)

onMounted(async () => {
  const postId = parseInt(route.params.id as string, 10)
  try {
    post.value = await postsStore.fetchPost(postId)
  } catch (error) {
    console.error('Failed to fetch post:', error)
  } finally {
    loading.value = false
  }
})

const goBack = () => {
  router.back()
}

const toggleFavorite = () => {
  isFavorited.value = !isFavorited.value
  // TODO: 调用API
}

const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}
</script>

<style scoped>
.post-detail-page {
  max-width: 1000px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: var(--spacing-lg);
}

.post-header {
  padding: var(--spacing-2xl);
  margin-bottom: var(--spacing-xl);
}

.post-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
  line-height: var(--line-tight);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.platform-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: white;
  font-weight: var(--font-semibold);
}

.author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: var(--glass-bg-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
}

.author-avatar {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.author-details h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.author-details p {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.post-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-xl);
  padding: var(--spacing-lg) 0;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-base);
}

.post-description {
  margin-bottom: var(--spacing-xl);
}

.post-description p {
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
  line-height: var(--line-relaxed);
  white-space: pre-wrap;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.media-section {
  margin-bottom: var(--spacing-xl);
}

.media-section h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-lg);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.media-item {
  overflow: hidden;
}

.media-item img,
.media-item video {
  width: 100%;
  height: auto;
  display: block;
}

.tags-section {
  padding: var(--spacing-xl);
}

.tags-section h3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.tag {
  font-size: var(--text-sm);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  text-align: center;
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .post-title {
    font-size: var(--text-2xl);
  }

  .media-grid {
    grid-template-columns: 1fr;
  }
}
</style>
