<template>
  <div class="author-detail-page">
    <div class="container">
      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchAuthor" />

      <template v-else>
        <div class="author-header glass-card">
          <template v-if="isLoading">
            <div class="author-avatar skeleton" />
            <div class="author-info">
              <div class="skeleton" style="height: 28px; width: 200px" />
              <div class="skeleton" style="height: 16px; width: 120px; margin-top: 8px" />
            </div>
          </template>

          <template v-else-if="author">
            <img
              v-if="author.avatar_url"
              class="author-avatar"
              :src="normalizeAvatarUrl(author.avatar_url) || author.avatar_url"
              :alt="author.name"
              loading="eager"
              decoding="async"
              fetchpriority="high"
              style="object-fit: cover"
            />
            <div v-else class="author-avatar skeleton" />

            <div class="author-info">
              <h1 class="author-name">{{ author.name }}</h1>
              <p class="author-username">@{{ author.username }}</p>
            </div>
          </template>
        </div>

        <h2 class="section-title">Posts</h2>
        <div class="posts-grid">
          <template v-if="isLoading">
            <div v-for="i in 6" :key="i" class="post-card glass-card">
              <div class="post-image skeleton" style="aspect-ratio: 1" />
            </div>
          </template>

          <template v-else>
            <PostCard
              v-for="post in posts"
              :key="post.id"
              :post="post"
              aspect-ratio="1"
              :show-content="false"
              @click="goToPost"
            />

            <StateIndicator v-if="posts.length === 0" variant="empty" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorResponse, type PostListItem, ApiError } from '@/api'
import { normalizeAvatarUrl } from '@/api/userService'
import { authorCache } from '@/utils/cache'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import PostCard from '@/components/business/PostCard.vue'

const route = useRoute()
const router = useRouter()

const { t } = useI18n()

const authorId = computed(() => route.params['id'] as string)

const author = ref<AuthorResponse | null>(null)
const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function fetchAuthor() {
  if (isLoading.value) return

  isLoading.value = true
  error.value = null

  // 先从缓存加载（快速显示）
  const cached = await authorCache.getAuthor(authorId.value)
  if (cached) {
    author.value = cached.data as AuthorResponse
  }

  try {
    const [authorRes, postsRes] = await Promise.all([
      authorService.getAuthor(authorId.value),
      authorService.listAuthorPosts(authorId.value, 1, 24),
    ])
    author.value = authorRes
    posts.value = postsRes.items

    // 写入缓存
    await authorCache.setAuthor(authorId.value, authorRes)
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

function goToPost(postId: string, thumbnailSrc: string | null) {
  if (thumbnailSrc) {
    sessionStorage.setItem(`post-thumbnail-${postId}`, thumbnailSrc)
  }
  router.push(`/post/${postId}`)
}

onMounted(() => {
  fetchAuthor()
})

watch(authorId, () => {
  fetchAuthor()
})
</script>

<style scoped>
.author-detail-page {
  padding: var(--spacing-4) 0;
}

.author-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.author-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .author-header {
    padding: var(--spacing-5);
    gap: var(--spacing-5);
  }

  .author-avatar {
    width: 88px;
    height: 88px;
  }
}

.section-title {
  font-size: var(--text-lg);
  margin-bottom: var(--spacing-3);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
}

@media (min-width: 480px) {
  .posts-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .posts-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .posts-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1400px) {
  .posts-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 1800px) {
  .posts-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}
</style>
