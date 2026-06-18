<template>
  <div class="hmr-route-page hmr-route-page--community" :class="{ 'is-preview': usingPreviewCommunity }">
    <header class="hmr-page-hero hmr-page-hero--community">
      <div class="hmr-container">
        <p class="hmr-kicker">{{ t('community.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('community.title') }}</h1>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty' && !usingPreviewCommunity"
          :error="usingPreviewCommunity ? null : resource.error"
          :title="usingPreviewCommunity ? '当前显示公开预览' : undefined"
          :body="
            usingPreviewCommunity
              ? '讨论、摘要与动态入口保持可浏览，公开接口恢复后会自动替换成实时内容。'
              : undefined
          "
          :show-when-ready="usingPreviewCommunity"
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

const communityPreviewThreads: HmrCommunityItem[] = [
  {
    id: 'community-preview-thread-sync',
    title: '热门主题会在这里继续滚动',
    excerpt: '公开讨论接口恢复后，这里显示线程摘要、回应数和内容入口。',
    metric: '同步中',
  },
  {
    id: 'community-preview-thread-latest',
    title: '最新回应会保持在同一入口',
    excerpt: '新帖子回流与后续讨论会接续到当前列表，不切换浏览节奏。',
    metric: '最新',
  },
  {
    id: 'community-preview-thread-member',
    title: '登录后可以继续收藏与回复',
    excerpt: '成员态恢复后，回复、收藏和提醒会直接回到社区工作面板。',
    metric: '参与',
  },
]
const communityPreviewStats: HmrCommunityItem[] = [
  {
    id: 'community-preview-stat-summary',
    title: '社区摘要',
    excerpt: '当前面板保留公开浏览结构，摘要会在同步完成后刷新。',
    metric: '预览',
  },
  {
    id: 'community-preview-stat-access',
    title: '互动状态',
    excerpt: '登录后显示回复、收藏和提醒上下文。',
    metric: '登录后',
  },
  {
    id: 'community-preview-stat-cache',
    title: '内容更新',
    excerpt: '公开接口恢复后会自动补齐热门、最新与动态概览。',
    metric: '缓存',
  },
]
const communityPreviewHotThreads: HmrCommunityItem[] = [
  {
    id: 'community-preview-hot-rising',
    title: '高互动讨论会回到这里',
    excerpt: '深色分区继续承担热门回应与快速跳转的入口。',
    metric: '升温',
  },
  {
    id: 'community-preview-hot-feedback',
    title: '社区反馈会集中展示',
    excerpt: '话题回顾、重点建议与公开回应将在同步后补齐。',
    metric: '反馈',
  },
  {
    id: 'community-preview-hot-open',
    title: '当前保留完整浏览层次',
    excerpt: '即使接口失败，用户仍能辨认社区主路径与下一步入口。',
    metric: '公开',
  },
  {
    id: 'community-preview-hot-next',
    title: '后续热度会自动接回',
    excerpt: '恢复后会按互动强度重新排列，不需要重新学习页面结构。',
    metric: '继续',
  },
]
const communityPreviewFeed: HmrCommunityItem[] = [
  {
    id: 'community-preview-feed-1',
    title: '动态摘要会在这里更新',
    excerpt: '公开动态、回流回应与最新讨论会按时间顺序接回当前分区。',
    metric: '动态',
  },
  {
    id: 'community-preview-feed-2',
    title: '讨论入口保持稳定',
    excerpt: '用户可以先浏览社区结构，再在接口恢复后继续深入阅读。',
    metric: '讨论',
  },
  {
    id: 'community-preview-feed-3',
    title: '提交路径已经保留',
    excerpt: '反馈与发起主题入口仍保持可见，不会在失败态里消失。',
    metric: '提交',
  },
]
const initialCommunityContent: HmrCommunityContent = {
  stats: [],
  discussions: [],
  hot: [],
  latest: [],
  feed: [],
}
const { t } = useI18n({ useScope: 'global' })
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
  isEmpty: (data) => data.stats.length === 0 && data.discussions.length === 0,
})
const usingPreviewCommunity = computed(
  () =>
    content.value.stats.length === 0 &&
    content.value.discussions.length === 0 &&
    content.value.hot.length === 0 &&
    content.value.feed.length === 0
)
const { activeTab, activeTabLabel, discussionTabs, hotThreads, threadTarget, visibleThreads } =
  useHmrCommunityBoard(content, t)

useHmrMountedResourceRefresh(refreshCommunity)
</script>
