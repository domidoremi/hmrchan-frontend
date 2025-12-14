<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">{{ $t('settings.title') }}</h1>

      <div class="settings-card glass-card">
        <SettingsPanel :show-advanced-link="false" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SettingsPanel from '@/components/layout/SettingsPanel.vue'
</script>

<style scoped>
.settings-page {
  padding: var(--spacing-8) 0;
}

.page-title {
  margin-bottom: var(--spacing-6);
}

.settings-card {
  max-width: 500px;
}
</style>
