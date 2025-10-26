<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 初始化应用
onMounted(() => {
  // 初始化主题
  themeStore.initTheme()

  // 恢复认证状态
  authStore.restoreAuth()
  if (authStore.isAuthenticated) {
    authStore.fetchCurrentUser()
  }
})
</script>

<template>
  <div id="app" :data-theme="isDark ? 'dark' : 'light'">
    <RouterView />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
  transition: background-color var(--transition-base);
}
</style>
