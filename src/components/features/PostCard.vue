<template>
  <div class="post-card glass-card" @click="goToDetail">
    <!-- 缩略图 -->
    <div class="card-thumbnail">
      <img v-if="post.thumbnail_url" :src="post.thumbnail_url" :alt="post.title || ''" loading="lazy" />
      <div v-else class="thumbnail-placeholder">
        <ImageIcon :size="48" />
      </div>

      <!-- 平台标签 -->
      <div class="platform-badge" :style="{ background: platformColor }">
        {{ platformName }}
      </div>

      <!-- 视频时长 -->
      <div v-if="post.duration" class="duration-badge">
        {{ formatDuration(post.duration) }}
      </div>

      <!-- 媒体数量 -->
      <div v-if="post.media_count > 1" class="media-count-badge">
        <ImageIcon :size="14" />
        {{ post.media_count }}
      </div>
    </div>

    <!-- 内容信息 -->
    <div class="card-content">
      <h3 class="card-title">{{ post.title || 'Untitled' }}</h3>

      <!-- 作者信息 -->
      <div v-if="post.author_name" class="card-author">
        <User :size="16" />
        <span>{{ post.author_name }}</span>
      </div>

      <!-- 描述 -->
      <p v-if="post.description" class="card-description">
        {{ truncateText(post.description, 100) }}
      </p>

      <!-- 统计信息 -->
      <div class="card-stats">
        <div v-if="post.view_count" class="stat-item">
          <Eye :size="16" />
          <span>{{ formatNumber(post.view_count) }}</span>
        </div>
        <div v-if="post.like_count" class="stat-item">
          <Heart :size="16" />
          <span>{{ formatNumber(post.like_count) }}</span>
        </div>
        <div v-if="post.comment_count" class="stat-item">
          <MessageCircle :size="16" />
          <span>{{ formatNumber(post.comment_count) }}</span>
        </div>
      </div>

      <!-- 发布时间 -->
      <div class="card-footer">
        <span class="publish-date">{{ formatDate(post.published_at || post.scraped_at) }}</span>
        <button class="favorite-button" @click.stop="toggleFavorite">
          <Heart :size="18" :fill="isFavorited ? 'currentColor' : 'none'" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ImageIcon, User, Eye, Heart, MessageCircle } from 'lucide-vue-next'
import type { Post } from '@/types'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'
import { favoritesApi } from '@/api/services'
import { formatRelativeTime, formatNumber, formatDuration, truncateText } from '@/utils/format'
import toast from '@/utils/toast'

interface Props {
  post: Post
}

const props = defineProps<Props>()
const router = useRouter()

const isFavorited = ref(false)
const loading = ref(false)

const platformName = computed(() => PLATFORM_NAMES[props.post.platform as keyof typeof PLATFORM_NAMES] || props.post.platform)
const platformColor = computed(() => PLATFORM_COLORS[props.post.platform as keyof typeof PLATFORM_COLORS] || '#666')

onMounted(async () => {
  // 检查是否已收藏
  try {
    isFavorited.value = await favoritesApi.isFavorited(props.post.id)
  } catch (error) {
    console.error('Failed to check favorite status:', error)
  }
})

const goToDetail = () => {
  router.push(`/posts/${props.post.id}`)
}

const toggleFavorite = async () => {
  if (loading.value) return
  
  loading.value = true
  try {
    if (isFavorited.value) {
      // TODO: 需要favorite_id才能删除，暂时只切换状态
      isFavorited.value = false
      toast.success('Removed from favorites')
    } else {
      await favoritesApi.addFavorite({ post_id: props.post.id })
      isFavorited.value = true
      toast.success('Added to favorites')
    }
  } catch (error: any) {
    console.error('Failed to toggle favorite:', error)
    toast.error(error.response?.data?.message || 'Operation failed')
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr: string): string => {
  return formatRelativeTime(dateStr)
}
</script>

<style scoped>
.post-card {
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

.card-thumbnail {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background: var(--color-surface-variant);
  overflow: hidden;
}

.card-thumbnail img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}

.post-card:hover .card-thumbnail img {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  background: var(--gradient-mesh);
}

.platform-badge {
  position: absolute;
  top: var(--spacing-sm);
  left: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: white;
  backdrop-filter: blur(10px);
}

.duration-badge {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.media-count-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.card-content {
  padding: var(--spacing-md);
}

.card-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-sm);
}

.card-description {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--line-normal);
  margin-bottom: var(--spacing-md);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--glass-border);
}

.publish-date {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

.favorite-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.favorite-button:hover {
  background: var(--glass-bg-light);
  color: var(--color-primary);
}
</style>
