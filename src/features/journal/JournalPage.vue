<template>
  <div
    ref="root"
    class="journal-page"
    :data-journal-page="page"
    :data-testid="page === 'favorites' ? 'profile-section-shell' : undefined"
    :data-profile-section="page === 'favorites' ? 'favorites' : undefined"
    @click="handleClick"
  >
    <JournalHome
      v-if="page === 'home'"
      :posts="visiblePosts"
      :states="resourceStates"
      :all-posts="posts"
      :events="events"
      :discussions="discussions"
      :saved-posts="savedPosts"
      :reminders="reminders"
      :platform="platform"
      :sort="sort"
      :month="month"
      @save="save"
      @open="dialogs.openPost($event)"
      @platform="change('platform', $event)"
      @sort="change('sort', $event)"
      @retry="load()"
    />
    <JournalBrowse
      v-else-if="page === 'explore' || page === 'favorites'"
      :posts="visiblePosts"
      :all-posts="posts"
      :saved-posts="savedPosts"
      :favorites="page === 'favorites'"
      :query="query"
      :platform="platform"
      :sort="sort"
      :content-type="contentType"
      :layout="layout"
      :has-more="hasMore"
      :loading="loading"
      :state="browseState"
      :retry="retryBrowse"
      :data-testid="page === 'favorites' ? 'profile-favorites-tab' : undefined"
      @change="change"
      @reset="resetFilters"
      @save="save"
      @open="dialogs.openPost($event)"
      @more="load(true)"
      @explore="router.push('/explore')"
    />
    <JournalSchedule
      v-else-if="page === 'schedule'"
      :events="events"
      :month="month"
      :selected-day="param('day', 'all')"
      :view="param('calendar', 'week')"
      :reminders="reminders"
      :saved-only="param('saved') === '1'"
      :loading="loading"
      @change="change"
      ><template #state><JournalState :loading="false" :error="error" @retry="load()" /></template
    ></JournalSchedule>
    <JournalCommunity
      v-else
      :discussions="visibleDiscussions"
      :category="param('category', '全部')"
      :loading="loading"
      :error="error"
      :has-more="hasMore"
      @category="change('category', $event)"
      @compose="compose"
      @more="load(true)"
      ><template #state><JournalState :loading="loading" :error="error" @retry="load()" /></template
    ></JournalCommunity>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  inject,
  getCurrentInstance,
  createVNode,
  render,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useAuthStore, useFavoritesStore } from '@/stores'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import type { Discussion } from '@/api/discussionService'
import { isUuidV7String } from '@/types/publicId'
import { designEdition } from '@/config/designEdition'
import EditorialHome from './editions/EditorialHome.vue'
import ArchiveHome from './editions/ArchiveHome.vue'
import JournalState from './JournalState.vue'
import { journalAsyncView, useJournalModuleRecovery } from './asyncView'
import { useJournalData } from './useJournalData'
import { useJournal } from './context'
import { journalDialogsKey } from './useJournalDialogs'
import { journalEventsKey } from './useJournalEvents'
import { useJournalDiscussion } from './useJournalDiscussion'
import { journalFavoriteFeedback } from './feedback'
import { useJournalOperationScope } from './useJournalOperationScope'
import { discussionModel } from './models'
import type { JournalPost } from './models'
import type { JournalResourceState } from './resourceState'

const { t } = useI18n({ useScope: 'global' })
useJournalModuleRecovery()
const DiscussionComposer = defineAsyncComponent(
  () => import('@/components/community/DiscussionComposer.vue')
)
const JournalHome = designEdition === 'archive' ? ArchiveHome : EditorialHome
const JournalBrowse =
  designEdition === 'archive'
    ? journalAsyncView(() => import('./editions/ArchiveBrowse.vue'))
    : journalAsyncView(() => import('./editions/EditorialBrowse.vue'))
const JournalSchedule =
  designEdition === 'archive'
    ? journalAsyncView(() => import('./editions/ArchiveSchedule.vue'))
    : journalAsyncView(() => import('./editions/EditorialSchedule.vue'))
const JournalCommunity =
  designEdition === 'archive'
    ? journalAsyncView(() => import('./editions/ArchiveCommunity.vue'))
    : journalAsyncView(() => import('./editions/EditorialCommunity.vue'))
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  favorites = useFavoritesStore()
const dialogs = inject(journalDialogsKey)!
const eventDialogs = inject(journalEventsKey)!
const runtime = useJournal(),
  root = ref<HTMLElement>()
const discussionDialog = useJournalDiscussion(runtime)
const appContext = getCurrentInstance()!.appContext
let composerHost: HTMLElement | null = null
function unmountComposer() {
  if (composerHost) render(null, composerHost)
  composerHost = null
}
const page = computed(() =>
  import.meta.env.DEV && route.path.startsWith('/__journal/')
    ? String(route.params['page'])
    : ({
        '/': 'home',
        '/explore': 'explore',
        '/schedule': 'schedule',
        '/community': 'community',
        '/profile/favorites': 'favorites',
      }[route.path] ?? 'home')
)
const {
  posts,
  events,
  discussions,
  resourceStates,
  loading,
  error,
  hasMore,
  load,
  fixture,
  month,
} = useJournalData(page)
const browseState = computed<JournalResourceState>(() =>
  loading.value ? 'loading' : error.value ? 'error' : resourceStates.value.posts
)
async function retryBrowse() {
  await load(posts.value.length > 0 && hasMore.value)
}
const param = (key: string, fallback = '') =>
  typeof route.query[key] === 'string' ? (route.query[key] as string) : fallback
const query = computed(() => param('q')),
  platform = computed(() => param('platform', 'all')),
  sort = computed(() => param('sort', 'latest'))
const contentType = computed(() => param('type', '全部')),
  layout = computed(() =>
    ['grid', 'list', 'wall'].includes(param('view')) ? param('view') : 'grid'
  )
const visiblePosts = computed(() => {
  const values = posts.value.filter(
    (post) =>
      (platform.value === 'all' || post.platform === platform.value) &&
      (contentType.value === '全部' || post.type === contentType.value) &&
      (!(fixture.value || page.value === 'favorites') ||
        !query.value ||
        `${post.title} ${post.text} ${post.author} ${post.tags.join(' ')}`
          .toLowerCase()
          .includes(query.value.toLowerCase()))
  )
  return sort.value === 'popular'
    ? values.toSorted((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    : values
})
const visibleDiscussions = computed(() =>
  discussions.value.filter(
    (item) =>
      (param('category', '全部') === '全部' || item.category === param('category')) &&
      (!query.value ||
        `${item.title} ${item.text}`.toLowerCase().includes(query.value.toLowerCase()))
  )
)
const confirmedSaves = ref(new Map<string, boolean>())
const savedPosts = computed(
  () =>
    new Set(
      [
        ...favorites.items.map((item) => item.post_id),
        ...[...confirmedSaves.value].filter(([, saved]) => saved).map(([id]) => id),
      ].filter((id) => confirmedSaves.value.get(id) !== false)
    )
)
const pendingSaves = new Set<string>()
let saveObserver: IntersectionObserver | undefined
const checkingSaves = new Set<string>()
const operations = useJournalOperationScope(
  () => auth.user?.id,
  () => {
    pendingSaves.clear()
    checkingSaves.clear()
    confirmedSaves.value.clear()
    saveObserver?.disconnect()
    saveObserver = undefined
  }
)
const reminders = ref(new Set<string>())
const reminderKey = computed(() => `momichan-journal:reminders:${auth.user?.id ?? 'guest'}`)
function readReminders() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(reminderKey.value) || '[]')
    reminders.value = new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    )
  } catch {
    reminders.value = new Set()
  }
}
watch(
  reminderKey,
  () => {
    confirmedSaves.value = new Map()
    readReminders()
    unmountComposer()
  },
  { immediate: true }
)
function change(key: string, value: string) {
  const next: LocationQueryRaw = { ...route.query }
  if (!value || ['all', 'latest', 'grid', '全部', 'week'].includes(value)) delete next[key]
  else next[key] = value
  if (key === 'month') delete next['day']
  void router.replace({ path: route.path, query: next })
}
function resetFilters() {
  const next: LocationQueryRaw = { ...route.query }
  for (const key of ['q', 'platform', 'type', 'collection', 'sort']) delete next[key]
  void router.replace({ path: route.path, query: next })
}
async function requireAccount() {
  try {
    await ensureAuthStoreLoaded({ initialize: true })
  } catch {
    runtime.value?.UI.toast(t('journal.toast.connectFailed'), undefined, { type: 'error' })
    return false
  }
  if (auth.isAuthenticated) return true
  void router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}
async function save(post: JournalPost, event: MouseEvent) {
  if (!isUuidV7String(post.id)) {
    runtime.value?.UI.toast(t('journal.toast.favoriteUnavailable'), undefined, { type: 'error' })
    return
  }
  if (!(await requireAccount()) || pendingSaves.has(post.id)) return
  const currentSession = operations.capture()
  const button =
    event.currentTarget instanceof Element
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest('button')
        : null
  pendingSaves.add(post.id)
  try {
    const wasSaved = await favorites.checkFavorited(post.id)
    if (!currentSession()) return
    const originalPosition = favorites.items.findIndex((item) => item.post_id === post.id)
    const original = favorites.items[originalPosition]
    const result = wasSaved
      ? await favorites.removeFavoriteByPostId(post.id, journalFavoriteFeedback)
      : await favorites.addFavorite(post.id, undefined, journalFavoriteFeedback)
    if (!currentSession()) return
    if (!result.success) {
      runtime.value?.UI.toast(t('journal.toast.saveFailed'), undefined, { type: 'error' })
      return
    }
    confirmedSaves.value.set(post.id, !wasSaved)
    document.dispatchEvent(
      new CustomEvent('journalfavoritechange', { detail: { id: post.id, saved: !wasSaved } })
    )
    if (button) runtime.value?.Experience.savedFeedback(button, post.id, !wasSaved)
    runtime.value?.UI.toast(
      t(wasSaved ? 'journal.toast.favoriteRemoved' : 'journal.toast.favoriteAdded'),
      {
        label: t('spatial.undo'),
        run: async () => {
          if (!currentSession()) return
          if (pendingSaves.has(post.id)) throw new Error('journal-action-busy')
          pendingSaves.add(post.id)
          try {
            const restored = wasSaved
              ? original
                ? await favorites.restoreFavorite(
                    original,
                    Math.max(0, originalPosition),
                    journalFavoriteFeedback
                  )
                : await favorites.addFavorite(post.id, undefined, journalFavoriteFeedback)
              : await favorites.removeFavoriteByPostId(post.id, journalFavoriteFeedback)
            if (!currentSession()) return
            if (!restored.success) throw new Error('journal-action-failed')
            confirmedSaves.value.set(post.id, wasSaved)
            document.dispatchEvent(
              new CustomEvent('journalfavoritechange', {
                detail: { id: post.id, saved: wasSaved },
              })
            )
          } finally {
            if (currentSession()) pendingSaves.delete(post.id)
          }
        },
      },
      { type: 'success' }
    )
  } finally {
    if (currentSession()) pendingSaves.delete(post.id)
  }
}
function handleClick(event: MouseEvent) {
  const target =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>(
          '[data-open],[data-author-id],[data-author-query],[data-event],[data-remind],[data-discussion],[data-action],[data-save-id],[data-real-gallery]'
        )
      : null
  if (!target) return
  const data = target.dataset
  if (data['open'] && isUuidV7String(data['open'])) {
    const post = posts.value.find((item) => item.id === data['open'])
    if (post) void dialogs.openPost(post)
  }
  if (data['discussion']) {
    const item = discussions.value.find((entry) => entry.id === data['discussion'])
    if (item) discussionDialog.open(item)
  }
  if (data['action'] === 'compose') void compose()
}
function documentClick(event: MouseEvent) {
  if (!(event.target instanceof Node) || root.value?.contains(event.target)) return
  handleClick(event)
}
async function compose() {
  if ((!fixture.value && !(await requireAccount())) || !runtime.value) return
  renderComposer()
}
function renderComposer() {
  if (!runtime.value) return
  runtime.value.UI.openDialog('<div id="journal-composer-root"></div>', 'compose-dialog', {
    key: 'compose',
    labelKey: 'journal.community.draft',
    render: renderComposer,
  })
  composerHost = document.querySelector('#journal-composer-root')
  if (!composerHost) return
  const vnode = createVNode(DiscussionComposer, { journal: true, onCreated: created })
  vnode.appContext = appContext
  render(vnode, composerHost)
}
function created(item: Discussion) {
  discussionDialog.open(discussionModel(item))
}
function favoriteChanged(event: Event) {
  const value = (event as CustomEvent<{ id: string; saved: boolean }>).detail
  confirmedSaves.value.set(value.id, value.saved)
}
function storage(event: StorageEvent) {
  if (event.key === reminderKey.value) readReminders()
}
watch(
  [visiblePosts, () => auth.user?.id],
  async (_value, _previous, onCleanup) => {
    const currentSession = operations.capture()
    let currentWatch = true
    onCleanup(() => {
      currentWatch = false
    })
    saveObserver?.disconnect()
    saveObserver = undefined
    if (!auth.isAuthenticated || fixture.value) return
    await nextTick()
    if (!currentSession() || !currentWatch) return
    const observer = createVisibilityObserver(
      (entries) => {
        if (!currentSession() || saveObserver !== observer) return
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = (entry.target as HTMLElement).dataset['post']
          observer.unobserve(entry.target)
          if (!id || !isUuidV7String(id) || confirmedSaves.value.has(id) || checkingSaves.has(id))
            continue
          checkingSaves.add(id)
          void favorites
            .checkFavorited(id)
            .then((saved) => {
              if (currentSession()) confirmedSaves.value.set(id, saved)
            })
            .finally(() => {
              if (currentSession()) checkingSaves.delete(id)
            })
        }
      },
      { rootMargin: '100px' }
    )
    saveObserver = observer
    root.value?.querySelectorAll('.post-card').forEach((card) => observer.observe(card))
  },
  { immediate: true }
)
watch(
  () => [runtime.value, posts.value, events.value, discussions.value, route.query],
  async () => {
    dialogs.remember(posts.value)
    eventDialogs.remember(events.value)
    await nextTick()
    if (root.value) runtime.value?.mount(root.value)
  },
  { deep: false }
)
onMounted(() => {
  document.addEventListener('click', documentClick)
  document.addEventListener('dialogwillchange', unmountComposer)
  window.addEventListener('storage', storage)
  document.addEventListener('journalreminderschange', readReminders)
  document.addEventListener('journalfavoritechange', favoriteChanged)
})
onBeforeUnmount(() => {
  saveObserver?.disconnect()
  unmountComposer()
  document.removeEventListener('click', documentClick)
  document.removeEventListener('dialogwillchange', unmountComposer)
  window.removeEventListener('storage', storage)
  document.removeEventListener('journalreminderschange', readReminders)
  document.removeEventListener('journalfavoritechange', favoriteChanged)
})
</script>
