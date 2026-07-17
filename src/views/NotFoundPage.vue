<template>
  <section class="hmr-panel-hero">
    <div class="hmr-container">
      <p class="hmr-kicker">404</p>
      <h1 class="hmr-page-title" data-hmr-text-reveal>{{ t('error.notFound') }}</h1>
      <p class="hmr-body">这个路径暂时没有内容。</p>
      <div class="hmr-actions">
        <RouterLink class="hmr-cta" to="/">{{ t('error.home') }}</RouterLink>
        <RouterLink class="hmr-text-link" to="/explore">查看探索</RouterLink>
      </div>
      <div class="hmr-page-tags" role="list" aria-label="Available routes">
        <span role="listitem">/</span>
        <span role="listitem">/explore</span>
        <span role="listitem">/community</span>
        <span role="listitem">/schedule</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
