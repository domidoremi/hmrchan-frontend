<template>
  <div class="post-detail-page">
    <div class="container">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" />
        {{ $t('common.back') }}
      </button>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchPost" />

      <article v-else class="post-content glass-card">
        <template v-if="isLoading">
          <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
          <div class="post-body">
            <div class="skeleton" style="height: 32px; width: 70%;" />
            <div class="skeleton" style="height: 20px; width: 40%; margin-top: 12px;" />
            <div class="skeleton" style="height: 100px; margin-top: 24px;" />
          </div>
        </template>

        <template v-else-if="post">
          <img
            v-if="post.thumbnail_url"
            class="post-image"
            :src="post.thumbnail_url"
            :alt="post.title"
            loading="lazy"
            style="aspect-ratio: 16/9; object-fit: cover;"
          />
          <div v-else class="post-image skeleton" style="aspect-ratio: 16/9;" />

          <div class="post-body">
            <h1 class="post-title">{{ post.title }}</h1>
            <p class="post-meta">
              {{ $t('post.by') }}
              <button type="button" class="author-link" @click="goToAuthor(post.author_id)">
                {{ post.author_name }}
              </button>
            </p>
            <p class="post-stats">
              {{ post.view_count }} {{ $t('post.views') }} · {{ post.like_count }} {{ $t('post.likes') }}
            </p>
            <p v-if="post.description" class="post-description">{{ post.description }}</p>
          </div>
        </template>

        <!-- Post Actions -->
        <div class="post-actions">
          <button
            class="action-btn"
            :class="{ active: isFavorited }"
            @click="toggleFavorite"
            :disabled="!isAuthenticated || isFavoriteLoading"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft, Bookmark, Share2 } from 'lucide-vue-next'
import { useAuthStore, useToastStore } from '@/stores'
import { useI18n } from 'vue-i18n'
import { CommentList } from '@/components/comment'
import { postService, favoriteService, type PostDetailResponse, ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const authStore = useAuthStore()
const toastStore = useToastStore()

const { isAuthenticated } = storeToRefs(authStore)

const postId = computed(() => route.params['id'] as string)
const post = ref<PostDetailResponse | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

const isFavorited = ref(false)
const favoriteId = ref<number | null>(null)
const isFavoriteLoading = ref(false)

function goBack() {
  router.back()
}

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

async function fetchFavoriteStatus() {
  if (!isAuthenticated.value) {
    isFavorited.value = false
    favoriteId.value = null
    return
  }

  try {
    const res = await favoriteService.check(postId.value)
    isFavorited.value = res.is_favorited
    favoriteId.value = res.favorite_id
  } catch {
    isFavorited.value = false
    favoriteId.value = null
  }
}

async function fetchPost() {
  if (isLoading.value) return

  isLoading.value = true
  error.value = null

  try {
    post.value = await postService.getPost(postId.value)
    await fetchFavoriteStatus()
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

async function toggleFavorite() {
  if (!isAuthenticated.value) {
    toastStore.warning(t('comment.loginRequired'))
    return
  }

  if (isFavoriteLoading.value) return
  isFavoriteLoading.value = true

  try {
    if (isFavorited.value) {
      if (favoriteId.value !== null) {
        await favoriteService.remove(favoriteId.value)
      }
      isFavorited.value = false
      favoriteId.value = null
      return
    }

    const created = await favoriteService.create(postId.value)
    isFavorited.value = true
    favoriteId.value = created.id
    toastStore.success(t('post.favorite'))
  } catch (err) {
    if (err instanceof ApiError) {
      toastStore.error(err.message)
    }
  } finally {
    isFavoriteLoading.value = false
  }
}

function sharePost() {
  const url = window.location.href
  navigator.clipboard.writeText(url)
  toastStore.success(t('comment.shareSuccess'))
}

onMounted(() => {
  fetchPost()
})

watch(postId, () => {
  fetchPost()
})

watch(isAuthenticated, () => {
  fetchFavoriteStatus()
})
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

.post-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

.post-meta {
  margin-top: var(--spacing-2);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.author-link {
  margin-left: var(--spacing-2);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.author-link:hover {
  text-decoration: underline;
}

.post-stats {
  margin-top: var(--spacing-2);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.post-description {
  margin-top: var(--spacing-4);
  line-height: 1.7;
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
