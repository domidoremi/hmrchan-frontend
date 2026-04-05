<template>
  <div class="author-detail-page">
    <div class="container">
      <StateIndicator
        v-if="error && !isUsingFallback"
        variant="error"
        :description="error"
        @action="fetchAuthor"
      />

      <template v-else>
        <div class="author-header empty-surface">
          <template v-if="isLoading">
            <Skeleton variant="avatar" width="80px" height="80px" />
            <div class="author-info">
              <Skeleton width="12.5rem" height="1.75rem" />
              <Skeleton width="7.5rem" height="1rem" />
            </div>
          </template>

          <template v-else-if="author">
            <Avatar
              class="author-avatar"
              size="custom"
              :src="resolvedAuthorAvatarSrc"
              :alt="author.display_name || author.name"
              loading="eager"
              decoding="async"
              fetch-priority="high"
              :fallback="authorFallbackLabel"
            />

            <div class="author-info">
              <h1 class="author-name">{{ author.display_name || author.name }}</h1>
              <p class="author-username">@{{ author.username }}</p>
            </div>
          </template>
        </div>

        <h2 class="author-section-title">{{ $t('author.posts') }}</h2>
        <div class="posts-grid">
          <template v-if="isLoading">
            <div v-for="i in 6" :key="i" class="post-card page-list-card">
              <Skeleton variant="image" width="100%" />
            </div>
          </template>

          <template v-else>
            <PostCard
              v-for="post in posts"
              :key="post.id"
              v-memo="getPostMemo(post)"
              :post="post"
              aspect-ratio="1"
              thumbnail-size="small"
              :show-content="false"
              :prefetch-on-hover="false"
              :preload-large-image-on-hover="false"
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
defineOptions({ name: 'AuthorDetailPage' })

import { ref, computed, watch, onWatcherCleanup, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorResponse, type PostListItem, ApiError } from '@/api'
import { authorCache, getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'
import { storePostNavigationContext } from '@/utils/postNavigation'
import { applyPageMeta } from '@/utils/pageMeta'
import { getAvatarFallbackLabel, resolveAvatarSrc } from '@/utils/avatarPresentation'
import { cachePostThumbnailPreview } from '@/utils/thumbnailPresentation'
import { getFallbackAuthorById, getFallbackAuthorPosts } from '@/fallbacks/authorsFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import Avatar from '@/components/ui/Avatar.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import PostCard from '@/components/business/PostCard.vue'

const route = useRoute()
const router = useRouter()

const { t } = useI18n()

const authorId = computed(() => route.params['id'] as string)

const author = ref<AuthorResponse | null>(null)
const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const dataSource = ref<PublicPageDataSource>('live')
const isUsingFallback = computed(() => dataSource.value === 'fallback')
const resolvedAuthorAvatarSrc = computed(() => resolveAvatarSrc(author.value?.avatar_url))
const authorFallbackLabel = computed(() =>
  getAvatarFallbackLabel(author.value?.display_name, author.value?.name, author.value?.username)
)
let latestRequestId = 0
let authorController: AbortController | null = null
const AUTHOR_DETAIL_SNAPSHOT_SCOPE = 'author/detail'

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : err instanceof Error && err.name === 'AbortError'
}

function abortAuthorRequest() {
  authorController?.abort()
  authorController = null
}

function getPostMemo(post: PostListItem) {
  return [
    post.id,
    post.platform,
    post.thumbnail_url ?? '',
    post.title ?? '',
    post.author_name ?? '',
    post.like_count,
    post.comment_count,
    post.view_count,
    post.published_at ?? '',
  ] as const
}

function syncAuthorMeta(currentAuthor: AuthorResponse | null | undefined) {
  const title =
    currentAuthor?.display_name?.trim() ||
    currentAuthor?.name?.trim() ||
    currentAuthor?.username?.trim()

  if (!title) return

  applyPageMeta({
    title,
    description: currentAuthor?.bio ?? currentAuthor?.description,
    canonicalPath: route.path,
  })
}

async function fetchAuthor(targetAuthorId = authorId.value, signal?: AbortSignal) {
  const requestId = ++latestRequestId
  const controller = signal ? null : new AbortController()
  const requestSignal = signal ?? controller?.signal

  if (signal) {
    abortAuthorRequest()
  } else if (controller) {
    abortAuthorRequest()
    authorController = controller
  }

  isLoading.value = true
  error.value = null

  // 先从缓存加载（快速显示）
  const cached = await authorCache.getAuthor(targetAuthorId)
  if (requestSignal?.aborted || requestId !== latestRequestId) return

  if (cached) {
    author.value = cached.data as AuthorResponse
    syncAuthorMeta(author.value)
  }

  try {
    const [authorRes, postsRes] = await Promise.all([
      authorService.getAuthor(
        targetAuthorId,
        requestSignal ? { signal: requestSignal, skipErrorToast: true } : { skipErrorToast: true }
      ),
      authorService.listAuthorPosts(
        targetAuthorId,
        1,
        24,
        requestSignal ? { signal: requestSignal, skipErrorToast: true } : { skipErrorToast: true }
      ),
    ])

    if (requestSignal?.aborted || requestId !== latestRequestId) return

    author.value = authorRes
    posts.value = postsRes.items
    dataSource.value = 'live'
    syncAuthorMeta(authorRes)

    // 写入缓存
    await authorCache.setAuthor(targetAuthorId, authorRes)
    await setPublicSnapshot(
      AUTHOR_DETAIL_SNAPSHOT_SCOPE,
      targetAuthorId ? { id: targetAuthorId } : {},
      {
        author: authorRes,
        posts: postsRes.items,
      }
    )
  } catch (err) {
    if (requestSignal?.aborted || isAbortError(err) || requestId !== latestRequestId) return

    if (isServiceUnavailableError(err)) {
      const cachedSnapshot = await getPublicSnapshot<{
        author: AuthorResponse
        posts: PostListItem[]
      }>(AUTHOR_DETAIL_SNAPSHOT_SCOPE, { id: targetAuthorId })
      if (cachedSnapshot) {
        author.value = cachedSnapshot.author
        posts.value = cachedSnapshot.posts
        dataSource.value = 'cached'
        error.value = null
        syncAuthorMeta(cachedSnapshot.author)
        return
      }

      const fallbackAuthor = getFallbackAuthorById(targetAuthorId)
      if (fallbackAuthor) {
        const fallbackPosts = getFallbackAuthorPosts(targetAuthorId, 1, 24)
        author.value = fallbackAuthor
        posts.value = fallbackPosts.items
        dataSource.value = 'fallback'
        error.value = null
        syncAuthorMeta(fallbackAuthor)
        return
      }
    }

    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    if (!requestSignal?.aborted && requestId === latestRequestId) {
      isLoading.value = false
    }
    if (authorController === controller) {
      authorController = null
    }
  }
}

function goToPost(postId: string, thumbnailSrc: string | null) {
  storePostNavigationContext(posts.value, postId, 'author')
  cachePostThumbnailPreview(postId, thumbnailSrc)
  router.push(`/post/${postId}`)
}

watch(
  authorId,
  (nextAuthorId) => {
    const controller = new AbortController()
    void fetchAuthor(nextAuthorId, controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  latestRequestId += 1
  abortAuthorRequest()
  isLoading.value = false
})
</script>

<style scoped>
.author-detail-page {
  padding: var(--spacing-4) 0;
}

.container {
  display: grid;
  gap: var(--spacing-4);
}

.fallback-preview {
  display: grid;
  gap: var(--spacing-2);
}

.fallback-preview__label {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.fallback-preview p {
  margin: 0;
  max-width: 52ch;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.fallback-preview__detail {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.author-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.author-avatar {
  --avatar-size: 4.5rem;
}

@media (min-width: 768px) {
  .author-header {
    gap: var(--spacing-5);
  }

  .author-avatar {
    --avatar-size: 5.5rem;
  }
}

.author-section-title {
  font-size: var(--text-lg);
  margin: 0;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: var(--spacing-3);
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
