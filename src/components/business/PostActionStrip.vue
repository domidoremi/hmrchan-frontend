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
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Bookmark, Share2 } from 'lucide-vue-next'
import { favoriteService, ApiError } from '@/api'
import { useAuthStore, useToastStore } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

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
const favoriteId = ref<number | null>(null)
const isFavoriteLoading = ref(false)

let checkSeq = 0

async function fetchFavoriteStatus() {
  const postId = props.postId
  if (!postId) return

  if (!isAuthenticated.value) {
    isFavorited.value = false
    favoriteId.value = null
    return
  }

  const seq = ++checkSeq

  try {
    const res = await favoriteService.check(postId)
    if (seq !== checkSeq) return
    isFavorited.value = res.is_favorited
    favoriteId.value = res.favorite_id
  } catch {
    if (seq !== checkSeq) return
    isFavorited.value = false
    favoriteId.value = null
  }
}

watch([() => props.postId, isAuthenticated], fetchFavoriteStatus, { immediate: true })

async function toggleFavorite() {
  if (!isAuthenticated.value) return
  if (isFavoriteLoading.value) return

  isFavoriteLoading.value = true

  try {
    if (isFavorited.value) {
      const id = favoriteId.value
      if (id) {
        await favoriteService.remove(id)
      } else {
        const res = await favoriteService.check(props.postId)
        if (res.favorite_id) {
          await favoriteService.remove(res.favorite_id)
        }
      }
      isFavorited.value = false
      favoriteId.value = null
      toastStore.success(t('post.unfavorite'))
      return
    }

    const created = await favoriteService.create(props.postId)
    isFavorited.value = true
    favoriteId.value = created.id
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
      const data =
        isFavorited.value && favoriteId.value ? { favoriteId: favoriteId.value } : undefined
      await addOfflineAction(actionType, props.postId, data)
      toastStore.info(t('post.offlineQueued'))
    }
  } finally {
    isFavoriteLoading.value = false
  }
}

async function sharePost() {
  if (typeof window === 'undefined' || !props.postId) return

  const href = router.resolve({ path: `/post/${props.postId}` }).href
  const url = new URL(href, window.location.origin).toString()

  try {
    await navigator.clipboard.writeText(url)
    toastStore.success(t('comment.shareSuccess'))
  } catch {
    toastStore.error(t('common.error'))
  }
}
</script>

<style scoped>
:global(#app[data-theme='dark'] .post-action-strip) {
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
  padding: 0.25rem 0.625rem;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
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
  min-height: var(--ui-control-min-size, 44px);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  color: var(--action-text);
  background: var(--action-bg);
  border: 1px solid var(--action-border);
  white-space: nowrap;
  transition: all var(--transition-fast);
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
  padding: 0.1875rem 0.5rem;
}
</style>
