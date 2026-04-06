<template>
  <div class="community-page">
    <div class="container">
      <!-- Header -->
      <PageHeroShell class="community-hero" bare>
        <template #heading>
          <div>
            <h1 class="page-hero-shell__title">{{ $t('community.title') }}</h1>
            <p class="page-hero-shell__subtitle">{{ $t('community.subtitle') }}</p>
          </div>
        </template>

        <template #actions>
          <div class="community-hero__actions">
            <div class="discussion-search page-input-shell page-input-shell--comfortable">
              <AnimatedIcon name="search" :fallback-icon="Search" size="sm" />
              <input
                v-model="searchQuery"
                type="search"
                class="discussion-search-input"
                :placeholder="$t('community.searchPlaceholder')"
                :aria-label="$t('community.searchPlaceholder')"
                @keydown.escape="clearSearch"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="search-clear-btn page-input-shell__action"
                :aria-label="$t('common.clear')"
                @click="clearSearch"
              >
                <AnimatedIcon name="explore" :fallback-icon="X" size="sm" />
              </button>
            </div>
            <ControlButton
              class="guide-trigger"
              size="square"
              icon-only
              :aria-label="$t('community.guideTitle')"
              @click="showGuide = true"
            >
              <template #start>
                <AnimatedIcon name="sparkle" :fallback-icon="HelpCircle" size="sm" />
              </template>
            </ControlButton>
          </div>
        </template>

        <PageToolbar v-if="!searchQuery" class="community-tabs page-toolbar-shell--comfortable">
          <ControlButton
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :pressed="activeTab === tab.id"
            @click="switchTab(tab.id)"
          >
            <template #start>
              <AnimatedIcon name="explore" :fallback-icon="tab.icon" size="sm" />
            </template>
            <span>{{ tab.label }}</span>
          </ControlButton>
        </PageToolbar>

        <template #meta>
          <PageMetaRow v-if="!searchQuery" class="community-hero__meta page-meta-row--comfortable">
            <PageMetaChip>
              <strong>{{ $t('community.recentDiscussions') }}</strong>
              {{ $t('community.guidePoint1') }}
            </PageMetaChip>
            <PageMetaChip>
              <strong>{{ $t('community.hotTopics') }}</strong>
              {{ $t('community.guidePoint2') }}
            </PageMetaChip>
            <PageMetaChip>
              <strong>{{ $t('community.guideTitle') }}</strong>
              {{ $t('community.guidePoint3') }}
            </PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <!-- Community Guide Dialog -->
      <Dialog v-model:isOpen="showGuide" :title="$t('community.guideTitle')" size="sm">
        <div class="guide-dialog-body">
          <p class="guide-text">{{ $t('community.guideDescription') }}</p>
          <ul class="guide-list">
            <li>{{ $t('community.guidePoint1') }}</li>
            <li>{{ $t('community.guidePoint2') }}</li>
            <li>{{ $t('community.guidePoint3') }}</li>
          </ul>
        </div>
      </Dialog>

      <!-- Search Results -->
      <section v-if="searchQuery" class="community-section">
        <h2 class="sr-only">{{ $t('community.searchPlaceholder') }}</h2>

        <div v-if="isSearching" class="loading-state">
          <div class="spinner" />
        </div>
        <StateIndicator
          v-else-if="searchError && !isUsingSearchFallback"
          variant="error"
          :description="searchError"
          @action="() => searchDiscussions(searchQuery.trim())"
        />
        <StateIndicator
          v-else-if="searchResults.length === 0 && searchQuery.trim()"
          variant="empty"
          :description="$t('common.noResults')"
        />
        <div v-else class="discussions-list">
          <article
            v-for="discussion in searchResults"
            :key="discussion.id"
            class="discussion-card page-list-card content-auto-sm"
            role="button"
            tabindex="0"
            @click="goToDiscussion(discussion.id)"
            @keydown.enter.prevent="goToDiscussion(discussion.id)"
            @keydown.space.prevent="goToDiscussion(discussion.id)"
          >
            <div class="discussion-content">
              <h3 class="discussion-title">{{ discussion.title }}</h3>
              <p class="discussion-excerpt">{{ discussion.content }}</p>
              <div class="discussion-meta">
                <span class="comment-count">
                  <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                  {{ discussion.comments_count }}
                </span>
                <span class="discussion-time">{{
                  formatTime(discussion.updated_at || discussion.created_at)
                }}</span>
              </div>
            </div>
          </article>

          <LoadMoreSection
            v-if="searchResults.length > 0"
            :count="searchResults.length"
            :total="undefined"
            :has-more="searchHasMore"
            :loading="isSearchingMore"
            :sentinel-ref="setSentinelRef"
            @load-more="loadMore"
          />
        </div>
      </section>

      <template v-if="!searchQuery">
        <!-- Discussion Composer -->
        <DiscussionComposer
          v-if="isAuthenticated"
          class="composer-section"
          @created="handleDiscussionCreated"
        />
        <div v-else class="login-prompt surface-editorial">
          <div class="login-prompt__content">
            <p class="login-prompt__title">{{ $t('community.loginToPost') }}</p>
            <ul class="login-prompt__list">
              <li>{{ $t('community.guidePoint1') }}</li>
              <li>{{ $t('community.guidePoint2') }}</li>
              <li>{{ $t('community.guidePoint3') }}</li>
            </ul>
          </div>
          <div class="login-prompt__actions">
            <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
            <ControlButton class="login-prompt__secondary" size="compact" @click="goToExplore">
              {{ $t('nav.explore') }}
            </ControlButton>
          </div>
        </div>

        <!-- Recent Discussions -->
        <section v-if="activeTab === 'recent'" class="community-section content-auto-xl">
          <div class="page-section-head">
            <div class="page-section-copy">
              <p class="page-section-kicker">{{ $t('nav.community') }}</p>
              <h2 class="page-section-title">{{ $t('community.recentDiscussions') }}</h2>
              <p class="page-section-subtitle">{{ $t('community.guidePoint1') }}</p>
            </div>
          </div>

          <div v-if="isLoading && discussions.length === 0" class="loading-state">
            <div class="spinner" />
          </div>
          <StateIndicator
            v-else-if="error && !isUsingRecentFallback"
            variant="error"
            :description="error"
            @action="fetchDiscussions"
          />
          <StateIndicator
            v-else-if="discussions.length === 0"
            variant="empty"
            :description="$t('common.noResults')"
          />
          <div v-else class="discussions-list">
            <article
              v-for="discussion in discussions"
              :key="discussion.id"
              class="discussion-card page-list-card content-auto-sm"
              role="button"
              tabindex="0"
              @click="goToDiscussion(discussion.id)"
              @keydown.enter.prevent="goToDiscussion(discussion.id)"
              @keydown.space.prevent="goToDiscussion(discussion.id)"
              @mouseenter="prefetchDiscussionDetailPage"
            >
              <div
                class="discussion-thumbnail"
                v-if="discussion.referenced_post && discussion.referenced_post.thumbnail_url"
              >
                <ThumbnailImage
                  :src="discussion.referenced_post.thumbnail_url"
                  :sizes="thumbnailSizes"
                  :alt="discussion.referenced_post.title"
                  width="80"
                  height="80"
                  responsive
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div class="discussion-content">
                <div class="discussion-title-row">
                  <h3 class="discussion-title">{{ discussion.title }}</h3>
                  <span v-if="discussion.is_pinned" class="discussion-pin">{{
                    $t('community.pinned')
                  }}</span>
                </div>
                <p class="discussion-excerpt">{{ discussion.content }}</p>
                <div class="discussion-meta">
                  <span class="comment-count">
                    <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                    {{ discussion.comments_count }}
                  </span>
                  <span class="discussion-time">{{
                    formatTime(discussion.updated_at || discussion.created_at)
                  }}</span>
                </div>
                <div v-if="discussion.tags.length > 0" class="discussion-tags">
                  <span v-for="tag in discussion.tags" :key="tag" class="discussion-tag glass-tag">
                    #{{ tag }}
                  </span>
                </div>
                <ReferencedPostPreview
                  v-if="discussion.referenced_post"
                  :post="discussion.referenced_post"
                  compact
                />
                <div class="discussion-author">
                  <Avatar
                    :src="resolveAvatarSrc(discussion.author.avatar_url)"
                    :alt="discussion.author.username"
                    class="author-avatar"
                    size="custom"
                    loading="lazy"
                    decoding="async"
                    :fallback="getAvatarFallbackLabel(discussion.author.username)"
                  />
                  <span class="author-name">{{ discussion.author.username }}</span>
                </div>
              </div>
            </article>

            <LoadMoreSection
              v-if="discussions.length > 0"
              :count="discussions.length"
              :total="total ?? undefined"
              :has-more="hasMore"
              :loading="isLoadingMore"
              :sentinel-ref="setSentinelRef"
              @load-more="loadMore"
            />
          </div>
        </section>

        <!-- Hot Topics -->
        <section v-if="activeTab === 'hot'" class="community-section content-auto-xl">
          <div class="page-section-head">
            <div class="page-section-copy">
              <p class="page-section-kicker">{{ $t('community.guideTitle') }}</p>
              <h2 class="page-section-title">{{ $t('community.hotTopics') }}</h2>
              <p class="page-section-subtitle">{{ $t('community.guidePoint2') }}</p>
            </div>
          </div>

          <div v-if="isLoadingHot && hotTopics.length === 0" class="hot-topics-grid">
            <article v-for="i in 6" :key="i" class="topic-card page-list-card">
              <div class="topic-rank">#{{ i }}</div>
              <div class="topic-content">
                <Skeleton width="80%" height="20px" />
                <Skeleton width="50%" height="14px" />
              </div>
            </article>
          </div>
          <StateIndicator
            v-else-if="hotTopicsError && !isUsingHotFallback && hotTopics.length === 0"
            variant="error"
            :description="hotTopicsError"
            @action="fetchHotTopics"
          />
          <StateIndicator
            v-else-if="hotTopics.length === 0"
            variant="empty"
            :description="$t('community.noHotTopics')"
          />
          <div v-else class="hot-topics-grid">
            <article
              v-for="(topic, index) in hotTopics"
              :key="topic.id"
              class="topic-card page-list-card"
              role="button"
              tabindex="0"
              @click="goToHotTopic(topic.route)"
              @keydown.enter.prevent="goToHotTopic(topic.route)"
              @keydown.space.prevent="goToHotTopic(topic.route)"
            >
              <div class="topic-rank">#{{ index + 1 }}</div>
              <div class="topic-content">
                <h3 class="topic-title">{{ topic.title }}</h3>
                <div class="topic-meta">
                  <span class="topic-count">
                    <AnimatedIcon name="sparkle" :fallback-icon="MessageSquare" size="sm" />
                    {{ topic.commentsCount }}
                  </span>
                  <span class="topic-platform">{{ topic.platformLabel }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CommunityPage' })

import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  onActivated,
  onDeactivated,
  watch,
  onWatcherCleanup,
} from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MessageSquare, Flame, HelpCircle, Search, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useDiscussionsStore } from '@/stores'
import { discussionService, communityService, type Discussion, ApiError } from '@/api'
import { getAvatarFallbackLabel, resolveAvatarSrc } from '@/utils/avatarPresentation'
import { formatRelativeTime } from '@/utils/date'
import { getPublicSnapshot, setPublicSnapshot } from '@/utils/cache'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import { useForwardedElementRef } from '@/composables/useForwardedElementRef'
import {
  getFallbackHotTopics,
  searchFallbackDiscussionsCursor,
} from '@/fallbacks/communityFallback'
import {
  isServiceUnavailableError,
  type PublicPageDataSource,
} from '@/fallbacks/publicPageFallback'
import Button from '@/components/ui/Button.vue'
import LoadMoreSection from '@/components/ui/LoadMoreSection.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import ThumbnailImage from '@/components/ui/ThumbnailImage.vue'
import Avatar from '@/components/ui/Avatar.vue'
import DiscussionComposer from '@/components/community/DiscussionComposer.vue'
import ReferencedPostPreview from '@/components/community/ReferencedPostPreview.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageHeroShell from '@/components/appearance/PageHeroShell.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
import PageMetaRow from '@/components/appearance/PageMetaRow.vue'
import PageToolbar from '@/components/appearance/PageToolbar.vue'
import Dialog from '@/components/ui/Dialog.vue'

const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const discStore = useDiscussionsStore()
const { isAuthenticated } = storeToRefs(authStore)

const showGuide = ref(false)
const activeTab = ref('recent')
const isPageActive = ref(true)

const discussions = computed(() => discStore.items)
const isLoading = computed(() => discStore.isLoading)
const error = computed(() => (discStore.error ? t(discStore.error) : null))
const total = computed(() => discStore.total)
const hasMore = computed(() => discStore.hasMore)
const isLoadingMore = computed(() => discStore.isLoading && discStore.items.length > 0)
const isUsingRecentFallback = computed(() => discStore.source === 'fallback')

// Discussion search (local state - not in store)
const searchQuery = ref('')
const searchResults = ref<Discussion[]>([])
const isSearching = ref(false)
const isSearchingMore = ref(false)
const searchError = ref<string | null>(null)
const searchSource = ref<PublicPageDataSource>('live')
const searchNextCursor = ref<string | null>(null)
const searchHasMore = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestToken = 0

type HotTopicCard = {
  id: string
  title: string
  commentsCount: number
  platformLabel: string
  route: string
}

// Hot topics (local state)
const isLoadingHot = ref(false)
const hotTopicsError = ref<string | null>(null)
const hotTopics = ref<HotTopicCard[]>([])
const hotTopicsSource = ref<PublicPageDataSource>('live')
let hotTopicsController: AbortController | null = null
let hotTopicsRequestToken = 0

const { elementRef: sentinelRef, setElementRef: setSentinelRef } =
  useForwardedElementRef<HTMLElement>()

const thumbnailSizes = '(max-width: 640px) 60px, 80px'

let hasPrefetchedDiscussionDetailPage = false

const tabs = computed(() => [
  { id: 'recent' as const, label: t('community.recentDiscussions'), icon: MessageSquare },
  { id: 'hot' as const, label: t('community.hotTopics'), icon: Flame },
])
const isUsingSearchFallback = computed(() => searchSource.value === 'fallback')
const isUsingHotFallback = computed(() => hotTopicsSource.value === 'fallback')
const COMMUNITY_HOT_TOPICS_SNAPSHOT_SCOPE = 'community/hot-topics'
const COMMUNITY_SEARCH_SNAPSHOT_SCOPE = 'community/search'

function switchTab(tabId: string) {
  activeTab.value = tabId
  if (tabId === 'hot' && hotTopics.value.length === 0) {
    void fetchHotTopics()
  }
}

function handleDiscussionCreated() {
  void discStore.fetchDiscussions(true)
}

function prefetchDiscussionDetailPage() {
  if (hasPrefetchedDiscussionDetailPage) return
  hasPrefetchedDiscussionDetailPage = true
  import('@/views/DiscussionDetailPage.vue').catch(() => {})
}

function formatTime(dateStr: string): string {
  return formatRelativeTime(dateStr, t)
}

function goToDiscussion(discussionId: string) {
  router.push(`/community/discussions/${discussionId}`)
}

function goToHotTopic(routePath: string) {
  router.push(routePath)
}

function goToLogin() {
  router.push('/login')
}

function goToExplore() {
  router.push('/explore')
}

async function fetchDiscussions(): Promise<boolean> {
  return discStore.fetchDiscussions(true)
}

async function loadMore(): Promise<boolean> {
  if (searchQuery.value.trim()) {
    if (!searchHasMore.value || isSearching.value || isSearchingMore.value) return false
    return searchDiscussions(searchQuery.value.trim(), undefined, undefined, false)
  }
  if (!hasMore.value || isLoading.value) return false
  return discStore.loadMore()
}

async function fetchHotTopics() {
  hotTopicsController?.abort()
  const controller = new AbortController()
  hotTopicsController = controller
  const requestToken = ++hotTopicsRequestToken
  isLoadingHot.value = true
  hotTopicsError.value = null

  try {
    const res = await communityService.getTrending(
      '7d',
      { limit: 6 },
      {
        signal: controller.signal,
        skipErrorToast: true,
      }
    )
    if (controller.signal.aborted || requestToken !== hotTopicsRequestToken) return
    hotTopics.value = res.items.slice(0, 6).map((topic) => ({
      id: topic.post_id,
      title: topic.title || t('community.hotTopics'),
      commentsCount: topic.comment_count,
      platformLabel: topic.platform,
      route: topic.post_id ? `/post/${topic.post_id}` : '/community',
    }))
    hotTopicsSource.value = 'live'
    await setPublicSnapshot(COMMUNITY_HOT_TOPICS_SNAPSHOT_SCOPE, { limit: 6 }, hotTopics.value)
  } catch (err) {
    if (
      controller.signal.aborted ||
      (err instanceof DOMException && err.name === 'AbortError') ||
      requestToken !== hotTopicsRequestToken
    ) {
      return
    }
    const cachedTopics = await getPublicSnapshot<HotTopicCard[]>(
      COMMUNITY_HOT_TOPICS_SNAPSHOT_SCOPE,
      {
        limit: 6,
      }
    )
    hotTopics.value =
      cachedTopics ??
      getFallbackHotTopics(6).map((topic) => ({
        id: topic.id,
        title: topic.title,
        commentsCount: topic.comments_count,
        platformLabel: topic.category,
        route: topic.referenced_post?.id
          ? `/post/${topic.referenced_post.id}`
          : `/community/discussions/${topic.id}`,
      }))
    hotTopicsSource.value = cachedTopics ? 'cached' : 'fallback'
    hotTopicsError.value = null
    if (hotTopics.value.length > 0 || isServiceUnavailableError(err)) {
      return
    }
    if (err instanceof ApiError) {
      hotTopicsError.value = err.message
    } else {
      hotTopicsError.value = t('common.error')
    }
  } finally {
    if (requestToken === hotTopicsRequestToken) {
      isLoadingHot.value = false
      if (hotTopicsController === controller) {
        hotTopicsController = null
      }
    }
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  isSearching.value = false
  isSearchingMore.value = false
  searchError.value = null
  searchSource.value = 'live'
  searchNextCursor.value = null
  searchHasMore.value = false
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
}

function cleanupCommunityTransientState() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  searchRequestToken += 1
  isSearching.value = false
  isSearchingMore.value = false
  searchNextCursor.value = null
  searchHasMore.value = false
  hotTopicsRequestToken += 1
  hotTopicsController?.abort()
  hotTopicsController = null
  isLoadingHot.value = false
}

async function searchDiscussions(
  q: string,
  signal?: AbortSignal,
  requestToken?: number,
  reset = true
) {
  const token = requestToken ?? ++searchRequestToken
  const requestCursor = reset ? null : searchNextCursor.value
  if (reset) {
    isSearching.value = true
    searchError.value = null
  } else {
    isSearchingMore.value = true
  }
  try {
    const res = await discussionService.search(
      q,
      { limit: 20, cursor: requestCursor },
      signal ? { signal } : undefined
    )
    if (signal?.aborted || token !== searchRequestToken) return
    if (reset) {
      searchResults.value = res.items
    } else {
      const existingIds = new Set(searchResults.value.map((item) => item.id))
      searchResults.value = [
        ...searchResults.value,
        ...res.items.filter((item) => !existingIds.has(item.id)),
      ]
    }
    searchSource.value = 'live'
    searchNextCursor.value = res.next_cursor ?? null
    searchHasMore.value = Boolean(res.has_more && res.next_cursor)
    await setPublicSnapshot(
      COMMUNITY_SEARCH_SNAPSHOT_SCOPE,
      { q, cursor: requestCursor, limit: 20 },
      res
    )
  } catch (err: unknown) {
    if (
      signal?.aborted ||
      (err instanceof DOMException && err.name === 'AbortError') ||
      token !== searchRequestToken
    ) {
      return
    }
    if (isServiceUnavailableError(err)) {
      const snapshotKey = { q, cursor: requestCursor, limit: 20 }
      const cachedResults = await getPublicSnapshot<{
        items: Discussion[]
        next_cursor?: string | null
        has_more: boolean
      }>(COMMUNITY_SEARCH_SNAPSHOT_SCOPE, snapshotKey)
      const fallbackRes = searchFallbackDiscussionsCursor(q, {
        limit: 20,
        cursor: requestCursor,
      })
      const resolved = cachedResults ?? fallbackRes
      if (reset) {
        searchResults.value = resolved.items
      } else {
        const existingIds = new Set(searchResults.value.map((item) => item.id))
        searchResults.value = [
          ...searchResults.value,
          ...resolved.items.filter((item) => !existingIds.has(item.id)),
        ]
      }
      searchSource.value = cachedResults ? 'cached' : 'fallback'
      searchNextCursor.value = resolved.next_cursor ?? null
      searchHasMore.value = Boolean(resolved.has_more && resolved.next_cursor)
      searchError.value = null
      return
    }
    searchError.value = err instanceof ApiError ? err.message : t('common.error')
  } finally {
    if (token === searchRequestToken) {
      isSearching.value = false
      isSearchingMore.value = false
    }
  }
}

watch(
  () => searchQuery.value.trim(),
  (query) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }

    if (!query) {
      searchRequestToken += 1
      searchResults.value = []
      isSearching.value = false
      isSearchingMore.value = false
      searchError.value = null
      searchSource.value = 'live'
      searchNextCursor.value = null
      searchHasMore.value = false
      return
    }

    const controller = new AbortController()
    const requestToken = ++searchRequestToken

    searchDebounceTimer = setTimeout(() => {
      void searchDiscussions(query, controller.signal, requestToken)
    }, 350)

    onWatcherCleanup(() => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
        searchDebounceTimer = null
      }
      controller.abort()
    })
  }
)

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '800px',
  enabled: () =>
    isPageActive.value &&
    ((searchQuery.value.trim() &&
      searchHasMore.value &&
      !isSearching.value &&
      !isSearchingMore.value) ||
      (!searchQuery.value.trim() &&
        activeTab.value === 'recent' &&
        hasMore.value &&
        !isLoading.value &&
        !isLoadingMore.value)),
})

onMounted(() => {
  if (discStore.items.length === 0) {
    void discStore.fetchDiscussions(true)
  }
})

onActivated(() => {
  isPageActive.value = true
  if (activeTab.value === 'recent' && discStore.items.length === 0) {
    void discStore.fetchDiscussions(true)
  }
})

onDeactivated(() => {
  isPageActive.value = false
  cleanupCommunityTransientState()
})

onUnmounted(() => {
  cleanupCommunityTransientState()
})
</script>

<style scoped>
.community-page {
  position: relative;
  padding: var(--spacing-4) 0 var(--spacing-8);
  min-height: 100svh;
  min-height: 100dvh;
}

.community-hero__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  min-inline-size: 0;
}

.discussion-search {
  flex: 1 1 14rem;
  max-inline-size: min(100%, 20rem);
  min-inline-size: 0;
}

.discussion-search-input {
  flex: 1 1 auto;
  appearance: none;
  border: none;
  background: transparent;
  outline: none;
  min-inline-size: 0;
  inline-size: 100%;
  max-inline-size: 100%;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.discussion-search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-clear-btn {
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .community-hero__actions {
    inline-size: 100%;
    justify-content: space-between;
    flex-wrap: nowrap;
  }

  .discussion-search {
    inline-size: 100%;
    max-inline-size: none;
  }

  .community-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tab-btn {
    min-inline-size: 0;
  }
}

.guide-trigger {
  flex-shrink: 0;
}

.guide-dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.guide-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.guide-list {
  display: grid;
  gap: var(--spacing-2);
  padding-left: var(--spacing-5);
  margin: 0;
  list-style: disc;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.composer-section {
  margin-bottom: var(--spacing-4);
}

.login-prompt {
  display: grid;
  gap: var(--spacing-4);
  padding: clamp(1.25rem, 2vw, 1.75rem);
  margin-bottom: var(--spacing-4);
  text-align: left;
}

.login-prompt__content {
  display: grid;
  gap: var(--spacing-3);
}

.login-prompt__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.login-prompt__list {
  display: grid;
  gap: var(--spacing-2);
  padding-inline-start: 1.1rem;
  list-style: disc;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.login-prompt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.login-prompt__secondary {
  white-space: nowrap;
}

.community-tabs {
  display: flex;
  width: 100%;
  margin-bottom: 0;
  gap: var(--spacing-2);
}

.community-hero__meta {
  margin-top: 0.25rem;
}

.tab-btn {
  flex: 1 1 0;
  text-align: center;
  min-inline-size: 0;
}

.community-section {
  min-height: 18.75rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--spacing-12);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.discussions-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
}

@media (min-width: 768px) {
  .discussions-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .discussions-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.discussion-card {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  cursor: pointer;
  min-inline-size: 0;
  min-block-size: 10rem;
}

.discussion-thumbnail {
  inline-size: 5rem;
  block-size: 5rem;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  flex-shrink: 0;
}

.discussion-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.discussion-content {
  flex: 1;
  min-inline-size: 0;
  min-block-size: 100%;
  display: grid;
  gap: var(--spacing-2);
  align-content: start;
}

.discussion-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.discussion-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.discussion-pin {
  font-size: var(--text-xs);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-primary-rgb), 0.12);
  color: var(--color-primary);
}

.discussion-excerpt {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.discussion-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.comment-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.discussion-author {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-top: 0;
}

.discussion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin: 0;
}

.discussion-tag {
  font-size: var(--text-xs);
}

.author-avatar {
  --avatar-size: 1.25rem;
  border: 0;
}

.author-name {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.latest-comment {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
}

.comment-avatar {
  width: 1.5rem;
  height: 1.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
}

.comment-preview {
  flex: 1;
  min-width: 0;
}

.comment-author {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.comment-text {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hot-topics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
}

@media (min-width: 640px) {
  .hot-topics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .hot-topics-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.topic-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  cursor: pointer;
  min-inline-size: 0;
  min-block-size: 5.75rem;
}

.topic-rank {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  min-inline-size: 2.5rem;
}

.topic-content {
  min-inline-size: 0;
  flex: 1;
  display: grid;
  gap: var(--spacing-2);
}

.topic-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.topic-count {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.topic-platform {
  color: var(--color-text-tertiary);
  text-transform: capitalize;
}

.my-comments-list,
.saved-comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.comment-item {
  padding: var(--spacing-4);
}

@media (max-width: 640px) {
  .discussion-thumbnail {
    inline-size: 3.75rem;
    block-size: 3.75rem;
  }
}
</style>
