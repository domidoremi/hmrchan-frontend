<template>
  <div class="hmr-route-page hmr-route-page--community">
    <header class="hmr-page-hero hmr-page-hero--community">
      <div class="hmr-container">
        <p class="hmr-kicker">{{ t('community.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('community.title') }}</h1>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
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

          <main class="hmr-community-main" aria-label="讨论列表">
            <div class="hmr-community-main-head">
              <div>
                <p class="hmr-kicker">{{ activeTabLabel }}</p>
                <h2 class="hmr-section-title">{{ t('community.topicTitle') }}</h2>
              </div>
              <RouterLink class="hmr-text-link" to="/explore">
                {{ t('community.openFromContent') }}
              </RouterLink>
            </div>

            <div class="hmr-discussion-list">
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
            </div>
          </main>

          <aside class="hmr-community-aside">
            <div class="hmr-community-stat-card" v-for="item in content.stats" :key="item.id">
              <span>{{ item.metric }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.excerpt }}</p>
            </div>
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
          <article v-for="item in content.feed.slice(0, 6)" :key="`feed-${item.id}`">
            <span>{{ item.metric }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.excerpt }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { loadCommunityContentResource, type HmrCommunityContent } from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import { useHmrCommunityBoard } from '@/hmr/composables/useHmrCommunityBoard'
import { useHmrPublicContentResource } from '@/hmr/composables/useHmrPublicContentResource'
import { useHmrMountedResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'

const initialCommunityContent: HmrCommunityContent = {
  stats: [],
  discussions: [],
  hot: [],
  latest: [],
  feed: [],
}
const { t } = useI18n({ useScope: 'global' })
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
  isEmpty: (data) => data.stats.length === 0 && data.discussions.length === 0,
})
const { activeTab, activeTabLabel, discussionTabs, hotThreads, threadTarget, visibleThreads } =
  useHmrCommunityBoard(content, t)

useHmrMountedResourceRefresh(refreshCommunity)
</script>
