<template>
  <div class="hmr-route-page hmr-route-page--community">
    <header class="hmr-page-hero hmr-page-hero--community">
      <div class="hmr-container">
        <p class="hmr-kicker">社区</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>讨论现场</h1>
        <p class="hmr-body">快速找到热门讨论、最新回复和可以继续参与的内容。</p>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          :error="resource.error"
          empty-title="暂时没有讨论。"
          empty-body="稍后回来，或从探索页打开一条内容。"
          @retry="refreshCommunity"
        />
      </div>
    </header>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-community-board">
          <aside class="hmr-community-sidebar">
            <p class="hmr-kicker">频道</p>
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
                <h2 class="hmr-section-title">选择一个话题继续。</h2>
              </div>
              <RouterLink class="hmr-text-link" to="/explore">从内容进入</RouterLink>
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
            <p class="hmr-kicker">热门回应</p>
            <h2 class="hmr-section-title">正在升温。</h2>
          </div>
          <RouterLink class="hmr-text-link hmr-text-link--light" to="/contact">
            提交反馈
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
            <p class="hmr-kicker">最新动态</p>
            <h2 class="hmr-section-title">刚刚发生。</h2>
          </div>
          <RouterLink class="hmr-cta" to="/contact">提交话题</RouterLink>
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
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  seedCommunity,
  loadCommunityContentResource,
  type HmrCommunityContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

type CommunityTab = 'discussions' | 'hot' | 'latest' | 'feed'

const content = ref<HmrCommunityContent>({
  stats: seedCommunity,
  discussions: seedCommunity,
  hot: seedCommunity,
  latest: seedCommunity,
  feed: seedCommunity,
})
const activeTab = ref<CommunityTab>('discussions')
const pageState = ref<HmrPageState>('idle')
const resource = ref<HmrAsyncResource<HmrCommunityContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/community/stats', '/community/latest', '/community/hot', '/community/feed'],
  updatedAt: null,
})
const visibleThreads = computed(() => {
  const byTab = content.value[activeTab.value]
  return byTab.length
    ? byTab
    : content.value.discussions.length
      ? content.value.discussions
      : seedCommunity
})
const discussionTabs = computed(() => [
  { id: 'discussions' as const, label: '全部讨论', count: content.value.discussions.length },
  { id: 'hot' as const, label: '热门', count: content.value.hot.length },
  { id: 'latest' as const, label: '最新', count: content.value.latest.length },
  { id: 'feed' as const, label: '动态', count: content.value.feed.length },
])
const activeTabLabel = computed(
  () => discussionTabs.value.find((item) => item.id === activeTab.value)?.label ?? '讨论'
)
const hotThreads = computed(() =>
  (content.value.hot.length ? content.value.hot : content.value.discussions).slice(0, 4)
)

async function refreshCommunity(): Promise<void> {
  pageState.value = 'loading'
  const nextResource = await loadCommunityContentResource()
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value =
    nextResource.data.stats.length || nextResource.data.discussions.length ? 'ready' : 'empty'
}

function threadTarget(item: HmrCommunityContent['discussions'][number]): string {
  if (item.target) return item.target
  if (item.id.startsWith('demo-') || item.id.startsWith('community-')) return '/community'
  return `/posts/${item.id}`
}

onMounted(() => {
  void refreshCommunity()
})
</script>
