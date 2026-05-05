<template>
  <div class="hmr-route-page hmr-route-page--schedule">
    <header class="hmr-page-hero">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">Schedule</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>日程与发布节奏。</h1>
        <p class="hmr-body">把内容准备、社区讨论和发布窗口排进一条清晰的时间线。</p>
        <HmrPageStateBlock
          :loading="pageState === 'loading'"
          :empty="pageState === 'empty'"
          empty-title="暂时没有日程。"
          empty-body="稍后回来，或先去探索页查看新内容。"
          @retry="refreshSchedule"
        />
      </div>
    </header>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">时间线</p>
          <h2 class="hmr-section-title">一天三个关键窗口。</h2>
          <p class="hmr-body">巡检、讨论、发布，每个窗口都服务下一轮内容。</p>
        </div>
        <div class="hmr-story-stack">
          <article v-for="item in content.items" :key="item.id" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.phase }} · {{ item.time }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--media" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">发布地图</p>
          <h2 class="hmr-section-title">下一轮内容正在排队。</h2>
        </div>
        <div class="hmr-media-ribbon" aria-hidden="true">
          <div class="hmr-media-ribbon-track">
            <div
              v-for="(item, index) in content.highlights"
              :key="`schedule-card-a-${item.id}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index)"
            >
              <strong>{{ item.phase }}<br />{{ item.time }}</strong>
            </div>
            <div
              v-for="(item, index) in content.highlights"
              :key="`schedule-card-b-${item.id}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index + content.highlights.length)"
            >
              <strong>{{ item.phase }}<br />{{ item.time }}</strong>
            </div>
          </div>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/contact">
          反馈你的发布窗口
        </RouterLink>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">日历聚合</p>
          <h2 class="hmr-section-title">从时间线回到现场。</h2>
        </div>
        <div class="hmr-list">
          <article v-for="item in content.calendar" :key="item.id" class="hmr-list-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
            <em>{{ item.metric }}</em>
          </article>
        </div>
        <div class="hmr-signal-grid hmr-schedule-grid">
          <article
            v-for="item in content.highlights.slice(0, 3)"
            :key="`highlight-${item.id}`"
            class="hmr-mini-panel"
          >
            <p class="hmr-kicker">{{ item.phase }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import {
  seedCommunity,
  seedScheduleItems,
  loadScheduleContentResource,
  type HmrScheduleContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

const content = ref<HmrScheduleContent>({
  items: seedScheduleItems,
  calendar: seedCommunity,
  highlights: seedScheduleItems,
})
const pageState = ref<HmrPageState>('idle')
const resource = ref<HmrAsyncResource<HmrScheduleContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/schedules', '/schedules/calendar', '/schedules/highlights'],
  updatedAt: null,
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

async function refreshSchedule(): Promise<void> {
  pageState.value = 'loading'
  const nextResource = await loadScheduleContentResource()
  resource.value = nextResource
  content.value = nextResource.data
  pageState.value = nextResource.data.items.length ? 'ready' : 'empty'
}

onMounted(() => {
  void refreshSchedule()
})
</script>
