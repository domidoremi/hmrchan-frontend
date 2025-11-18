<template>
  <div class="card-content">
    <!-- 标题 -->
    <h3 class="card-title">{{ title || 'Untitled' }}</h3>

    <!-- 描述 -->
    <p v-if="showDescription && description" class="card-description">
      {{ truncateText(description, 60) }}
    </p>

    <!-- 底部区域 -->
    <div class="card-footer">
      <!-- 作者 -->
      <div class="card-author">
        <div class="author-avatar">
          <User :size="14" />
        </div>
        <span class="author-name">{{ authorName || 'Anonymous' }}</span>
      </div>

      <!-- 统计 -->
      <div class="card-stats">
        <div v-if="viewCount" class="stat-item" :title="viewCount.toString()">
          <Eye :size="14" />
          <span>{{ formatNumber(viewCount) }}</span>
        </div>
        <div v-if="likeCount" class="stat-item" :title="likeCount.toString()">
          <Heart :size="14" />
          <span>{{ formatNumber(likeCount) }}</span>
        </div>
      </div>
    </div>

    <!-- 时间戳 -->
    <div v-if="publishedAt" class="card-time">
      <Clock :size="12" />
      <time :datetime="publishedAt">{{ formattedTime }}</time>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { User, Eye, Heart, Clock } from 'lucide-vue-next'
import { formatNumber, formatRelativeTime, truncateText } from '@/utils/format'

interface Props {
  title: string | null
  description: string | null
  showDescription: boolean
  authorName: string | null
  viewCount: number | null
  likeCount: number | null
  publishedAt: string | null
}

const props = defineProps<Props>()

// 异步格式化时间
const formattedTime = ref<string>('')

// 格式化时间的函数
const updateFormattedTime = async () => {
  if (props.publishedAt) {
    formattedTime.value = await formatRelativeTime(props.publishedAt)
  }
}

// 初始化时格式化时间
updateFormattedTime()

// 监听 publishedAt 变化
watch(() => props.publishedAt, updateFormattedTime)
</script>

<style scoped>
/* ========================================
   Content Section
   ======================================== */

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 18px;
  gap: 10px;
  overflow: hidden;
}

/* 标题 - 最多2行 */
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

/* 描述 - 最多1行 */
.card-description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 底部区域 - 自动占据剩余空间 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 8px;
  gap: 8px;
}

/* 作者信息 */
.card-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  min-width: 0;
  flex: 1;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--glass-bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 统计信息 */
.card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}

.stat-item:hover {
  color: var(--color-primary);
  transform: scale(1.05);
}

/* 时间戳 */
.card-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  padding-top: 4px;
  border-top: 1px solid var(--glass-border);
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

/* ========================================
   Responsive Design
   ======================================== */

@media (max-width: 768px) {
  .card-content {
    padding: 14px;
  }

  .card-title {
    font-size: 15px;
  }

  .card-description {
    font-size: 12px;
  }

  .card-author,
  .stat-item {
    font-size: 12px;
  }

  .card-time {
    font-size: 10px;
  }
}

/* ========================================
   Theme Adaptations
   ======================================== */

[data-theme='dark'] .author-avatar {
  background: rgba(139, 92, 246, 0.15);
}

[data-theme='light'] .author-avatar {
  background: rgba(139, 92, 246, 0.08);
  color: var(--color-primary);
}
</style>
