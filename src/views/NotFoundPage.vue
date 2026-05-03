<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">404</p>
    <h1>{{ t('error.notFound') }}</h1>
    <RouterLink class="hmr-cta hmr-cta--dark" to="/">{{ t('error.home') }}</RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
