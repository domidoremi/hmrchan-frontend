<template>
  <div class="hmr-route-page hmr-route-page--join">
    <header class="hmr-page-hero">
      <div class="hmr-container">
        <p class="hmr-kicker">加入</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>加入下一轮内容循环。</h1>
        <p class="hmr-body">创建账号、参与讨论、发布内容，把你的创作放进公共流动里。</p>
        <div class="hmr-actions">
          <RouterLink class="hmr-cta" to="/register">注册</RouterLink>
          <RouterLink class="hmr-text-link" to="/community">先看社区</RouterLink>
        </div>
      </div>
    </header>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">加入路径</p>
          <h2 class="hmr-section-title">从发现到发布，一条清楚的路。</h2>
          <p class="hmr-body">从公开浏览进入账号状态，收藏、历史和提醒会被保留下来。</p>
        </div>
        <div class="hmr-story-stack">
          <article v-for="item in joinItems" :key="item.title" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-dark-stage hmr-dark-stage--media" data-hmr-reveal>
      <div class="hmr-section-head">
        <p class="hmr-kicker">成员信号</p>
        <h2 class="hmr-section-title">账号让内容循环变成个人路径。</h2>
        <p class="hmr-body">注册后，收藏、历史、收件箱和安全设置会从公开浏览变成可恢复状态。</p>
      </div>
      <div class="hmr-media-ribbon" aria-hidden="true">
        <div class="hmr-media-ribbon-track">
          <div
            v-for="item in joinItems"
            :key="`join-a-${item.title}`"
            class="hmr-media-ribbon-card"
          >
            <strong>{{ item.metric }}<br />{{ item.title.slice(0, 2) }}</strong>
          </div>
          <div
            v-for="item in joinItems"
            :key="`join-b-${item.title}`"
            class="hmr-media-ribbon-card"
          >
            <strong>{{ item.metric }}<br />{{ item.title.slice(0, 2) }}</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-form-layout hmr-form-layout--wide">
        <aside class="hmr-contact-aside hmr-contact-aside--sticky">
          <p class="hmr-kicker">注册入口</p>
          <h2 class="hmr-section-title">准备好了就创建账号。</h2>
          <p class="hmr-body">注册完成后回到个人页，继续查看收藏和提醒。</p>
        </aside>
        <div class="hmr-panel">
          <p class="hmr-kicker">下一步</p>
          <h2 class="hmr-card-title">进入 HMRChan 成员循环</h2>
          <p class="hmr-body">注册后可以同步收藏、历史、收件箱和安全状态。</p>
          <div class="hmr-action-row">
            <RouterLink class="hmr-cta" to="/register">注册账号</RouterLink>
            <RouterLink class="hmr-text-link" to="/login">已有账号登录</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const joinItems = [
  { title: '浏览精选', body: '从首页和探索入口找到值得打开的内容。', metric: '01' },
  { title: '参与讨论', body: '把反馈、收藏和回复沉淀成社区上下文。', metric: '02' },
  { title: '持续发布', body: '用日程与草稿流程把内容推到下一轮。', metric: '03' },
]
</script>
