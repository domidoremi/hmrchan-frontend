<template>
  <div class="journal-shell">
    <div v-if="isNext && !isAuthRoute" class="journal-slot" v-html="chrome.sidebar" />
    <div :class="{ 'next-workspace': isNext && !isAuthRoute }">
      <div ref="header" class="journal-slot" v-html="chrome.header" />
      <main id="main-content" tabindex="-1" :class="{ 'journal-legacy': !isJournalPage }">
        <slot />
      </main>
      <div class="journal-slot" v-html="chrome.footer" />
    </div>
    <div v-if="!isAuthRoute" class="journal-slot" v-html="chrome.mobile" />
    <div class="journal-slot" v-html="chrome.dialog" />
    <div id="toast" class="toast" role="status" aria-live="polite" />
    <div class="reading-progress" aria-hidden="true" />
    <button class="back-to-top icon-button" data-action="top" aria-label="返回顶部" hidden>
      <i data-icon="arrow-up" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, provide, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { designEdition } from '@/config/designEdition'
import { createJournalRuntime, type JournalRuntime } from './runtime'
import { journalKey } from './context'
import { useJournalDialogs } from './useJournalDialogs'
import { useJournalEvents } from './useJournalEvents'
import mainChrome from './main-chrome.json'
import nextChrome from './next-chrome.json'
import './styles/index.css'

const route = useRoute()
const router = useRouter()
const isNext = designEdition === 'archive'
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
const chrome = isNext ? nextChrome : mainChrome
const runtime = shallowRef<JournalRuntime | null>(null)
provide(journalKey, runtime)
useJournalDialogs(runtime)
useJournalEvents(runtime)
const names: Record<string, string> = {
  '/': 'home',
  '/explore': 'explore',
  '/schedule': 'schedule',
  '/community': 'community',
  '/profile/favorites': 'favorites',
}
const pageName = computed(() =>
  import.meta.env.DEV && route.path.startsWith('/__journal/')
    ? String(route.params['page'])
    : (names[route.path] ?? 'other')
)
const isJournalPage = computed(() => pageName.value !== 'other')
const labels: Record<string, string> = {
  home: '首页',
  explore: '动态',
  schedule: '日程',
  community: '社区',
  favorites: '收藏',
  other: 'MomiChan',
}
function syncChrome() {
  document.body.classList.toggle('journal-auth', isAuthRoute.value)
  document.body.dataset['page'] = pageName.value
  for (const node of document.querySelectorAll<HTMLElement>('[data-page]')) {
    if (node === document.body) continue
    const active = node.dataset['page'] === pageName.value
    node.classList.toggle('active', active)
    if (active) node.setAttribute('aria-current', 'page')
    else node.removeAttribute('aria-current')
  }
  const title = document.querySelector('#next-page-name')
  if (title) title.textContent = labels[pageName.value] ?? 'MomiChan'
}
onMounted(() => {
  document.body.classList.add('site-body')
  document.body.classList.toggle('next-body', isNext)
  document.body.dataset['variant'] = isNext ? 'next' : 'main'
  syncChrome()
  runtime.value = createJournalRuntime((path) => {
    void router.push(path)
  })
})
watch(
  () => route.path,
  async () => {
    syncChrome()
    await nextTick()
    runtime.value?.transition()
    runtime.value?.mount()
  }
)
onBeforeUnmount(() => {
  runtime.value?.dispose()
  document.body.classList.remove('site-body', 'next-body', 'reading-large')
  delete document.body.dataset['variant']
  delete document.body.dataset['page']
  delete document.body.dataset['motion']
})
</script>
