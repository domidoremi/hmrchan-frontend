<template>
  <div class="hmr-app-shell">
    <header class="hmr-header" :class="{ 'is-open': menuOpen }">
      <RouterLink class="hmr-brand" to="/" aria-label="HMRChan home" @click="closeMenu">
        <img class="hmr-brand-mark" src="/hmrchan/brand/mark.svg" alt="" />
        <span class="hmr-brand-word">HMRChan</span>
      </RouterLink>

      <nav class="hmr-nav" aria-label="Primary navigation">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.key"
          class="hmr-nav-link"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="hmr-header-actions">
        <label class="hmr-select-label">
          <span>{{ t('shell.language') }}</span>
          <select class="hmr-select" :value="locale" @change="changeLocale">
            <option value="zh-CN">中</option>
            <option value="en-US">EN</option>
            <option value="ja-JP">日</option>
          </select>
        </label>

        <button class="hmr-icon-button" type="button" @click="theme.toggleTheme">
          {{ theme.isDark ? t('shell.lightMode') : t('shell.darkMode') }}
        </button>

        <RouterLink
          class="hmr-cta"
          :to="authTarget"
          :data-locale-version="authLabel.version"
          @click="closeMenu"
        >
          {{ authLabel.text }}
        </RouterLink>

        <button class="hmr-menu-toggle" type="button" @click="menuOpen = !menuOpen">
          <span></span>
          <span></span>
        </button>
      </div>

      <div class="hmr-mobile-panel">
        <RouterLink
          v-for="item in mobileNav"
          :key="item.key"
          class="hmr-mobile-link"
          :to="item.to"
          @click="closeMenu"
        >
          {{ item.label }}
        </RouterLink>
        <button v-if="auth.isAuthenticated" class="hmr-mobile-link" type="button" @click="logout">
          {{ t('shell.logout') }}
        </button>
      </div>
    </header>

    <div class="hmr-scroll-progress" aria-hidden="true">
      <span :style="{ transform: `scaleY(${scrollProgress})` }"></span>
    </div>

    <main class="hmr-main">
      <RouterView v-slot="{ Component }">
        <Transition name="hmr-page" mode="out-in">
          <component :is="Component" :key="pageTransitionKey" />
        </Transition>
      </RouterView>
    </main>

    <footer class="hmr-footer" :data-locale-version="shellText.version">
      <div>
        <p class="hmr-kicker">HMRChan</p>
        <h2>{{ shellText.footerTitle }}</h2>
        <p>{{ shellText.footerBody }}</p>
      </div>
      <div class="hmr-footer-actions">
        <RouterLink class="hmr-cta hmr-cta--dark" to="/start-a-project">
          {{ shellText.footerCta }}
        </RouterLink>
        <RouterLink class="hmr-link" to="/community">{{ shellText.footerExplore }}</RouterLink>
      </div>
    </footer>

    <nav class="hmr-bottom-nav" aria-label="Mobile quick navigation">
      <RouterLink v-for="item in mobileNav" :key="item.key" :to="item.to">
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { applyLocale, type SupportedLocale } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const { t, locale } = useI18n({ useScope: 'global' })
const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const scrollProgress = ref(0)
const localeVersion = ref(0)
const pageTransitionKey = computed(() => route.fullPath)

const primaryNav = computed(() => {
  const version = localeVersion.value

  return [
    { key: `home-${version}`, label: t('nav.home'), to: '/' },
    { key: `explore-${version}`, label: t('nav.explore'), to: '/explore' },
    { key: `community-${version}`, label: t('nav.community'), to: '/community' },
    { key: `about-${version}`, label: t('nav.about'), to: '/about' },
  ]
})

const mobileNav = computed(() => {
  const version = localeVersion.value

  return [
    { key: `mobile-home-${version}`, label: t('nav.home'), to: '/' },
    { key: `mobile-explore-${version}`, label: t('nav.explore'), to: '/explore' },
    { key: `mobile-community-${version}`, label: t('nav.community'), to: '/community' },
    {
      key: `mobile-account-${version}`,
      label: auth.isAuthenticated ? t('nav.profile') : t('nav.login'),
      to: auth.isAuthenticated ? '/profile' : '/login',
    },
  ]
})

const authTarget = computed(() => (auth.isAuthenticated ? '/profile' : '/login'))
const authLabel = computed(() => {
  const version = localeVersion.value

  return auth.isAuthenticated
    ? { text: `${t('shell.profileCta')} · ${auth.displayName}`, version }
    : { text: t('shell.authCta'), version }
})
const shellText = computed(() => {
  const version = localeVersion.value

  return {
    version,
    footerTitle: t('shell.footerTitle'),
    footerBody: t('shell.footerBody'),
    footerCta: t('shell.footerCta'),
    footerExplore: t('shell.footerExplore'),
  }
})

function closeMenu(): void {
  menuOpen.value = false
}

async function logout(): Promise<void> {
  await auth.logout()
  closeMenu()
  await router.push('/')
}

function changeLocale(event: Event): void {
  const target = event.target as HTMLSelectElement | null
  const nextLocale = target?.value as SupportedLocale | undefined
  if (!nextLocale || nextLocale === locale.value) return
  locale.value = nextLocale
  applyLocale(nextLocale)
  localeVersion.value += 1
  window.location.reload()
}

function updateScrollProgress(): void {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  scrollProgress.value = scrollable <= 0 ? 0 : Math.min(Math.max(window.scrollY / scrollable, 0), 1)
}

onMounted(() => {
  updateScrollProgress()
  window.addEventListener('scroll', updateScrollProgress, { passive: true })
  window.addEventListener('resize', updateScrollProgress)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateScrollProgress)
  window.removeEventListener('resize', updateScrollProgress)
})
</script>
