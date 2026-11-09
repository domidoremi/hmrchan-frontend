<template>
  <div class="journal-shell" :class="isNext ? 'edition-archive' : 'edition-editorial'">
    <a class="skip-link" href="#main-content">跳至内容</a>
    <aside v-if="isNext && !isAuthRoute" class="archive-sidebar">
      <RouterLink class="archive-logo" to="/" aria-label="m. MomiChan ARCHIVE 首页"
        ><span class="brand-mark">m.</span><span>MomiChan<small>ARCHIVE</small></span></RouterLink
      >
      <button class="sidebar-search" data-action="search" aria-label="搜索">
        <JournalIcon name="search" /><span>搜索</span><kbd>⌘ K</kbd>
      </button>
      <nav aria-label="主导航">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          :aria-label="item.archive"
          :class="{ active: pageName === item.key }"
          :aria-current="pageName === item.key ? 'page' : undefined"
        >
          <JournalIcon :name="item.icon" /><span>{{ item.archive }}</span
          ><span class="nav-index" aria-hidden="true">{{ item.index }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <button class="motion-switch" :aria-pressed="motion === 'full'" @click="toggleMotion">
          <span class="status-light" :class="{ dim: motion !== 'full' }" />动效
          {{ motion === 'full' ? '全开' : '简化' }}
        </button>
        <RouterLink to="/profile"
          ><JournalIcon name="users" />{{
            auth.isAuthenticated ? auth.user?.username || '我的账号' : '登录 / 注册'
          }}<JournalIcon name="arrow-up-right"
        /></RouterLink>
        <a href="https://momichan.com">前往杂志 <JournalIcon name="arrow" /></a>
      </div>
    </aside>
    <div class="edition-workspace">
      <header class="edition-header">
        <template v-if="!isNext">
          <RouterLink class="editorial-logo" to="/">MomiChan<span>JOURNAL</span></RouterLink>
          <nav class="desktop-navigation" aria-label="主导航">
            <RouterLink
              v-for="item in navigation"
              :key="item.path"
              :to="item.path"
              :class="{ active: pageName === item.key }"
              :aria-current="pageName === item.key ? 'page' : undefined"
              >{{ item.main }}<sup>{{ item.index }}</sup></RouterLink
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
            aria-label="显示设置"
            @click="openAppearance"
          >
            <JournalIcon name="sliders" />
          </button>
          <button class="icon-button" data-action="search" aria-label="搜索">
            <JournalIcon name="search" />
          </button>
          <button class="icon-button" data-action="notifications" aria-label="已记下的日程">
            <JournalIcon name="calendar" />
          </button>
          <button
            v-if="!isNext"
            class="motion-switch"
            :aria-pressed="motion === 'full'"
            @click="toggleMotion"
          >
            <span class="status-light" :class="{ dim: motion !== 'full' }" /><span>{{
              motion === 'full' ? '动效全开' : '动效简化'
            }}</span>
          </button>
          <RouterLink
            class="account-link"
            to="/profile"
            :aria-label="auth.isAuthenticated ? '我的' : '登录'"
            ><JournalIcon name="users" /><span>{{
              auth.isAuthenticated ? '我的' : '登录'
            }}</span></RouterLink
          >
          <button
            :ref="(element) => (menuButton = element as HTMLButtonElement | null)"
            class="mobile-menu-button icon-button"
            :aria-expanded="menuOpen"
            :aria-controls="menuOpen ? 'edition-mobile-menu' : undefined"
            :aria-label="menuOpen ? '关闭目录' : '打开目录'"
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
          <nav aria-label="移动导航">
            <RouterLink
              v-for="item in navigation"
              :key="item.path"
              :to="item.path"
              :aria-current="pageName === item.key ? 'page' : undefined"
              @click="menuOpen = false"
              ><small>{{ item.index }}</small
              ><JournalIcon v-if="isNext" :name="item.icon" class="directory-icon" /><span>{{
                isNext ? item.archive : item.main
              }}</span
              ><JournalIcon name="arrow-up-right"
            /></RouterLink>
          </nav>
          <div class="directory-footer">
            <button class="motion-switch" :aria-pressed="motion === 'full'" @click="toggleMotion">
              <span class="status-light" :class="{ dim: motion !== 'full' }" />动效
              {{ motion === 'full' ? '全开' : '简化' }}
            </button>
            <a :href="isNext ? 'https://momichan.com' : 'https://next.momichan.com'"
              >{{ isNext ? '前往杂志' : '前往资料库' }} ↗</a
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
            >{{ isNext ? '前往杂志' : '前往资料库' }} <JournalIcon name="arrow-up-right" /></a
          ><RouterLink to="/about">关于</RouterLink><RouterLink to="/contact">联系</RouterLink
          ><button data-action="top">回到顶部 ↑</button>
        </div>
      </footer>
    </div>
    <JournalAppearanceDialog v-if="appearanceOpen" @close="appearanceOpen = false" />
    <dialog id="app-dialog" aria-labelledby="dialog-title">
      <div class="dialog-head">
        <span class="eyebrow">MOMICHAN</span
        ><button class="icon-button" data-close aria-label="关闭"><JournalIcon name="x" /></button>
      </div>
      <div id="dialog-content" />
    </dialog>
    <div id="toast" class="toast" role="status" aria-live="polite" />
    <div class="reading-progress" aria-hidden="true" />
    <button class="back-to-top icon-button" data-action="top" aria-label="返回顶部" hidden>
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
import { useAuthStore } from '@/stores'
import { designEdition } from '@/config/designEdition'
import { createJournalRuntime, type JournalRuntime } from './runtime'
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
const isNext = designEdition === 'archive'
const { t } = useI18n()
const isAccountPage = computed(
  () => route.path.startsWith('/profile') && route.path !== '/profile/favorites'
)
const locationLabel = computed(() => {
  if (labels[pageName.value]) return labels[pageName.value]
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
  { path: '/', key: 'home', main: '首页', archive: '总览', icon: 'home', index: '01' },
  {
    path: '/explore',
    key: 'explore',
    main: '动态',
    archive: '资料检索',
    icon: 'compass',
    index: '02',
  },
  {
    path: '/schedule',
    key: 'schedule',
    main: '日程',
    archive: '月历',
    icon: 'calendar',
    index: '03',
  },
  {
    path: '/community',
    key: 'community',
    main: '社区',
    archive: '讨论',
    icon: 'messages',
    index: '04',
  },
  {
    path: '/profile/favorites',
    key: 'favorites',
    main: '收藏',
    archive: '我的收藏',
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
  home: '总览',
  explore: '资料检索',
  schedule: '月历',
  community: '讨论',
  favorites: '我的收藏',
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
  runtime.value = createJournalRuntime((path) => {
    void router.push(path)
  })
  motion.value = runtime.value.getMotion()
  document.addEventListener('journalmotionchange', syncMotion)
})
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
  document.removeEventListener('journalmotionchange', syncMotion)
  document.body.classList.remove('site-body', 'next-body', 'reading-large', 'journal-auth')
  delete document.body.dataset['variant']
  delete document.body.dataset['page']
  delete document.body.dataset['motion']
})
</script>
