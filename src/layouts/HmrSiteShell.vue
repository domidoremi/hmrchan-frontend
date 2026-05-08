<template>
  <div class="hmr-site" :style="scrollProgressStyle">
    <a class="hmr-skip-link" href="#hmr-main" aria-label="Skip to content"></a>

    <header class="hmr-site-header" :class="{ 'is-menu-open': menuOpen }">
      <div class="hmr-header-inner">
        <RouterLink class="hmr-brand-link" to="/" aria-label="MomiChan home" @click="closeMenu">
          <span class="hmr-brand-bg">
            <img class="hmr-brand-mark" :src="brandMarkUrl" alt="" />
          </span>
        </RouterLink>

        <nav class="hmr-primary-nav" aria-label="Primary navigation">
          <RouterLink
            v-for="item in primaryNav"
            :key="item.key"
            :to="item.to"
            custom
            v-slot="{ href, navigate }"
          >
            <a
              class="hmr-primary-nav-link"
              :class="{ 'is-active': activeNavKey === item.key }"
              :href="href"
              :aria-label="item.label"
              :aria-current="activeNavKey === item.key ? 'page' : undefined"
              @click="handleNavClick($event, navigate)"
            >
              <span class="hmr-nav-inner">
                <span class="hmr-nav-icon" :data-hmr-icon="item.icon" aria-hidden="true"></span>
                <span class="hmr-nav-label" :data-label="item.label" aria-hidden="true"></span>
                <span class="hmr-nav-dot" aria-hidden="true"></span>
              </span>
            </a>
          </RouterLink>
        </nav>

        <RouterLink to="/settings" custom v-slot="{ href, navigate }">
          <a
            class="hmr-primary-nav-link hmr-primary-nav-link--settings"
            :class="{ 'is-active': activeNavKey === 'settings' }"
            :href="href"
            aria-label="设置"
            :aria-current="activeNavKey === 'settings' ? 'page' : undefined"
            @click="handleNavClick($event, navigate)"
          >
            <span class="hmr-nav-inner">
              <span class="hmr-nav-icon" data-hmr-icon="settings" aria-hidden="true"></span>
              <span class="hmr-nav-label" data-label="设置" aria-hidden="true"></span>
              <span class="hmr-nav-dot" aria-hidden="true"></span>
            </span>
          </a>
        </RouterLink>

        <div class="hmr-mobile-header">
          <RouterLink class="hmr-mobile-brand" to="/" aria-label="MomiChan home" @click="closeMenu">
            <img class="hmr-mobile-brand-logo" :src="brandMarkUrl" alt="MomiChan" />
          </RouterLink>
          <span class="hmr-mobile-locale">ZH</span>
          <button
            class="hmr-menu-button"
            type="button"
            :aria-label="menuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            <span></span>
            <span></span>
          </button>
        </div>

        <div class="hmr-auth-actions" aria-label="Authentication">
          <template v-if="authDisplay.isAuthenticated">
            <RouterLink class="hmr-user-chip" to="/profile">
              <span class="hmr-user-avatar" aria-hidden="true">
                <img v-if="authDisplay.avatarUrl" :src="authDisplay.avatarUrl" alt="" />
                <span v-else>{{ authDisplay.displayName.slice(0, 1).toUpperCase() }}</span>
              </span>
              <span class="hmr-user-meta">
                <strong>{{ authDisplay.displayName }}</strong>
                <span>{{ authDisplay.identity }}</span>
              </span>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink class="hmr-auth-link" :to="loginTarget">登录</RouterLink>
            <RouterLink class="hmr-auth-link hmr-auth-link--solid" :to="registerTarget">
              注册
            </RouterLink>
          </template>
        </div>

        <div class="hmr-current-time" aria-label="Current time">
          <span>{{ timeZoneLabel }}</span>
          <time :datetime="currentTime">{{ currentTime }}</time>
        </div>

        <div class="hmr-scroll-progress" :style="scrollProgressStyle" aria-hidden="true">
          <span class="hmr-scroll-progress-line"></span>
          <span class="hmr-scroll-progress-cursor">
            <span></span>
          </span>
          <span class="hmr-scroll-progress-line"></span>
        </div>
      </div>

      <button
        class="hmr-nav-overlay"
        type="button"
        aria-label="Close menu"
        tabindex="-1"
        @click="closeMenu"
      ></button>
    </header>

    <main id="hmr-main" class="hmr-main">
      <RouterView v-slot="{ Component }">
        <Transition name="hmr-page" mode="out-in">
          <component :is="Component" :key="pageTransitionKey" />
        </Transition>
      </RouterView>
    </main>

    <footer class="hmr-footer" data-hmr-reveal>
      <div class="hmr-container hmr-footer-container">
        <div class="hmr-footer-content">
          <h2 data-hmr-text-reveal>MomiChan</h2>
          <RouterLink class="hmr-text-link hmr-text-link--light" to="/contact">
            联系我们
          </RouterLink>
        </div>
        <div class="hmr-footer-bottom">
          <img class="hmr-footer-logo" :src="brandMarkUrl" alt="MomiChan" />
          <nav class="hmr-footer-nav" aria-label="Footer navigation">
            <RouterLink to="/explore">探索</RouterLink>
            <RouterLink to="/community">社区</RouterLink>
            <RouterLink to="/about">关于</RouterLink>
            <RouterLink to="/contact">联系</RouterLink>
          </nav>
          <p>©{{ currentYear }} MomiChan</p>
        </div>
      </div>
      <div class="hmr-footer-keys" aria-hidden="true">
        <img v-for="index in 7" :key="index" :src="brandMarkUrl" alt="" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { useHmrAuthDisplay } from '@/hmr/composables/useHmrAuthDisplay'
import { useHmrCurrentTime } from '@/hmr/composables/useHmrCurrentTime'
import { useHmrInViewReveal } from '@/hmr/composables/useHmrInViewReveal'
import { useHmrScrollProgress } from '@/hmr/composables/useHmrScrollProgress'
import { useHmrTextReveal } from '@/hmr/composables/useHmrTextReveal'
import type { HmrNavItem } from '@/hmr/types'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const theme = useThemeStore()
const menuOpen = ref(false)
const pageTransitionKey = computed(() => route.fullPath)
const { auth, authDisplay } = useHmrAuthDisplay()
const { currentTime, timeZoneLabel } = useHmrCurrentTime()
const { progress } = useHmrScrollProgress()
const scrollProgressStyle = computed(() => ({
  '--hmr-scroll-progress': progress.value.toString(),
}))
const currentYear = new Date().getFullYear()
const brandMarkUrl = new URL('/icons/sitting-192.webp', window.location.origin).toString()

useHmrInViewReveal()
useHmrTextReveal()

const primaryNav: HmrNavItem[] = [
  { key: 'home', label: '首页', to: '/', icon: 'home' },
  { key: 'explore', label: '探索', to: '/explore', icon: 'explore' },
  { key: 'community', label: '社区', to: '/community', icon: 'community' },
  { key: 'schedule', label: '日程', to: '/schedule', icon: 'schedule' },
]

const activeNavKey = computed(() => {
  if (route.name === 'hmr-home' || route.path === '/') return 'home'

  const navKey = route.meta.navKey
  if (
    navKey === 'explore' ||
    navKey === 'community' ||
    navKey === 'schedule' ||
    navKey === 'settings'
  ) {
    return navKey
  }

  return null
})

const loginTarget = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath === '/login' ? '/' : route.fullPath },
}))

const registerTarget = computed(() => ({
  path: '/register',
  query: { redirect: route.fullPath === '/register' ? '/' : route.fullPath },
}))

function closeMenu(): void {
  menuOpen.value = false
}

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function handleNavClick(event: MouseEvent, navigate: (event?: MouseEvent) => void): void {
  navigate(event)
  closeMenu()
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  }
)

onMounted(() => {
  theme.initializeTheme()
  void auth.resolveSession()
})
</script>
