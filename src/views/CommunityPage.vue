<template>
  <div class="hmr-route-page hmr-route-page--community">
    <header class="hmr-page-hero">
      <div class="hmr-container">
        <p class="hmr-kicker">{{ t('community.eyebrow') }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('community.title') }}</h1>
        <p class="hmr-body">热帖、回复、反馈和最新动态集中在这里。</p>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          empty-title="暂时没有讨论。"
          empty-body="稍后回来，或从探索页打开一条内容。"
          @retry="refreshCommunity"
        />
      </div>
    </header>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">{{ t('community.stats') }}</p>
          <h2 class="hmr-section-title">{{ t('community.liveTitle') }}</h2>
          <p class="hmr-body">每条讨论都要能回到内容、作者或下一次回应。</p>
        </div>
        <div class="hmr-story-stack">
          <article v-for="item in content.stats" :key="item.id" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--media" data-hmr-reveal>
      <div class="hmr-section-head">
        <p class="hmr-kicker">社区现场</p>
        <h2 class="hmr-section-title">讨论正在发生。</h2>
        <p class="hmr-body">热门回应、最新评论和反馈入口一起组成社区现场。</p>
      </div>
      <div class="hmr-media-ribbon" aria-hidden="true">
        <div class="hmr-media-ribbon-track">
          <div
            v-for="(item, index) in visibleThreads"
            :key="`community-ribbon-a-${item.id}`"
            class="hmr-media-ribbon-card"
            :style="cardStyle(index)"
          >
            <strong>{{ item.metric }}<br />{{ item.title.slice(0, 2) }}</strong>
          </div>
          <div
            v-for="(item, index) in visibleThreads"
            :key="`community-ribbon-b-${item.id}`"
            class="hmr-media-ribbon-card"
            :style="cardStyle(index + visibleThreads.length)"
          >
            <strong>{{ item.metric }}<br />{{ item.title.slice(0, 2) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">讨论索引</p>
          <h2 class="hmr-section-title">选择一个讨论继续。</h2>
        </div>
        <div class="hmr-platform-strip hmr-platform-strip--center" aria-label="Discussion filters">
          <button
            v-for="item in discussionTabs"
            :key="item.id"
            class="hmr-platform-chip"
            :class="{ 'is-active': activeTab === item.id }"
            type="button"
            @click="activeTab = item.id"
          >
            <span>{{ item.label }}</span>
            <em>{{ item.count }}</em>
          </button>
        </div>
        <div class="hmr-list">
          <RouterLink
            v-for="item in visibleThreads"
            :key="item.id"
            class="hmr-list-row"
            :to="threadTarget(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
            <em>{{ item.metric }}</em>
          </RouterLink>
        </div>
        <div class="hmr-signal-grid hmr-community-grid">
          <article
            v-for="item in content.feed.slice(0, 3)"
            :key="`feed-${item.id}`"
            class="hmr-mini-panel"
          >
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
          </article>
        </div>
        <div class="hmr-action-row hmr-action-row--center">
          <RouterLink class="hmr-cta" to="/contact">提交反馈</RouterLink>
          <RouterLink class="hmr-text-link" to="/explore">从内容进入讨论</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import {
  seedCommunity,
  loadCommunityContentResource,
  type HmrCommunityContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

const { t } = useI18n({ useScope: 'global' })
const content = ref<HmrCommunityContent>({
  stats: seedCommunity,
  discussions: seedCommunity,
  hot: seedCommunity,
  latest: seedCommunity,
  feed: seedCommunity,
})
const activeTab = ref<'discussions' | 'hot' | 'latest' | 'feed'>('discussions')
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

const colorPairs = [
  ['#ff7722', '#3d2fa9'],
  ['#ff3c34', '#ffc765'],
  ['#171412', '#ff7722'],
]

function cardStyle(index: number): Record<string, string> {
  const pair = colorPairs[index % colorPairs.length] ?? colorPairs[0]
  return {
    '--hmr-card-start': pair?.[0] ?? '#ff7722',
    '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
  }
}
</script>
