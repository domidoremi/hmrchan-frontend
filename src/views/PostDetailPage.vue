<template>
  <div class="post-detail-page">
    <div class="container">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" />
        {{ $t('common.back') }}
      </button>

      <article class="post-content glass-card">
        <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
        <div class="post-body">
          <div class="skeleton" style="height: 32px; width: 70%;" />
          <div class="skeleton" style="height: 20px; width: 40%; margin-top: 12px;" />
          <div class="skeleton" style="height: 100px; margin-top: 24px;" />
        </div>

        <!-- Post Actions -->
        <div class="post-actions">
          <button
            class="action-btn"
            :class="{ active: isFavorited }"
            @click="toggleFavorite"
            :disabled="!isAuthenticated"
          >
            <Bookmark :size="20" :fill="isFavorited ? 'currentColor' : 'none'" />
            <span>{{ isFavorited ? $t('post.unfavorite') : $t('post.favorite') }}</span>
          </button>
          <button class="action-btn" @click="sharePost">
            <Share2 :size="20" />
            <span>{{ $t('post.share') }}</span>
          </button>
        </div>
      </article>

      <!-- Comments Section -->
      <CommentList :post-id="postId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Bookmark, Share2 } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { CommentList } from '@/components/comment'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const { isAuthenticated } = storeToRefs(authStore)

const postId = computed(() => route.params['id'] as string)
const isFavorited = ref(false)

function goBack() {
  router.back()
}

async function toggleFavorite() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  // TODO: Implement API call
  isFavorited.value = !isFavorited.value
  if (isFavorited.value) {
    toastStore.success(t('post.favorite'))
  }
}

function sharePost() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  toastStore.success(t('comment.shareSuccess'))
}
</script>

<style scoped>
.post-detail-page {
  padding: var(--spacing-6) 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-4);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.post-content {
  overflow: hidden;
}

.post-body {
  padding: var(--spacing-6);
}

.post-actions {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--glass-border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--glass-bg);
  color: var(--color-text-primary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  color: var(--color-primary);
}
</style>
