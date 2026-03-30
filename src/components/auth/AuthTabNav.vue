<template>
  <nav class="auth-tab-nav" :aria-label="ariaLabel">
    <RouterLink
      :to="loginTarget"
      class="auth-tab-nav__item"
      :class="{ 'auth-tab-nav__item--active': activeTab === 'login' }"
      :aria-current="activeTab === 'login' ? 'page' : undefined"
    >
      {{ $t('nav.login') }}
    </RouterLink>
    <RouterLink
      :to="registerTarget"
      class="auth-tab-nav__item"
      :class="{ 'auth-tab-nav__item--active': activeTab === 'register' }"
      :aria-current="activeTab === 'register' ? 'page' : undefined"
    >
      {{ $t('nav.register') }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { AuthEntryTab } from './authTypes'

defineOptions({ name: 'AuthTabNav' })

const props = withDefaults(
  defineProps<{
    activeTab: AuthEntryTab
    redirectTo?: string
    ariaLabel?: string
  }>(),
  {
    redirectTo: '/',
    ariaLabel: '',
  }
)

const targetQuery = computed(() =>
  props.redirectTo && props.redirectTo !== '/' ? { redirect: props.redirectTo } : undefined
)

const loginTarget = computed(() => ({
  path: '/login',
  query: targetQuery.value,
}))

const registerTarget = computed(() => ({
  path: '/register',
  query: targetQuery.value,
}))
</script>
