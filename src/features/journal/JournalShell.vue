<template>
  <div class="journal-shell" :class="isNext ? 'edition-archive' : 'edition-editorial'">
    <a class="skip-link" href="#main-content" tabindex="0">{{ t('common.skipToContent') }}</a>
    <div class="edition-workspace">
      <header class="edition-header liquid-surface">
        <LiquidGlass v-if="settingsStore.settings.appearancePreset === 'fluent-soft'" />
        <RouterLink
          class="edition-logo"
          to="/"
          tabindex="0"
          :aria-label="`MomiChan${isNext ? ' Next' : ''}`"
        >
          <span v-if="isNext" class="next-brand-mark" aria-hidden="true">n↗</span>
          <img v-else :src="'/journal/mascot.webp'" alt="" width="40" height="40" />
          <span class="edition-brand-name">MomiChan<small v-if="isNext">NEXT</small></span>
        </RouterLink>
        <nav
          v-if="!isAuthRoute"
          class="desktop-navigation"
          :aria-label="t('common.primaryNavigation')"
        >
          <RouterLink
            tabindex="0"
            v-for="item in navigation"
            :key="item.path"
            :to="item.path"
            :class="{ active: pageName === item.key }"
            :aria-current="pageName === item.key ? 'page' : undefined"
            >{{ t(isNext ? item.archiveKey : item.mainKey) }}</RouterLink
          >
        </nav>
        <div class="header-actions">
          <button
            class="icon-button appearance-trigger"
            :aria-label="t('journal.appearance.title')"
            @click="openAppearance"
          >
            <JournalIcon name="sliders" />
          </button>
          <button class="icon-button" data-action="search" :aria-label="t('common.search')">
            <JournalIcon name="search" />
          </button>
          <button
            class="icon-button"
            data-action="notifications"
            :aria-label="t('journal.nav.savedSchedule')"
          >
            <JournalIcon name="calendar" />
          </button>
          <RouterLink
            tabindex="0"
            class="account-link"
            to="/profile"
            :aria-label="t(auth.isAuthenticated ? 'journal.nav.my' : 'nav.login')"
            ><JournalIcon name="users" /><span>{{
              isNext && auth.isAuthenticated
                ? auth.user?.username || t('journal.nav.my')
                : t(auth.isAuthenticated ? 'journal.nav.my' : 'nav.login')
            }}</span></RouterLink
          >
          <button
            :ref="(element) => (menuButton = element as HTMLButtonElement | null)"
            class="mobile-menu-button icon-button"
            :aria-expanded="menuOpen"
            :aria-controls="menuOpen ? 'edition-mobile-menu' : undefined"
            :aria-label="t(menuOpen ? 'journal.nav.closeDirectory' : 'journal.nav.openDirectory')"
            @click="menuOpen = !menuOpen"
          >
            <JournalIcon :name="menuOpen ? 'x' : 'menu'" />
          </button>
        </div>
      </header>
      <Transition name="directory">
        <div
          v-if="menuOpen"
          id="edition-mobile-menu"
          :ref="(element) => (directory = element as HTMLElement | null)"
          class="mobile-directory"
        >
          <nav :aria-label="t('journal.nav.mobileNavigation')">
            <RouterLink
              tabindex="0"
              v-for="item in navigation"
              :key="item.path"
              :to="item.path"
              :aria-current="pageName === item.key ? 'page' : undefined"
              @click="menuOpen = false"
              ><JournalIcon :name="item.icon" class="directory-icon" /><span>{{
                t(isNext ? item.archiveKey : item.mainKey)
              }}</span
              ><JournalIcon name="arrow-up-right"
            /></RouterLink>
          </nav>
          <div class="directory-footer">
            <RouterLink to="/profile" @click="menuOpen = false"
              ><JournalIcon name="users" />{{
                t(auth.isAuthenticated ? 'journal.nav.myAccount' : 'journal.nav.loginOrRegister')
              }}</RouterLink
            >
            <a :href="isNext ? 'https://momichan.com' : 'https://next.momichan.com'" tabindex="0"
              >{{ t(isNext ? 'journal.nav.goToJournal' : 'journal.nav.goToArchive') }} ↗</a
            >
          </div>
        </div>
      </Transition>
      <main
        id="main-content"
        tabindex="-1"
        :class="{ 'journal-legacy': !isJournalPage, 'account-workspace': isAccountPage }"
        :data-route="route.name"
      >
        <AccountNavigation v-if="isAccountPage" />
        <slot />
      </main>
      <footer v-if="!isAuthRoute" class="edition-footer" data-reveal>
        <div v-if="!isNext && !isAccountPage" class="footer-wordmark" aria-hidden="true">
          MomiChan<span>®</span>
        </div>
        <div class="footer-bottom">
          <span>© {{ new Date().getFullYear() }} MomiChan</span
          ><a :href="isNext ? 'https://momichan.com' : 'https://next.momichan.com'" tabindex="0"
            >{{ t(isNext ? 'journal.nav.goToJournal' : 'journal.nav.goToArchive') }}
            <JournalIcon name="arrow-up-right" /></a
          ><RouterLink to="/about" tabindex="0">{{ t('nav.about') }}</RouterLink
          ><RouterLink to="/contact" tabindex="0">{{ t('nav.contact') }}</RouterLink
          ><button data-action="top">{{ t('common.backToTop') }} ↑</button>
        </div>
      </footer>
    </div>
    <nav
      v-if="!isAuthRoute"
      class="mobile-navigation"
      :class="{ 'liquid-surface': settingsStore.settings.appearancePreset === 'fluent-soft' }"
      :aria-label="t('journal.nav.mobileNavigation')"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.path"
        :to="item.path"
        :class="{ active: pageName === item.key }"
        :aria-current="pageName === item.key ? 'page' : undefined"
        ><JournalIcon :name="item.icon" /><span>{{
          t(isNext ? item.archiveKey : item.mainKey)
        }}</span></RouterLink
      >
    </nav>
    <JournalAppearanceDialog v-if="appearanceOpen" @close="appearanceOpen = false" />
    <dialog id="app-dialog" aria-labelledby="dialog-title">
      <div class="dialog-head">
        <button class="icon-button" data-close :aria-label="t('common.close')">
          <JournalIcon name="x" />
        </button>
      </div>
      <div id="dialog-content" />
    </dialog>
    <div class="reading-progress" aria-hidden="true" />
    <button
      class="back-to-top icon-button"
      data-action="top"
      :aria-label="t('common.backToTop')"
      hidden
    >
      <JournalIcon name="arrow-up" />
    </button>
  </div>
</template>
<script setup lang="ts">
import {
  defineAsyncComponent,
  computed,
  onMounted,
  onBeforeMount,
  onBeforeUnmount,
  nextTick,
  provide,
  shallowRef,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores'
import { useSettingsStore } from '@/stores/settings'
import { designEdition } from '@/config/designEdition'
import { createJournalRuntime, type JournalRuntime } from './runtime'
import { createJournalFeedbackAdapter, useJournalFeedbackScope } from './feedback'
import { journalKey } from './context'
import { useJournalDialogs } from './useJournalDialogs'
import { useJournalEvents } from './useJournalEvents'
import { useJournalDirectory } from './useJournalDirectory'
import { installDisplayPreferences } from './displayPreferences'
import JournalIcon from './JournalIcon.vue'
import LiquidGlass from './LiquidGlass.vue'
import AccountNavigation from './AccountNavigation.vue'
const JournalAppearanceDialog = defineAsyncComponent(() => import('./JournalAppearanceDialog.vue'))
import { useI18n } from 'vue-i18n'
import './styles/index.css'
import './styles/theme-layouts.css'
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore()
const feedback = createJournalFeedbackAdapter(useToastStore())
const settingsStore = useSettingsStore()
useJournalFeedbackScope(() => auth.user?.id, feedback)
const isNext = designEdition === 'archive'
const { locale, t } = useI18n({ useScope: 'global' })
const isAccountPage = computed(
  () => route.path.startsWith('/profile') && route.path !== '/profile/favorites'
)
const authRoutes = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'auth-callback',
  'passkey-recovery',
  'passkey-recovery-detail',
])
const isAuthRoute = computed(() => authRoutes.has(String(route.name)))
const runtime = shallowRef<JournalRuntime | null>(null)
const appearanceOpen = ref(false)
const displayLifetime = new AbortController()
const { menuOpen, menuButton, directory } = useJournalDirectory()
provide(journalKey, runtime)
useJournalDialogs(runtime)
useJournalEvents(runtime)
const navigation = [
  {
    path: '/',
    key: 'home',
    mainKey: 'nav.home',
    archiveKey: 'journal.nav.overview',
    icon: 'home',
  },
  {
    path: '/explore',
    key: 'explore',
    mainKey: 'journal.nav.posts',
    archiveKey: 'journal.nav.records',
    icon: 'compass',
  },
  {
    path: '/schedule',
    key: 'schedule',
    mainKey: 'nav.schedule',
    archiveKey: 'journal.nav.calendar',
    icon: 'calendar',
  },
  {
    path: '/community',
    key: 'community',
    mainKey: 'nav.community',
    archiveKey: 'journal.nav.discussions',
    icon: 'messages',
  },
  {
    path: '/profile/favorites',
    key: 'favorites',
    mainKey: 'nav.favorites',
    archiveKey: 'journal.nav.collection',
    icon: 'bookmark',
  },
]
const pageName = computed(() =>
  import.meta.env.DEV && route.path.startsWith('/__journal/')
    ? String(route.params['page'])
    : navigation.find((item) => item.path === route.path)?.key || 'other'
)
const isJournalPage = computed(() => pageName.value !== 'other')
function openAppearance() {
  menuOpen.value = false
  appearanceOpen.value = true
}
function syncChrome() {
  document.body.classList.toggle('journal-auth', isAuthRoute.value)
  document.body.dataset['page'] = pageName.value
}
onBeforeMount(() => {
  document.body.classList.add('site-body')
  document.body.classList.toggle('next-body', isNext)
  document.body.dataset['variant'] = isNext ? 'next' : 'main'
  installDisplayPreferences(displayLifetime.signal)
  document.addEventListener(
    'journalmotionchange',
    () => {
      settingsStore.setAnimationIntensity(
        document.body.dataset['motion'] === 'full' ? 'full' : 'reduced'
      )
    },
    { signal: displayLifetime.signal }
  )
  syncChrome()
})
onMounted(() => {
  runtime.value = createJournalRuntime(
    (path) => {
      void router.push(path)
    },
    { feedback, translate: (key, named) => t(key, named ?? {}) }
  )
})
watch(locale, () => runtime.value?.refreshLocalizedControls(), { flush: 'post' })
watch(
  () => route.path,
  async () => {
    appearanceOpen.value = false
    menuOpen.value = false
    syncChrome()
    await nextTick()
    runtime.value?.transition()
    runtime.value?.mount()
  }
)
onBeforeUnmount(() => {
  runtime.value?.dispose()
  feedback.dispose()
  displayLifetime.abort()
  document.body.classList.remove('site-body', 'next-body', 'reading-large', 'journal-auth')
  delete document.body.dataset['variant']
  delete document.body.dataset['page']
  delete document.body.dataset['motion']
  delete document.body.dataset['motionPreference']
  delete document.body.dataset['textSize']
  delete document.body.dataset['archiveDensity']
})
</script>

<style scoped>
.desktop-navigation a {
  min-inline-size: 0;
  white-space: normal;
}
.directory-footer {
  flex-wrap: wrap;
  row-gap: 1rem;
}
</style>
