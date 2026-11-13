<template>
  <div class="journal-shell" :class="isNext ? 'edition-archive' : 'edition-editorial'">
    <a class="skip-link" href="#main-content">{{ t('common.skipToContent') }}</a>
    <aside v-if="isNext && !isAuthRoute" class="archive-sidebar">
      <RouterLink class="archive-logo" to="/"
        ><span class="brand-mark">m.</span><span>MomiChan<small>ARCHIVE</small></span
        ><span class="sr-only"> {{ t('nav.home') }}</span></RouterLink
      >
      <button class="sidebar-search" data-action="search" aria-keyshortcuts="Control+K Meta+K">
        <JournalIcon name="search" /><span>{{ t('common.search') }}</span
        ><kbd>⌘ K</kbd>
      </button>
      <nav :aria-label="t('common.primaryNavigation')">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :class="{ active: pageName === item.key }"
          :aria-current="pageName === item.key ? 'page' : undefined"
        >
          <JournalIcon :name="item.icon" /><span>{{ t(item.archiveKey) }}</span
          ><span class="nav-index">{{ item.index }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <button class="motion-switch" :aria-pressed="motion === 'full'" @click="toggleMotion">
          <span class="status-light" :class="{ dim: motion !== 'full' }" />
          {{
            t(
              motion === 'full'
                ? 'journal.appearance.motionFull'
                : 'journal.appearance.motionReduced'
            )
          }}
        </button>
        <RouterLink to="/profile"
          ><JournalIcon name="users" />{{
            auth.isAuthenticated
              ? auth.user?.username || t('journal.nav.myAccount')
              : t('journal.nav.loginOrRegister')
          }}<JournalIcon name="arrow-up-right"
        /></RouterLink>
        <a href="https://momichan.com"
          >{{ t('journal.nav.goToJournal') }} <JournalIcon name="arrow"
        /></a>
      </div>
    </aside>
    <div class="edition-workspace">
      <header class="edition-header">
        <template v-if="!isNext">
          <RouterLink class="editorial-logo" to="/">MomiChan<span>JOURNAL</span></RouterLink>
          <nav class="desktop-navigation" :aria-label="t('common.primaryNavigation')">
            <RouterLink
              v-for="item in navigation"
              :key="item.path"
              :to="item.path"
              :class="{ active: pageName === item.key }"
              :aria-current="pageName === item.key ? 'page' : undefined"
              >{{ t(item.mainKey) }}<sup>{{ item.index }}</sup></RouterLink
            >
          </nav>
        </template>
        <template v-else>
          <RouterLink class="mobile-archive-logo" to="/">m.</RouterLink>
          <div class="workspace-location">
            <span>MOMICHAN</span><i>/</i><b>{{ locationLabel }}</b>
          </div>
        </template>
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
          <button
            v-if="!isNext"
            class="motion-switch"
            :aria-pressed="motion === 'full'"
            @click="toggleMotion"
          >
            <span class="status-light" :class="{ dim: motion !== 'full' }" /><span>{{
              t(
                motion === 'full'
                  ? 'journal.appearance.motionFull'
                  : 'journal.appearance.motionReduced'
              )
            }}</span>
          </button>
          <RouterLink
            class="account-link"
            to="/profile"
            :aria-label="t(auth.isAuthenticated ? 'journal.nav.my' : 'nav.login')"
            ><JournalIcon name="users" /><span>{{
              t(auth.isAuthenticated ? 'journal.nav.my' : 'nav.login')
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
              v-for="item in navigation"
              :key="item.path"
              :to="item.path"
              :aria-current="pageName === item.key ? 'page' : undefined"
              @click="menuOpen = false"
              ><small>{{ item.index }}</small
              ><JournalIcon v-if="isNext" :name="item.icon" class="directory-icon" /><span>{{
                t(isNext ? item.archiveKey : item.mainKey)
              }}</span
              ><JournalIcon name="arrow-up-right"
            /></RouterLink>
          </nav>
          <div class="directory-footer">
            <button class="motion-switch" :aria-pressed="motion === 'full'" @click="toggleMotion">
              <span class="status-light" :class="{ dim: motion !== 'full' }" />
              {{
                t(
                  motion === 'full'
                    ? 'journal.appearance.motionFull'
                    : 'journal.appearance.motionReduced'
                )
              }}
            </button>
            <a :href="isNext ? 'https://momichan.com' : 'https://next.momichan.com'"
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
          <span>MOMICHAN · {{ new Date().getFullYear() }}</span
          ><span>{{ isNext ? 'ARCHIVE' : 'JOURNAL' }}</span
          ><a :href="isNext ? 'https://momichan.com' : 'https://next.momichan.com'"
            >{{ t(isNext ? 'journal.nav.goToJournal' : 'journal.nav.goToArchive') }}
            <JournalIcon name="arrow-up-right" /></a
          ><RouterLink to="/about">{{ t('nav.about') }}</RouterLink
          ><RouterLink to="/contact">{{ t('nav.contact') }}</RouterLink
          ><button data-action="top">{{ t('common.backToTop') }} ↑</button>
        </div>
      </footer>
    </div>
    <JournalAppearanceDialog v-if="appearanceOpen" @close="appearanceOpen = false" />
    <dialog id="app-dialog" aria-labelledby="dialog-title">
      <div class="dialog-head">
        <span class="eyebrow">MOMICHAN</span
        ><button class="icon-button" data-close :aria-label="t('common.close')">
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
import { designEdition } from '@/config/designEdition'
import { createJournalRuntime, type JournalRuntime } from './runtime'
import { createJournalFeedbackAdapter, useJournalFeedbackScope } from './feedback'
import { journalKey } from './context'
import { useJournalDialogs } from './useJournalDialogs'
import { useJournalEvents } from './useJournalEvents'
import { useJournalDirectory } from './useJournalDirectory'
import JournalIcon from './JournalIcon.vue'
import AccountNavigation from './AccountNavigation.vue'
const JournalAppearanceDialog = defineAsyncComponent(() => import('./JournalAppearanceDialog.vue'))
import { useI18n } from 'vue-i18n'
import './styles/index.css'
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore()
const feedback = createJournalFeedbackAdapter(useToastStore())
useJournalFeedbackScope(() => auth.user?.id, feedback)
const isNext = designEdition === 'archive'
const { locale, t } = useI18n({ useScope: 'global' })
const isAccountPage = computed(
  () => route.path.startsWith('/profile') && route.path !== '/profile/favorites'
)
const locationLabel = computed(() => {
  if (labels[pageName.value]) return t(labels[pageName.value]!)
  const title = typeof route.meta.title === 'function' ? route.meta.title(route) : route.meta.title
  return title ? t(String(title)) : 'MomiChan'
})
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
const motion = ref<'full' | 'reduced'>('full')
const appearanceOpen = ref(false)
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
    index: '01',
  },
  {
    path: '/explore',
    key: 'explore',
    mainKey: 'journal.nav.posts',
    archiveKey: 'journal.nav.records',
    icon: 'compass',
    index: '02',
  },
  {
    path: '/schedule',
    key: 'schedule',
    mainKey: 'nav.schedule',
    archiveKey: 'journal.nav.calendar',
    icon: 'calendar',
    index: '03',
  },
  {
    path: '/community',
    key: 'community',
    mainKey: 'nav.community',
    archiveKey: 'journal.nav.discussions',
    icon: 'messages',
    index: '04',
  },
  {
    path: '/profile/favorites',
    key: 'favorites',
    mainKey: 'nav.favorites',
    archiveKey: 'journal.nav.collection',
    icon: 'bookmark',
    index: '05',
  },
]
const pageName = computed(() =>
  import.meta.env.DEV && route.path.startsWith('/__journal/')
    ? String(route.params['page'])
    : navigation.find((item) => item.path === route.path)?.key || 'other'
)
const isJournalPage = computed(() => pageName.value !== 'other')
const labels: Record<string, string> = {
  home: 'journal.nav.overview',
  explore: 'journal.nav.records',
  schedule: 'journal.nav.calendar',
  community: 'journal.nav.discussions',
  favorites: 'journal.nav.collection',
}
function toggleMotion() {
  motion.value = motion.value === 'full' ? 'reduced' : 'full'
  runtime.value?.setMotion(motion.value)
}
function openAppearance() {
  menuOpen.value = false
  appearanceOpen.value = true
}
function syncMotion() {
  motion.value = runtime.value?.getMotion() === 'reduced' ? 'reduced' : 'full'
}
function syncChrome() {
  document.body.classList.toggle('journal-auth', isAuthRoute.value)
  document.body.dataset['page'] = pageName.value
}
onBeforeMount(() => {
  document.body.classList.add('site-body')
  document.body.classList.toggle('next-body', isNext)
  document.body.dataset['variant'] = isNext ? 'next' : 'main'
  syncChrome()
})
onMounted(() => {
  runtime.value = createJournalRuntime(
    (path) => {
      void router.push(path)
    },
    { feedback, translate: (key, named) => t(key, named ?? {}) }
  )
  motion.value = runtime.value.getMotion()
  document.addEventListener('journalmotionchange', syncMotion)
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
  document.removeEventListener('journalmotionchange', syncMotion)
  document.body.classList.remove('site-body', 'next-body', 'reading-large', 'journal-auth')
  delete document.body.dataset['variant']
  delete document.body.dataset['page']
  delete document.body.dataset['motion']
})
</script>

<style scoped>
.archive-sidebar nav a > span,
.workspace-location b {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}
.archive-sidebar nav .nav-index {
  flex: none;
}
.desktop-navigation a {
  min-inline-size: 0;
  white-space: normal;
}
.sidebar-bottom .motion-switch,
.directory-footer .motion-switch {
  flex-wrap: wrap;
  text-align: start;
}
.directory-footer {
  flex-wrap: wrap;
  row-gap: 1rem;
}
</style>
