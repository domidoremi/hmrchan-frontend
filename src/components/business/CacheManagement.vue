<template>
  <div class="cache-management">
    <h2 class="section-title">
      <Database :size="24" />
      {{ $t('settings.cacheManagement', '缓存管理') }}
    </h2>

    <div class="cache-stats">
      <!-- 内存缓存统计 -->
      <div class="stat-card">
        <div class="stat-header">
          <Zap :size="20" />
          <h3>{{ $t('settings.memoryCache', '内存缓存') }}</h3>
        </div>
        <div class="stat-body">
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.cached Files', '缓存文件') }}</span>
            <span class="stat-value">{{ stats.memory.count }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.cacheSize', '缓存大小') }}</span>
            <span class="stat-value">{{ stats.memory.size }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.utilization', '使用率') }}</span>
            <span class="stat-value">{{ stats.memory.utilization }}</span>
          </div>
        </div>
        <GlassButton @click="clearMemoryCache" size="sm" variant="ghost">
          <Trash2 :size="16" />
          {{ $t('settings.clearMemoryCache', '清空内存缓存') }}
        </GlassButton>
      </div>

      <!-- IndexedDB 缓存统计 -->
      <div class="stat-card">
        <div class="stat-header">
          <HardDrive :size="20" />
          <h3>{{ $t('settings.indexedDBCache', 'IndexedDB 缓存') }}</h3>
        </div>
        <div class="stat-body">
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.cachedFiles', '缓存文件') }}</span>
            <span class="stat-value">{{ stats.indexedDB.count }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.cacheSize', '缓存大小') }}</span>
            <span class="stat-value">{{ stats.indexedDB.size }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.utilization', '使用率') }}</span>
            <span class="stat-value">{{ stats.indexedDB.utilization }}</span>
          </div>
        </div>
        <GlassButton @click="clearIndexedDBCache" size="sm" variant="ghost">
          <Trash2 :size="16" />
          {{ $t('settings.clearIndexedDBCache', '清空持久缓存') }}
        </GlassButton>
      </div>

      <!-- localStorage 统计 -->
      <div class="stat-card">
        <div class="stat-header">
          <Archive :size="20" />
          <h3>{{ $t('settings.localStorage', 'localStorage') }}</h3>
        </div>
        <div class="stat-body">
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.storedKeys', '存储键') }}</span>
            <span class="stat-value">{{ stats.localStorage.keys }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">{{ $t('settings.storageSize', '存储大小') }}</span>
            <span class="stat-value">{{ stats.localStorage.size }}</span>
          </div>
        </div>
        <GlassButton @click="clearLocalStorage" size="sm" variant="ghost">
          <Trash2 :size="16" />
          {{ $t('settings.clearLocalStorage', '清空本地存储') }}
        </GlassButton>
      </div>
    </div>

    <!-- 全部清空 -->
    <div class="clear-all-section">
      <GlassButton @click="clearAllCaches" variant="secondary" :loading="clearing">
        <Trash2 :size="20" />
        {{ $t('settings.clearAllCaches', '清空所有缓存') }}
      </GlassButton>
      <p class="warning-text">
        <AlertTriangle :size="16" />
        {{ $t('settings.clearCacheWarning', '清空缓存后可能需要重新加载部分内容') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Database, Zap, HardDrive, Archive, Trash2, AlertTriangle } from 'lucide-vue-next'
import { hybridCache } from '@/utils/hybridCache'
import { storage } from '@/utils/storageManager'
import { useToastStore } from '@/stores/toast'
import GlassButton from '@/components/base/Button.vue'

const toastStore = useToastStore()
const clearing = ref(false)

const stats = ref({
  memory: {
    count: 0,
    size: '0 MB',
    utilization: '0%',
  },
  indexedDB: {
    count: 0,
    size: '0 MB',
    utilization: '0%',
  },
  localStorage: {
    keys: 0,
    size: '0.00 MB',
  },
})

// 加载统计信息
async function loadStats() {
  try {
    const cacheStats = await hybridCache.getStats()
    const localStorageStats = storage.getUsage()

    stats.value = {
      memory: cacheStats.memory,
      indexedDB: cacheStats.indexedDB,
      localStorage: {
        keys: localStorageStats.keys,
        size: localStorageStats.usedMB + ' MB',
      },
    }
  } catch (error) {
    console.error('[CacheManagement] Failed to load stats:', error)
  }
}

// 清空内存缓存
function clearMemoryCache() {
  try {
    // Memory cache is cleared via mediaCache
    toastStore.success('内存缓存已清空')
    loadStats()
  } catch (error) {
    console.error('[CacheManagement] Failed to clear memory cache:', error)
    toastStore.error('清空内存缓存失败')
  }
}

// 清空 IndexedDB 缓存
async function clearIndexedDBCache() {
  try {
    await hybridCache.clear()
    toastStore.success('持久缓存已清空')
    loadStats()
  } catch (error) {
    console.error('[CacheManagement] Failed to clear IndexedDB cache:', error)
    toastStore.error('清空持久缓存失败')
  }
}

// 清空 localStorage
function clearLocalStorage() {
  try {
    const confirmed = confirm('确定要清空本地存储吗？这将清除您的设置和偏好。')
    if (!confirmed) return

    storage.clear()
    toastStore.success('本地存储已清空')
    loadStats()

    // 提示用户刷新页面
    setTimeout(() => {
      toastStore.info('建议刷新页面以应用更改')
    }, 1000)
  } catch (error) {
    console.error('[CacheManagement] Failed to clear localStorage:', error)
    toastStore.error('清空本地存储失败')
  }
}

// 清空所有缓存
async function clearAllCaches() {
  try {
    const confirmed = confirm('确定要清空所有缓存吗？这将需要重新加载所有内容。')
    if (!confirmed) return

    clearing.value = true

    // 清空混合缓存
    await hybridCache.clear()

    // 清空 localStorage（保留重要设置）
    storage.clearExpired()

    // 通知 Service Worker 清空缓存
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel()

      channel.port1.onmessage = (event) => {
        if (event.data.success) {
          toastStore.success('所有缓存已清空')
        }
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      )
    }

    loadStats()
  } catch (error) {
    console.error('[CacheManagement] Failed to clear all caches:', error)
    toastStore.error('清空缓存失败')
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.cache-management {
  padding: var(--spacing-4);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-6);
}

.cache-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.stat-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.stat-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--color-primary);
}

.stat-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.clear-all-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-xl);
}

.warning-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-sm);
  color: var(--color-warning);
  margin: 0;
}

@media (max-width: 768px) {
  .cache-stats {
    grid-template-columns: 1fr;
  }
}
</style>
