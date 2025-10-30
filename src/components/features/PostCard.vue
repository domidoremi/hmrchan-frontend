<template>
  <RouterLink :to="`/posts/${post.id}`" custom v-slot="{ navigate, href }">
    <a
      :href="href"
      class="post-card glass-card"
      data-post-card
      :data-post-id="post.id"
      @click="
        (e) => {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            navigate()
          }
        }
      "
    >
      <!-- 缩略图 -->
      <div class="card-thumbnail">
        <img
          v-if="post.thumbnail_url"
          :src="post.thumbnail_url"
          :alt="post.title || ''"
          loading="lazy"
        />
        <div v-else class="thumbnail-placeholder">
          <ImageIcon :size="48" />
        </div>

        <!-- 平台标签 -->
        <div class="platform-badge" :style="{ background: platformColor }">
          {{ platformName }}
        </div>

        <!-- 转发标记 -->
        <div v-if="isRetweet" class="retweet-badge">
          <Repeat2 :size="14" />
          RT
        </div>

        <!-- 引用标记 -->
        <div v-if="isQuote" class="quote-badge">
          <Quote :size="14" />
          Quote
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
        <div v-if="isRetweet && post.original_author_name" class="card-author">
          <!-- 转发情况：显示转发者 RT 原作者 -->
          <div class="author-retweet">
            <div class="retweeter">
              <User :size="14" />
              <span>{{ post.author_name }}</span>
            </div>
            <Repeat2 :size="14" class="rt-icon" />
            <div class="original-author">
              <User :size="14" />
              <span>{{ post.original_author_name }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="post.author_name" class="card-author">
          <!-- 普通帖子：只显示作者 -->
          <User :size="16" />
          <span>{{ post.author_name }}</span>
        </div>

        <!-- 描述 -->
        <!-- 只有当description与title不重复时才显示 -->
        <p v-if="showDescription" class="card-description">
          {{ truncateText(post.description || '', 100) }}
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
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, Eye, MessageCircle, User, ImageIcon, Repeat2, Quote } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { favoritesApi } from '@/api/services'
import { formatNumber, formatRelativeTime, formatDuration, truncateText } from '@/utils/format'
import toast from '@/utils/toast'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/types'
import type { Post } from '@/types'

interface Props {
  post: Post
}

const props = defineProps<Props>()
const router = useRouter()
const { t } = useI18n()

const isFavorited = ref(false)
const favoriteId = ref<number | null>(null)
const loading = ref(false)

const platformName = computed(
  () => PLATFORM_NAMES[props.post.platform as keyof typeof PLATFORM_NAMES] || props.post.platform,
)
const platformColor = computed(
  () => PLATFORM_COLORS[props.post.platform as keyof typeof PLATFORM_COLORS] || '#666',
)

// 判断是否为转发
const isRetweet = computed(() => {
  return !!props.post.original_author_id && !!props.post.original_author_name
})

// 判断是否为引用推文
const isQuote = computed(() => {
  // 引用推文：有quote_id但没有转发
  const post = props.post as any
  const metadata = post.platform_metadata
  if (!metadata) return false

  const hasQuoteId = metadata.quote_id && Number(metadata.quote_id) > 0
  const hasRetweetId = metadata.retweet_id && Number(metadata.retweet_id) > 0

  return hasQuoteId && !hasRetweetId
})

// 判断是否显示description，避免与title重复
const showDescription = computed(() => {
  if (!props.post.description) return false
  if (!props.post.title) return true

  // 如果description与title完全相同，不显示
  if (props.post.description === props.post.title) return false

  // 如果description以title开头（说明title是从description截取的），不显示
  if (props.post.description.startsWith(props.post.title.replace('...', ''))) return false

  return true
})

onMounted(async () => {
  // 只有登录后才检查收藏状态
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }

  try {
    const result = await favoritesApi.checkFavorite(props.post.id)
    isFavorited.value = result.is_favorited
    favoriteId.value = result.favorite_id
  } catch (error) {
    // 忽略错误（可能是未登录）
  }
})

const toggleFavorite = async () => {
  // 检查登录状态
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    toast.warning(t('favorite.loginRequired'))
    router.push('/login')
    return
  }

  if (loading.value) return

  loading.value = true
  try {
    if (isFavorited.value && favoriteId.value) {
      // 删除收藏
      await favoritesApi.deleteFavorite(favoriteId.value)
      isFavorited.value = false
      favoriteId.value = null
      toast.success(t('favorite.removeSuccess'))
    } else {
      // 添加收藏
      const favorite = await favoritesApi.addFavorite({ post_id: props.post.id })
      isFavorited.value = true
      favoriteId.value = favorite.id
      toast.success(t('favorite.addSuccess'))
    }
  } catch (error: any) {
    console.error('Failed to toggle favorite:', error)
    toast.error(error.response?.data?.message || t('common.operationFailed'))
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
  display: block;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
  color: inherit;
}

.post-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--glass-shadow), var(--glass-glow);
}

.card-thumbnail {
  position: relative;
  width: 100%;
  background: var(--color-surface-variant);
  overflow: hidden;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.card-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform var(--transition-slow);
}

.post-card:hover .card-thumbnail img {
  transform: scale(1.05);
}

.thumbnail-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
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
  padding: 0.25rem 0.75rem;
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
}

.retweet-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 0.25rem 0.5rem;
  background: rgba(34, 197, 94, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.quote-badge {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-size: 0.75rem;
  font-weight: var(--font-semibold);
  border-radius: var(--radius-full);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.author-retweet {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.retweeter,
.original-author {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.original-author {
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

.rt-icon {
  color: #22c55e;
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

/* 移动端优化 */
@media (max-width: 768px) {
  .card-content {
    padding: var(--spacing-sm);
  }

  .card-title {
    font-size: var(--text-sm);
    -webkit-line-clamp: 2;
    margin-bottom: var(--spacing-xs);
  }

  .card-author {
    font-size: var(--text-xs);
    margin-bottom: var(--spacing-xs);
    gap: 0.25rem;
  }

  .card-author svg {
    flex-shrink: 0;
  }

  .author-retweet {
    gap: 0.25rem;
  }

  .retweeter,
  .original-author {
    gap: 0.125rem;
  }

  .retweeter svg,
  .original-author svg {
    width: 12px;
    height: 12px;
  }

  .rt-icon {
    width: 12px;
    height: 12px;
  }

  .card-description {
    font-size: var(--text-xs);
    -webkit-line-clamp: 2;
    margin-bottom: var(--spacing-sm);
  }

  .card-stats {
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .stat-item {
    font-size: var(--text-xs);
  }

  .platform-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.5rem;
  }

  .retweet-badge,
  .quote-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .media-count-badge,
  .duration-badge {
    font-size: 0.625rem;
    padding: 0.125rem 0.375rem;
  }

  .favorite-button {
    width: 28px;
    height: 28px;
  }

  .publish-date {
    font-size: 0.625rem;
  }
}

/* 极小屏幕优化 */
@media (max-width: 480px) {
  .card-content {
    padding: var(--spacing-xs) var(--spacing-sm);
  }

  .card-title {
    -webkit-line-clamp: 1;
  }

  .card-description {
    -webkit-line-clamp: 1;
  }
}
</style>
