<template>
  <nav class="account-navigation" aria-label="账号导航">
    <RouterLink
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      :class="{ 'is-current': route.path === item.path }"
      :aria-current="route.path === item.path ? 'page' : undefined"
    >
      <JournalIcon :name="item.icon" /><span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import JournalIcon from './JournalIcon.vue'
const route = useRoute()
const items = [
  { path: '/profile', label: '我的', icon: 'users' },
  { path: '/profile/notifications', label: '通知', icon: 'bell' },
  { path: '/profile/favorites', label: '收藏', icon: 'bookmark' },
  { path: '/profile/history', label: '历史', icon: 'clock' },
  { path: '/profile/security', label: '安全', icon: 'shield' },
  { path: '/profile/settings', label: '设置', icon: 'settings' },
]
</script>
