<template>
  <section class="hmr-page-hero">
    <p class="hmr-kicker">{{ t('auth.recoveryEyebrow') }}</p>
    <h1>{{ t('auth.recoveryTitle') }}</h1>
    <p>{{ t('auth.recoveryBody') }}</p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })
</script>
