<template>
  <div v-if="isDev" class="sw-debug-panel">
    <button class="toggle-btn" @click="isOpen = !isOpen">🔧 SW Debug</button>

    <div v-if="isOpen" class="panel">
      <h3>Service Worker 调试面板</h3>

      <div class="info">
        <p><strong>状态:</strong> {{ swStatus }}</p>
        <p><strong>缓存版本:</strong> {{ cacheVersion }}</p>
        <p><strong>更新可用:</strong> {{ updateAvailable ? '是' : '否' }}</p>
      </div>

      <div class="actions">
        <button @click="checkUpdate">检查更新</button>
        <button @click="forceUpdate">强制更新</button>
        <button @click="clearCaches">清除缓存</button>
        <button @click="unregister">注销 SW</button>
        <button @click="reload">刷新页面</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServiceWorkerDebug } from '@/composables/useServiceWorkerDebug'
import { useToastStore } from '@/stores/toast'

const isDev = import.meta.env.DEV
const isOpen = ref(false)
const toastStore = useToastStore()

const {
  swStatus,
  cacheVersion,
  updateAvailable,
  checkUpdate: checkUpdateFn,
  forceUpdate: forceUpdateFn,
  clearCaches: clearCachesFn,
  unregister: unregisterFn,
} = useServiceWorkerDebug()

async function checkUpdate() {
  const success = await checkUpdateFn()
  if (success) {
    toastStore.success('更新检查完成')
  } else {
    toastStore.error('更新检查失败')
  }
}

async function forceUpdate() {
  const success = await forceUpdateFn()
  if (!success) {
    toastStore.info('没有可用的更新')
  }
}

async function clearCaches() {
  const success = await clearCachesFn()
  if (success) {
    toastStore.success('缓存已清除')
  } else {
    toastStore.error('清除缓存失败')
  }
}

async function unregister() {
  const success = await unregisterFn()
  if (success) {
    toastStore.success('Service Worker 已注销')
  } else {
    toastStore.error('注销失败')
  }
}

function reload() {
  window.location.reload()
}
</script>

<style scoped>
.sw-debug-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.toggle-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toggle-btn:hover {
  opacity: 0.9;
}

.panel {
  position: absolute;
  bottom: 50px;
  right: 0;
  width: 300px;
  padding: var(--spacing-4);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.panel h3 {
  margin: 0 0 var(--spacing-3) 0;
  font-size: var(--text-base);
  color: var(--color-text-primary);
}

.info {
  margin-bottom: var(--spacing-3);
  padding: var(--spacing-2);
  background: var(--glass-bg-light);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.info p {
  margin: var(--spacing-1) 0;
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.actions button {
  padding: var(--spacing-2);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: all 0.2s;
}

.actions button:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary);
}
</style>
