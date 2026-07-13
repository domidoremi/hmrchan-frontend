<template>
  <div
    class="hmr-route-page hmr-route-page--community"
    :class="{ 'is-preview': usingPreviewCommunity }"
  >
    <header class="hmr-page-hero hmr-page-hero--community">
      <div class="hmr-container">
        <p class="hmr-kicker">{{ t('community.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('community.title') }}</h1>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          :empty-title="t('community.previewTitle')"
          :empty-body="t('community.previewEmptyBody')"
          :error-title="t('community.previewTitle')"
          :error-body="t('community.previewErrorBody')"
          :retry-label="t('explore.loadMore')"
          @retry="refreshCommunity"
        />
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-community-board">
          <aside class="hmr-community-sidebar">
            <p class="hmr-kicker">{{ t('community.channels') }}</p>
            <button
              v-for="item in discussionTabs"
              :key="item.id"
              class="hmr-community-tab"
              :class="{ 'is-active': activeTab === item.id }"
              type="button"
              @click="activeTab = item.id"
            >
              <span>{{ item.label }}</span>
              <em>{{ item.count }}</em>
            </button>
          </aside>

          <main class="hmr-community-main" :aria-label="t('community.listLabel')">
            <div class="hmr-community-main-head">
              <div>
                <p class="hmr-kicker">{{ activeTabLabel }}</p>
                <h2 class="hmr-section-title">{{ t('community.topicTitle') }}</h2>
              </div>
              <RouterLink class="hmr-text-link" to="/explore">
                {{ t('community.openFromContent') }}
              </RouterLink>
            </div>

            <article
              v-if="!auth.isAuthenticated"
              class="community-priority-card surface-editorial"
              aria-labelledby="community-priority-card-title"
            >
              <div class="community-priority-card__copy">
                <h3 id="community-priority-card-title">{{ t('community.loginCtaTitle') }}</h3>
                <p>{{ t('community.loginCtaBody') }}</p>
                <div class="community-priority-card__actions">
                  <RouterLink
                    class="community-priority-card__action community-priority-card__action--primary"
                    :to="communityLoginTarget"
                  >
                    {{ t('community.loginCtaPrimary') }}
                  </RouterLink>
                  <RouterLink
                    class="community-priority-card__action community-priority-card__action--secondary"
                    to="/explore"
                  >
                    {{ t('community.loginCtaSecondary') }}
                  </RouterLink>
                </div>
              </div>
              <div class="community-priority-card__visual" aria-hidden="true">
                <span
                  class="community-priority-card__note community-priority-card__note--wide"
                ></span>
                <span
                  class="community-priority-card__note community-priority-card__note--compact"
                ></span>
              </div>
            </article>

            <div class="hmr-discussion-list">
              <template v-if="visibleThreads.length">
                <RouterLink
                  v-for="(item, index) in visibleThreads"
                  :key="item.id"
                  class="hmr-discussion-row"
                  :to="threadTarget(item)"
                >
                  <span class="hmr-discussion-index">{{ String(index + 1).padStart(2, '0') }}</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.excerpt }}</p>
                  </div>
                  <em>{{ item.metric }}</em>
                </RouterLink>
              </template>
              <article
                v-else
                v-for="(item, index) in communityPreviewThreads"
                :key="item.id"
                class="hmr-discussion-row hmr-discussion-row--preview"
              >
                <span class="hmr-discussion-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.excerpt }}</p>
                </div>
                <em>{{ item.metric }}</em>
              </article>
            </div>
          </main>

          <aside class="hmr-community-aside">
            <template v-if="content.stats.length">
              <div class="hmr-community-stat-card" v-for="item in content.stats" :key="item.id">
                <span>{{ item.metric }}</span>
                <strong>{{ item.title }}</strong>
                <p>{{ item.excerpt }}</p>
              </div>
            </template>
            <template v-else>
              <div
                class="hmr-community-stat-card hmr-community-stat-card--preview"
                v-for="item in communityPreviewStats"
                :key="item.id"
              >
                <span>{{ item.metric }}</span>
                <strong>{{ item.title }}</strong>
                <p>{{ item.excerpt }}</p>
              </div>
            </template>
          </aside>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--community" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">{{ t('community.hotTitle') }}</p>
            <h2 class="hmr-section-title">{{ t('community.risingTitle') }}</h2>
          </div>
          <RouterLink class="hmr-text-link hmr-text-link--light" to="/contact">
            {{ t('community.submitFeedback') }}
          </RouterLink>
        </div>

        <div class="hmr-community-hot-grid">
          <template v-if="hotThreads.length">
            <RouterLink
              v-for="item in hotThreads"
              :key="item.id"
              class="hmr-community-hot-card"
              :to="threadTarget(item)"
            >
              <span>{{ item.metric }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.excerpt }}</p>
            </RouterLink>
          </template>
          <article
            v-else
            v-for="item in communityPreviewHotThreads"
            :key="item.id"
            class="hmr-community-hot-card hmr-community-hot-card--preview"
          >
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head hmr-section-head--split">
          <div>
            <p class="hmr-kicker">{{ t('community.latestTitle') }}</p>
            <h2 class="hmr-section-title">{{ t('community.threadTitle') }}</h2>
          </div>
          <RouterLink class="hmr-cta" to="/contact">{{ t('community.submitTopic') }}</RouterLink>
        </div>

        <div class="hmr-community-feed-grid">
          <template v-if="content.feed.length">
            <article v-for="item in content.feed.slice(0, 6)" :key="`feed-${item.id}`">
              <span>{{ item.metric }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.excerpt }}</p>
            </article>
          </template>
          <template v-else>
            <article
              v-for="item in communityPreviewFeed"
              :key="item.id"
              class="hmr-community-feed-card--preview"
            >
              <span>{{ item.metric }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.excerpt }}</p>
            </article>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import {
  loadCommunityContentResource,
  type HmrCommunityContent,
  type HmrCommunityItem,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrCommunityBoard } from '@/hmr/composables/useHmrCommunityBoard'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'
import { createLoginRouteTarget } from '@/router/authTargets'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n({ useScope: 'global' })

const communityPreviewThreads = computed<HmrCommunityItem[]>(() => [
  {
    id: 'community-preview-thread-sync',
    title: t('community.hotTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.previewSync'),
  },
  {
    id: 'community-preview-thread-latest',
    title: t('community.latestTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.latest'),
  },
  {
    id: 'community-preview-thread-member',
    title: t('community.loginCtaTitle'),
    excerpt: t('community.loginCtaBody'),
    metric: t('community.loginCtaPrimary'),
  },
])
const communityPreviewStats = computed<HmrCommunityItem[]>(() => [
  {
    id: 'community-preview-stat-summary',
    title: t('community.stats'),
    excerpt: t('community.previewBody'),
    metric: t('community.previewMetric'),
  },
  {
    id: 'community-preview-stat-access',
    title: t('community.loginCtaTitle'),
    excerpt: t('community.loginCtaBody'),
    metric: t('community.loginCtaPrimary'),
  },
  {
    id: 'community-preview-stat-cache',
    title: t('community.latestTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.previewSync'),
  },
])
const communityPreviewHotThreads = computed<HmrCommunityItem[]>(() => [
  {
    id: 'community-preview-hot-rising',
    title: t('community.risingTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.hot'),
  },
  {
    id: 'community-preview-hot-feedback',
    title: t('community.hotTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.submitFeedback'),
  },
  {
    id: 'community-preview-hot-open',
    title: t('community.topicTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.openFromContent'),
  },
  {
    id: 'community-preview-hot-next',
    title: t('community.latestTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.latest'),
  },
])
const communityPreviewFeed = computed<HmrCommunityItem[]>(() => [
  {
    id: 'community-preview-feed-1',
    title: t('community.latestTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.latest'),
  },
  {
    id: 'community-preview-feed-2',
    title: t('community.threadTitle'),
    excerpt: t('community.previewBody'),
    metric: t('community.feed'),
  },
  {
    id: 'community-preview-feed-3',
    title: t('community.submitTopic'),
    excerpt: t('community.previewBody'),
    metric: t('community.submitTopic'),
  },
])
const initialCommunityContent: HmrCommunityContent = {
  stats: [],
  discussions: [],
  hot: [],
  latest: [],
  feed: [],
}
const auth = useAuthStore()
const communityLoginTarget = computed(() => createLoginRouteTarget('/community'))
const {
  content,
  pageState,
  resource,
  refresh: refreshCommunity,
} = useHmrPublicContentResource<HmrCommunityContent>({
  initialData: initialCommunityContent,
  paths: ['/community/stats', '/community/latest', '/community/hot', '/community/feed'],
  cacheKey: 'hmr:community',
  scope: 'community',
  strategy: 'network-first',
  loader: loadCommunityContentResource,
  isEmpty: (data) => !hasCommunityContent(data),
})
const usingPreviewCommunity = computed(() => !hasCommunityContent(content.value))
const { activeTab, activeTabLabel, discussionTabs, hotThreads, threadTarget, visibleThreads } =
  useHmrCommunityBoard(content, t)

function hasCommunityContent(data: HmrCommunityContent): boolean {
  return Boolean(
    data.stats.length ||
    data.discussions.length ||
    data.hot.length ||
    data.latest.length ||
    data.feed.length
  )
}

useHmrMountedResourceRefresh(refreshCommunity)
</script>
