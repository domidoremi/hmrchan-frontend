<template>
  <nav class="account-navigation" :aria-label="t('journal.nav.accountNavigation')">
    <RouterLink
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      :class="{ 'is-current': route.path === item.path }"
      :aria-current="route.path === item.path ? 'page' : undefined"
    >
      <JournalIcon :name="item.icon" /><span>{{ t(item.labelKey) }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import JournalIcon from './JournalIcon.vue'
const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
const items = [
  { path: '/profile', labelKey: 'journal.nav.my', icon: 'users' },
  { path: '/profile/notifications', labelKey: 'profile.tabs.notifications', icon: 'bell' },
  { path: '/profile/favorites', labelKey: 'nav.favorites', icon: 'bookmark' },
  { path: '/profile/history', labelKey: 'profile.tabs.history', icon: 'clock' },
  { path: '/profile/security', labelKey: 'profile.tabs.security', icon: 'shield' },
  { path: '/profile/settings', labelKey: 'nav.settings', icon: 'settings' },
]
</script>
