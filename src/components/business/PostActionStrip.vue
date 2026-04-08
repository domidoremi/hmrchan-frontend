<template>
  <div class="post-action-strip" :class="`post-action-strip--${variant}`">
    <span v-if="subtitlesAvailable" class="subtitles-pill" :title="t('post.subtitlesAvailable')">
      CC
      <span v-if="showLabels" class="subtitles-pill__text">
        {{ t('post.subtitlesAvailable') }}
      </span>
      <span v-else class="sr-only">
        {{ t('post.subtitlesAvailable') }}
      </span>
    </span>

    <button
      v-if="showFavorite"
      type="button"
      class="action-btn"
      :class="{ active: isFavorited }"
      :disabled="!isAuthenticated || isFavoriteLoading"
      :aria-label="isFavorited ? t('post.unfavorite') : t('post.favorite')"
      :aria-pressed="isFavorited"
      @click="toggleFavorite"
    >
      <AnimatedIcon name="heart" :fallback-icon="Bookmark" size="md" :active="isFavorited" />
      <span v-if="showLabels">{{ isFavorited ? t('post.unfavorite') : t('post.favorite') }}</span>
      <span v-else class="sr-only">{{
        isFavorited ? t('post.unfavorite') : t('post.favorite')
      }}</span>
    </button>

    <button
      v-if="showShare"
      type="button"
      class="action-btn"
      :aria-label="t('post.share')"
      @click="sharePost"
    >
      <AnimatedIcon name="explore" :fallback-icon="Share2" size="md" />
      <span v-if="showLabels">{{ t('post.share') }}</span>
      <span v-else class="sr-only">{{ t('post.share') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onWatcherCleanup, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Bookmark, Share2 } from '@lucide/vue'
import { favoriteService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { copyToClipboard } from '@/utils/modernAPIs'

const props = withDefaults(
  defineProps<{
    postId: string
    variant?: 'default' | 'compact'
    showFavorite?: boolean
    showShare?: boolean
    subtitlesAvailable?: boolean
  }>(),
  {
    variant: 'default',
    showFavorite: true,
    showShare: true,
    subtitlesAvailable: false,
  }
)

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { isAuthenticated } = storeToRefs(authStore)
const { t } = useI18n()

const showLabels = computed(() => props.variant === 'default')

const isFavorited = ref(false)
const isFavoriteLoading = ref(false)
let favoriteStatusController: AbortController | null = null
let favoriteStatusToken = 0

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError'
  return error instanceof Error && /abort/i.test(error.message)
}

function abortFavoriteStatusRequest() {
  if (favoriteStatusController) {
    favoriteStatusController.abort()
    favoriteStatusController = null
  }
  favoriteStatusToken += 1
}

async function fetchFavoriteStatus(signal?: AbortSignal) {
  const postId = props.postId
  if (!postId) return

  if (!isAuthenticated.value) {
    abortFavoriteStatusRequest()
    isFavorited.value = false
    return
  }

  const controller = signal ? null : new AbortController()
  if (controller) {
    if (favoriteStatusController) {
      favoriteStatusController.abort()
    }
    favoriteStatusController = controller
  }
  const activeSignal = signal ?? controller?.signal
  const requestToken = ++favoriteStatusToken

  try {
    const res = await favoriteService.check(
      postId,
      activeSignal ? { signal: activeSignal } : undefined
    )
    if (activeSignal?.aborted || requestToken !== favoriteStatusToken) return
    isFavorited.value = res.is_favorited
  } catch (error) {
    if (activeSignal?.aborted || isAbortError(error) || requestToken !== favoriteStatusToken) return
    isFavorited.value = false
  } finally {
    if (
      controller &&
      favoriteStatusController === controller &&
      requestToken === favoriteStatusToken
    ) {
      favoriteStatusController = null
    }
  }
}

watch(
  [() => props.postId, isAuthenticated],
  () => {
    const controller = new AbortController()
    void fetchFavoriteStatus(controller.signal)
    onWatcherCleanup(() => controller.abort())
  },
  { immediate: true }
)

async function toggleFavorite() {
  if (!isAuthenticated.value) return
  if (isFavoriteLoading.value) return
  abortFavoriteStatusRequest()

  isFavoriteLoading.value = true

  try {
    if (isFavorited.value) {
      await favoriteService.removeByPostId(props.postId)
      isFavorited.value = false
      toastStore.success(t('post.unfavorite'))
      return
    }

    await favoriteService.create(props.postId)
    isFavorited.value = true
    toastStore.success(t('post.favorite'))
  } catch (err) {
    if (err instanceof ApiError) {
      // 502 网关错误特殊处理
      if (err.message.includes('502') || err.message.includes('网关')) {
        toastStore.error(t('post.favoriteServerError'))
      } else {
        toastStore.error(err.message)
      }
    } else {
      toastStore.error(t('common.error'))
    }

    // 离线时添加到队列
    if (!navigator.onLine) {
      const { addOfflineAction } = await import('@/utils/cache/offlineQueue')
      const actionType = isFavorited.value ? 'unfavorite' : 'favorite'
      await addOfflineAction(actionType, props.postId)
      toastStore.info(t('post.offlineQueued'))
    }
  } finally {
    isFavoriteLoading.value = false
  }
}

onBeforeUnmount(() => {
  abortFavoriteStatusRequest()
})

async function sharePost() {
  if (typeof window === 'undefined' || !props.postId) return

  const href = router.resolve({ path: `/post/${props.postId}` }).href
  const url = new URL(href, window.location.origin).toString()

  if (await copyToClipboard(url)) {
    toastStore.success(t('comment.shareSuccess'))
    return
  }
  toastStore.error(t('common.error'))
}
</script>

<style scoped>
:global(#app[data-color-mode='dark'] .post-action-strip) {
  --action-text: rgba(255, 255, 255, 0.88);
  --action-bg: rgba(255, 255, 255, 0.08);
  --action-border: rgba(255, 255, 255, 0.16);
  --action-hover-bg: rgba(255, 255, 255, 0.14);
  --action-pill-bg: rgba(255, 255, 255, 0.1);
  --action-pill-border: rgba(255, 255, 255, 0.18);
  --action-active-text: #fff;
  --action-active-bg: rgba(255, 255, 255, 0.18);
  --action-active-border: rgba(255, 255, 255, 0.45);
}
.post-action-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
  --action-text: rgba(15, 23, 42, 0.86);
  --action-bg: rgba(15, 23, 42, 0.06);
  --action-border: rgba(15, 23, 42, 0.12);
  --action-hover-bg: rgba(15, 23, 42, 0.1);
  --action-pill-bg: rgba(15, 23, 42, 0.08);
  --action-pill-border: rgba(15, 23, 42, 0.14);
  --action-active-text: rgba(var(--color-primary-rgb), 0.95);
  --action-active-bg: rgba(var(--color-primary-rgb), 0.12);
  --action-active-border: rgba(var(--color-primary-rgb), 0.45);
}

.subtitles-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-block-size: calc(var(--appearance-chip-min-block-size) - 0.75rem);
  padding-block: 0.25rem;
  padding-inline: max(0.75rem, calc(var(--appearance-chip-padding-inline) * 0.72));
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  line-height: var(--appearance-ui-line-height);
  color: var(--action-text);
  background: var(--action-pill-bg);
  border: 1px solid var(--action-pill-border);
  white-space: nowrap;
}

.subtitles-pill__text {
  font-size: 0.6875rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-height: var(--ui-control-min-size, 2.75rem);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--action-text);
  background: var(--action-bg);
  border: 1px solid var(--action-border);
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--action-hover-bg);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  color: var(--action-active-text);
  border-color: var(--action-active-border);
  background: var(--action-active-bg);
}

.action-btn.active :deep(.animated-icon__fallback) {
  fill: currentColor;
}

.post-action-strip--compact .action-btn {
  padding: var(--spacing-2) var(--spacing-3);
}

.post-action-strip--compact .subtitles-pill {
  padding-block: 0.1875rem;
  padding-inline: max(0.625rem, calc(var(--appearance-chip-padding-inline) * 0.64));
}
</style>
