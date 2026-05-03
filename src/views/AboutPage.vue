<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('about.eyebrow') }}</p>
    <h1>{{ t('about.title') }}</h1>
    <p>{{ t('about.body') }}</p>
  </section>

  <section class="hmr-section hmr-section--split">
    <div>
      <p class="hmr-kicker">{{ t('about.principles') }}</p>
      <h2>{{ t('about.ruleTitle') }}</h2>
    </div>
    <div class="hmr-large-copy">
      <p>{{ t('about.ruleBody') }}</p>
      <p>{{ t('about.entranceBody') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
