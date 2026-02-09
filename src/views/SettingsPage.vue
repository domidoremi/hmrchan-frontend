<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">{{ $t('settings.title') }}</h1>

      <div class="settings-card glass-card">
        <SettingsPanel :compact="false" :show-advanced-link="false" />
      </div>

      <div class="settings-card glass-card cache-section">
        <div class="section-title-row">
          <RivePlayer
            class="cache-rive"
            :src="cacheRive"
            :autoplay="true"
            :width="36"
            :height="36"
          />
          <h2 class="section-title">{{ $t('settings.cache.title') }}</h2>
        </div>
        <p class="section-desc">
          {{ $t('settings.cache.description') }}
        </p>
        <Button variant="secondary" :loading="isClearingCache" @click="handleClearCache">
          <AnimatedIcon name="sparkle" :fallback-icon="Trash2" size="sm" class="icon" />
          {{ $t('settings.cache.clear') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SettingsPage' })

import { ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { clearAllCaches } from '@/utils/cache'
import SettingsPanel from '@/components/layout/SettingsPanel.vue'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import RivePlayer from '@/components/animation/RivePlayer.vue'
import cacheRive from '@/assets/animations/animated-icon-set.riv?url'

const toast = useToastStore()
const isClearingCache = ref(false)

async function handleClearCache() {
  isClearingCache.value = true
  try {
    const result = await clearAllCaches()
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  } finally {
    isClearingCache.value = false
  }
}
</script>

<style scoped>
.settings-page {
  padding: var(--spacing-4) 0;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-title {
  margin-bottom: var(--spacing-4);
  width: 100%;
  max-width: min(90vw, 35rem);
  font-size: var(--text-xl);
}

.settings-card {
  width: 100%;
  max-width: min(90vw, 35rem);
}

.cache-section {
  margin-top: var(--spacing-4);
  padding: var(--spacing-4);
}

@media (min-width: 768px) {
  .settings-page {
    padding: var(--spacing-6) 0;
  }

  .cache-section {
    padding: var(--spacing-5);
  }
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-2);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.cache-rive {
  width: 36px;
  height: 36px;
}

.section-desc {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-4);
}

.icon {
  width: 16px;
  height: 16px;
  margin-right: var(--spacing-2);
}
</style>
