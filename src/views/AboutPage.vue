<template>
  <div class="hmr-route-page hmr-route-page--about">
    <header class="hmr-page-hero hmr-page-hero--about">
      <div class="hmr-container hmr-page-hero-container">
        <p class="hmr-kicker">关于</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>
          <span>关于</span>
          <span>MomiChan。</span>
        </h1>
        <p class="hmr-body">把多平台内容、社区回应和个人收藏放进一个入口。</p>
      </div>
    </header>

    <section class="hmr-cinema-section hmr-cinema-section--about" data-hmr-reveal data-hmr-scroll>
      <div class="hmr-cinema-sticky">
        <div class="hmr-cinema-frame" aria-label="MomiChan team tornado">
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
            <span>让发现、讨论、收藏和发布都有明确路径。</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">入口</p>
            <strong>入口必须稳定。</strong>
            <span>首页、探索、社区和日程保持稳定；个人页承接账号内容。</span>
          </article>
          <article class="hmr-story-block">
            <p class="hmr-kicker">节奏</p>
            <strong>刷新要有节奏。</strong>
            <span>日程和反馈帮助内容持续更新。</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-section-head">
          <p class="hmr-kicker">内容生态</p>
          <h2 class="hmr-section-title">四个区域组成 MomiChan。</h2>
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
          <p class="hmr-kicker">团队协作</p>
          <h2 class="hmr-section-title">内容、社区、日程、反馈互相连接。</h2>
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
import { useHmrAboutContent } from '@/hmr/composables/useHmrAboutContent'

const { cardStyle, principles, systemMap, tornadoItems } = useHmrAboutContent()
</script>
