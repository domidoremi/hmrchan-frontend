<template>
  <div class="discussion-list">
    <article
      v-for="discussion in discussions"
      :key="discussion.id"
      class="discussion-item glass-card"
      :class="{ pinned: discussion.is_pinned }"
      @click="handleClick(discussion.id)"
    >
      <!-- 置顶标识 -->
      <div v-if="discussion.is_pinned" class="pinned-badge">
        <Pin :size="14" />
        <span>{{ $t('community.pinned') }}</span>
      </div>

      <div class="discussion-header">
        <!-- 分类标签 -->
        <span class="category-badge" :class="`category-${discussion.category}`">
          {{ getCategoryLabel(discussion.category) }}
        </span>

        <!-- 管理员操作 -->
        <div v-if="isAdmin" class="admin-actions" @click.stop>
          <button
            v-if="!discussion.is_pinned"
            type="button"
            class="action-btn"
            :title="$t('community.pin')"
            @click="handlePin(discussion.id)"
          >
            <Pin :size="16" />
          </button>
          <button
            v-else
            type="button"
            class="action-btn active"
            :title="$t('community.unpin')"
            @click="handleUnpin(discussion.id)"
          >
            <PinOff :size="16" />
          </button>
        </div>
      </div>

      <h3 class="discussion-title">{{ discussion.title }}</h3>

      <p class="discussion-content">{{ discussion.content }}</p>

      <!-- 引用帖子 -->
      <div v-if="discussion.referenced_post" class="referenced-post glass-card">
        <div class="ref-icon">
          <Link2 :size="14" />
        </div>
        <div class="ref-content">
          <div class="ref-header">
            <span class="ref-label">{{ $t('community.referencedPost') }}</span>
          </div>
          <div class="ref-info">
            <img
              v-if="discussion.referenced_post.thumbnail_url"
              :src="discussion.referenced_post.thumbnail_url"
              :alt="discussion.referenced_post.title"
              class="ref-thumb"
            />
            <div class="ref-details">
              <h4 class="ref-title">{{ discussion.referenced_post.title }}</h4>
              <p v-if="discussion.referenced_post.author_name" class="ref-author">
                {{ discussion.referenced_post.author_name }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="discussion.tags.length > 0" class="discussion-tags">
        <span v-for="tag in discussion.tags" :key="tag" class="tag-badge">#{{ tag }}</span>
      </div>

      <div class="discussion-footer">
        <div class="author-info">
          <img
            v-if="discussion.author.avatar_url"
            :src="normalizeAvatarUrl(discussion.author.avatar_url) || undefined"
            :alt="discussion.author.username"
            class="author-avatar"
          />
          <span class="author-name">{{ discussion.author.username }}</span>
          <span class="discussion-time">{{ formatTime(discussion.created_at) }}</span>
        </div>

        <div class="discussion-stats">
          <span class="stat">
            <Eye :size="14" />
            {{ discussion.view_count }}
          </span>
          <span class="stat">
            <Heart :size="14" :class="{ liked: discussion.is_liked }" />
            {{ discussion.likes_count }}
          </span>
          <span class="stat">
            <MessageSquare :size="14" />
            {{ discussion.comments_count }}
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Pin, PinOff, Link2, Eye, Heart, MessageSquare } from 'lucide-vue-next'
import { normalizeAvatarUrl } from '@/api/userService'
import { discussionService, type Discussion } from '@/api'

interface Props {
  discussions: Discussion[]
}

defineProps<Props>()

const emit = defineEmits<{
  pin: [discussionId: string]
  unpin: [discussionId: string]
  refresh: []
}>()

const router = useRouter()

// 检查是否为管理员（需要后端在用户对象中添加 role 或 is_admin 字段）
const isAdmin = computed(() => {
  // TODO: 等待后端添加管理员标识字段
  return false
})

const categoryLabels = {
  general: '💬 综合',
  question: '❓ 提问',
  sharing: '📢 分享',
  feedback: '💡 反馈',
}

function getCategoryLabel(category: string): string {
  return categoryLabels[category as keyof typeof categoryLabels] || category
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString()
  } else if (days > 0) {
    return `${days}天前`
  } else if (hours > 0) {
    return `${hours}小时前`
  } else if (minutes > 0) {
    return `${minutes}分钟前`
  } else {
    return '刚刚'
  }
}

function handleClick(discussionId: string) {
  router.push(`/community/discussions/${discussionId}`)
}

async function handlePin(discussionId: string) {
  try {
    await discussionService.pin(discussionId)
    emit('pin', discussionId)
    emit('refresh')
  } catch (error) {
    console.error('Failed to pin discussion:', error)
  }
}

async function handleUnpin(discussionId: string) {
  try {
    await discussionService.unpin(discussionId)
    emit('unpin', discussionId)
    emit('refresh')
  } catch (error) {
    console.error('Failed to unpin discussion:', error)
  }
}
</script>

<style scoped>
.discussion-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.discussion-item {
  padding: var(--spacing-4);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
}

.discussion-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.discussion-item.pinned {
  border: 1px solid var(--color-primary-light);
  background: linear-gradient(
    135deg,
    var(--glass-bg) 0%,
    rgba(var(--color-primary-rgb), 0.05) 100%
  );
}

.pinned-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  margin-bottom: var(--spacing-2);
}

.discussion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

.category-badge {
  display: inline-block;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
}

.category-badge.category-question {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

.category-badge.category-sharing {
  background: rgba(16, 185, 129, 0.1);
  color: rgb(16, 185, 129);
}

.category-badge.category-feedback {
  background: rgba(245, 158, 11, 0.1);
  color: rgb(245, 158, 11);
}

.admin-actions {
  display: flex;
  gap: var(--spacing-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--glass-bg-light);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--glass-bg);
  color: var(--color-primary);
}

.action-btn.active {
  background: var(--color-primary);
  color: #fff;
}

.discussion-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2);
  line-height: 1.4;
}

.discussion-content {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--spacing-3);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.referenced-post {
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  display: flex;
  gap: var(--spacing-2);
  background: var(--glass-bg-light);
  border-left: 3px solid var(--color-primary);
}

.ref-icon {
  flex-shrink: 0;
  color: var(--color-primary);
  margin-top: 2px;
}

.ref-content {
  flex: 1;
  min-width: 0;
}

.ref-header {
  margin-bottom: var(--spacing-1);
}

.ref-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-weight: var(--font-medium);
}

.ref-info {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.ref-thumb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.ref-details {
  flex: 1;
  min-width: 0;
}

.ref-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ref-author {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.tag-badge {
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.discussion-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.author-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.discussion-time {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.discussion-stats {
  display: flex;
  gap: var(--spacing-3);
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.stat svg {
  opacity: 0.7;
}

.stat svg.liked {
  color: var(--color-danger);
  fill: var(--color-danger);
}

@media (max-width: 768px) {
  .discussion-item {
    padding: var(--spacing-3);
  }

  .discussion-title {
    font-size: var(--text-base);
  }

  .discussion-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .ref-thumb {
    width: 40px;
    height: 40px;
  }
}
</style>
