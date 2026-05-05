<template>
  <div class="hmr-route-page hmr-route-page--about">
    <header class="hmr-page-hero hmr-page-hero--about">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">关于</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>
          <span>关于</span>
          <span>HMRChan。</span>
        </h1>
        <p class="hmr-body">把多平台内容、社区回应和个人收藏收进一个清楚的入口。</p>
      </div>
    </header>

    <section class="hmr-cinema-section hmr-cinema-section--about" data-hmr-reveal data-hmr-scroll>
      <div class="hmr-cinema-sticky">
        <div class="hmr-cinema-frame" aria-label="HMRChan team tornado">
          <div class="hmr-cinema-orbit hmr-cinema-orbit--team" aria-hidden="true">
            <span v-for="item in tornadoItems" :key="item">{{ item }}</span>
          </div>
          <div class="hmr-cinema-copy">
            <p class="hmr-kicker">团队</p>
            <h2 class="hmr-section-title">小团队，大上下文。</h2>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">产品故事</p>
          <h2 class="hmr-section-title">少一点噪音，多一点上下文。</h2>
        </div>
        <div class="hmr-story-stack">
          <article class="hmr-story-block">
            <p class="hmr-kicker">目标</p>
            <strong>内容不是瀑布。</strong>
            <span>让发现、讨论、收藏和发布都回到清楚路径。</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">入口</p>
            <strong>入口必须稳定。</strong>
            <span>首页、探索、社区和日程是稳定入口；个人页和设置承接真实状态。</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">节奏</p>
            <strong>刷新要有节奏。</strong>
            <span>日程和反馈把内容推进到下一轮。</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">内容生态</p>
          <h2 class="hmr-section-title">四个产品域构成完整体验。</h2>
        </div>
        <div class="hmr-signal-grid">
          <article v-for="item in systemMap" :key="item.title" class="hmr-mini-panel">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--media" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">团队循环</p>
          <h2 class="hmr-section-title">内容、社区、发布、反馈互相牵引。</h2>
        </div>
        <div class="hmr-media-ribbon" aria-hidden="true">
          <div class="hmr-media-ribbon-track">
            <div
              v-for="(item, index) in tornadoItems"
              :key="`about-ribbon-a-${item}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index)"
            >
              <strong>{{ item }}</strong>
            </div>
            <div
              v-for="(item, index) in tornadoItems"
              :key="`about-ribbon-b-${item}`"
              class="hmr-media-ribbon-card"
              :style="cardStyle(index + tornadoItems.length)"
            >
              <strong>{{ item }}</strong>
            </div>
          </div>
        </div>
        <RouterLink class="hmr-text-link hmr-text-link--light" to="/join-us">加入我们</RouterLink>
      </div>
    </section>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">原则</p>
          <h2 class="hmr-section-title">我们用四个规则保持秩序。</h2>
        </div>
        <div class="hmr-list">
          <article v-for="item in principles" :key="item.title" class="hmr-list-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
            <em>{{ item.index }}</em>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const tornadoItems = ['精选内容', '创作者', '社区回应', '发布日程', '反馈通道']
const principles = [
  { index: '01', title: '上下文优先', body: '让用户知道内容从哪里来、为什么值得打开。' },
  { index: '02', title: '尊重创作', body: '保护作者信息、引用来源和社区讨论秩序。' },
  { index: '03', title: '减少噪音', body: '把重复提醒和低价值卡片压到最低。' },
  { index: '04', title: '持续刷新', body: '用日程和反馈让内容进入下一轮循环。' },
]
const systemMap = [
  {
    metric: 'Home',
    title: '内容发现',
    body: '首页、探索、作者、媒体、搜索和趋势组成内容主线。',
  },
  {
    metric: 'Community',
    title: '社区互动',
    body: '讨论、评论、收藏、关系、反馈和收件箱合成社区互动面。',
  },
  {
    metric: 'Auth',
    title: '身份安全',
    body: '登录、注册、Google、Passkey 和 2FA 构成身份安全闭环。',
  },
  {
    metric: 'Schedule',
    title: '发布日程',
    body: '日程列表、日历聚合和亮点组成内容发布节奏。',
  },
]
const colorPairs = [
  ['#ff7722', '#3d2fa9'],
  ['#ff3c34', '#ffc765'],
  ['#3d2fa9', '#171412'],
  ['#ffc765', '#ff7722'],
  ['#171412', '#ff3c34'],
]

function cardStyle(index: number): Record<string, string> {
  const pair = colorPairs[index % colorPairs.length] ?? colorPairs[0]
  return {
    '--hmr-card-start': pair?.[0] ?? '#ff7722',
    '--hmr-card-end': pair?.[1] ?? '#3d2fa9',
  }
}
</script>
