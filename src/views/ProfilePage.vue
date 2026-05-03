<template>
  <section class="hmr-profile">
    <aside class="hmr-profile-nav">
      <RouterLink v-for="item in sections" :key="item.section" :to="item.to">
        {{ item.label }}
      </RouterLink>
    </aside>

    <article class="hmr-profile-panel">
      <p class="hmr-kicker">{{ auth.displayName }}</p>
      <h1>{{ currentTitle }}</h1>
      <p>{{ t('profile.empty') }}</p>

      <div class="hmr-signal-list">
        <div class="hmr-signal-row">
          <strong>/api/v1/auth/me</strong>
          <span>{{ auth.user?.email ?? t('profile.sessionFallback') }}</span>
          <em>{{ auth.isAuthenticated ? t('profile.active') : t('profile.guest') }}</em>
        </div>
        <div class="hmr-signal-row">
          <strong>{{ sectionEndpoint }}</strong>
          <span>{{ t('profile.endpointHint') }}</span>
          <em>{{ section }}</em>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  section: string
}>()

const { t } = useI18n({ useScope: 'global' })
const auth = useAuthStore()

const sections = computed(() => [
  { section: 'overview', label: t('profile.overview'), to: '/profile' },
  { section: 'security', label: t('profile.security'), to: '/profile/security' },
  { section: 'preferences', label: t('profile.preferences'), to: '/profile/preferences' },
  { section: 'favorites', label: t('profile.favorites'), to: '/profile/favorites' },
  { section: 'history', label: t('profile.history'), to: '/profile/history' },
  { section: 'inbox', label: t('profile.inbox'), to: '/profile/inbox' },
])

const currentTitle = computed(() => {
  const match = sections.value.find((item) => item.section === props.section)
  return match?.label ?? t('profile.title')
})

const sectionEndpoint = computed(() => {
  switch (props.section) {
    case 'security':
      return '/api/v1/2fa/status · /api/v1/auth/passkeys · /api/v1/devices'
    case 'preferences':
      return '/api/v1/preferences'
    case 'favorites':
      return '/api/v1/favorites'
    case 'history':
      return '/api/v1/history/*'
    case 'inbox':
      return '/api/v1/inbox'
    default:
      return '/api/v1/users/me/profile'
  }
})
</script>
