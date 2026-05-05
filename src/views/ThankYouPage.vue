<template>
  <section class="hmr-panel-hero">
    <article class="hmr-panel hmr-panel--center">
      <p class="hmr-kicker">Thank you</p>
      <h1 class="hmr-page-title" data-hmr-text-reveal>已收到。</h1>
      <p class="hmr-body">你的反馈已经进入队列，我们会尽快查看。</p>
      <div class="hmr-actions">
        <RouterLink class="hmr-cta" to="/">回到首页</RouterLink>
        <RouterLink class="hmr-text-link" to="/explore">继续探索</RouterLink>
      </div>
      <div class="hmr-auth-status-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
