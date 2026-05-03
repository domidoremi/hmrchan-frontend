<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('studio.eyebrow') }}</p>
    <h1>{{ t('studio.title') }}</h1>
    <p>{{ t('studio.body') }}</p>
    <button class="hmr-cta hmr-cta--dark" type="button">{{ t('studio.cta') }}</button>
  </section>

  <section class="hmr-section">
    <div class="hmr-feed-list">
      <article class="hmr-post-card">
        <div class="hmr-media-plane">
          <span>{{ t('studio.draftLabel') }}</span>
        </div>
        <div>
          <p>{{ t('studio.draftEndpoint') }}</p>
          <h3>{{ t('studio.draftTitle') }}</h3>
          <span>{{ t('studio.draftBody') }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
