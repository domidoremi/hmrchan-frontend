<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">{{ $t('settings.title') }}</h1>

      <div class="settings-card glass-card">
        <SettingsPanel :show-advanced-link="false" />
      </div>

      <div class="settings-card glass-card cache-section">
        <h2 class="section-title">{{ $t('settings.cache.title', '缓存管理') }}</h2>
        <p class="section-desc">{{ $t('settings.cache.description', '清理本地缓存数据以释放存储空间或解决数据问题') }}</p>
        <Button
          variant="secondary"
          :loading="isClearingCache"
          @click="handleClearCache"
        >
          <Trash2 class="icon" />
          {{ $t('settings.cache.clear', '清理缓存') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { useToastStore } from '@/stores/toast'
import { clearAllCaches } from '@/utils/cache'
import SettingsPanel from '@/components/layout/SettingsPanel.vue'
import Button from '@/components/ui/Button.vue'

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
  padding: var(--spacing-8) 0;
}

.page-title {
  margin-bottom: var(--spacing-6);
}

.settings-card {
  max-width: 500px;
}

.cache-section {
  margin-top: var(--spacing-6);
  padding: var(--spacing-6);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-2);
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
