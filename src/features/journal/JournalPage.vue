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
      :events="events"
      :discussions="discussions"
      :saved-posts="savedPosts"
      :reminders="reminders"
      :platform="platform"
      :sort="sort"
      :month="month"
      @save="save"
      @platform="change('platform', $event)"
      @sort="change('sort', $event)"
    >
      <template #state
        ><JournalState
          :loading="loading"
          :error="error"
          :empty="!visiblePosts.length"
          @retry="load()"
      /></template>
    </JournalHome>
    <JournalBrowse
      v-else-if="page === 'explore' || page === 'favorites'"
      :posts="visiblePosts"
      :saved-posts="savedPosts"
      :favorites="page === 'favorites'"
      :query="query"
      :platform="platform"
      :sort="sort"
      :content-type="contentType"
      :layout="layout"
      :collection="param('collection')"
      :has-more="hasMore"
      :loading="loading"
      :fixture="fixture"
      :data-testid="page === 'favorites' ? 'profile-favorites-tab' : undefined"
      @change="change"
      @reset="resetFilters"
      @save="save"
      @more="load(true)"
    >
      <template #empty
        ><div v-if="!loading && !error" class="empty-state">
          <JournalIcon name="compass" />
          <h3>{{ page === 'favorites' ? '还没有收藏' : '没有找到相关内容' }}</h3>
          <button
            v-if="page === 'favorites'"
            class="button button-outline button-small"
            @click="router.push('/explore')"
          >
            查看动态</button
          ><button v-else class="button button-outline button-small" @click="resetFilters">
            重置筛选
          </button>
        </div></template
      >
      <template #state><JournalState :loading="loading" :error="error" @retry="load()" /></template>
    </JournalBrowse>
    <JournalSchedule
      v-else-if="page === 'schedule'"
      :events="events"
      :month="month"
      :selected-day="param('day', 'all')"
      :view="param('calendar', 'week')"
      :reminders="reminders"
      :saved-only="param('saved') === '1'"
      :loading="loading"
      :fixture="fixture"
      @change="change"
      ><template #state><JournalState :loading="false" :error="error" @retry="load()" /></template
    ></JournalSchedule>
    <JournalCommunity
      v-else
      :fixture="fixture"
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
    <dialog
      ref="composer"
      class="journal-compose"
      aria-labelledby="compose-title"
      @click="closeOnBackdrop"
    >
      <header>
        <h2 id="compose-title">发起讨论</h2>
        <button class="icon-button" aria-label="关闭" @click="composer?.close()">
          <JournalIcon name="x" />
        </button>
      </header>
      <DiscussionComposer v-if="composeMounted" @created="created" />
    </dialog>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useAuthStore, useFavoritesStore } from '@/stores'
import { ensureAuthStoreLoaded } from '@/services/authSurface'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import type { Discussion } from '@/api/discussionService'
import { isUuidV7String } from '@/types/publicId'
import JournalHome from './JournalHome.vue'
import JournalBrowse from './JournalBrowse.vue'
import JournalSchedule from './JournalSchedule.vue'
import JournalCommunity from './JournalCommunity.vue'
import JournalIcon from './JournalIcon.vue'
import JournalState from './JournalState.vue'
import { useJournalData } from './useJournalData'
import { useJournal } from './context'
import type { JournalPost } from './models'

const DiscussionComposer = defineAsyncComponent(
  () => import('@/components/community/DiscussionComposer.vue')
)
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore(),
  favorites = useFavoritesStore()
const runtime = useJournal(),
  root = ref<HTMLElement>(),
  composer = ref<HTMLDialogElement>(),
  composeMounted = ref(false)
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
const { posts, events, discussions, loading, error, hasMore, load, fixture, month } =
  useJournalData(page)
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
      (!(fixture.value || page.value === 'favorites' || Boolean(param('collection'))) ||
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
    composer.value?.close()
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
    runtime.value?.UI.toast('暂时无法连接，请重试')
    return false
  }
  if (auth.isAuthenticated) return true
  void router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}
async function save(post: JournalPost, event: MouseEvent) {
  if (!isUuidV7String(post.id)) {
    runtime.value?.UI.toast('这张照片收在主题合集里')
    return
  }
  if (!(await requireAccount()) || pendingSaves.has(post.id)) return
  const user = auth.user?.id
  const button =
    event.currentTarget instanceof Element
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest('button')
        : null
  pendingSaves.add(post.id)
  try {
    const wasSaved = await favorites.checkFavorited(post.id)
    if (auth.user?.id !== user) return
    const original = favorites.items.find((item) => item.post_id === post.id)
    const result = wasSaved
      ? await favorites.removeFavoriteByPostId(post.id)
      : await favorites.addFavorite(post.id)
    if (auth.user?.id !== user) return
    if (!result.success) {
      runtime.value?.UI.toast('暂时未能保存，请重试')
      return
    }
    confirmedSaves.value.set(post.id, !wasSaved)
    if (button) runtime.value?.Experience.savedFeedback(button, post.id, !wasSaved)
    runtime.value?.UI.toast(wasSaved ? '已取消收藏' : '已收藏', {
      label: '撤销',
      run: () => {
        void (async () => {
          if (auth.user?.id !== user || pendingSaves.has(post.id)) return
          pendingSaves.add(post.id)
          try {
            const restored = wasSaved
              ? original
                ? await favorites.restoreFavorite(original)
                : await favorites.addFavorite(post.id)
              : await favorites.removeFavoriteByPostId(post.id)
            if (auth.user?.id === user && restored.success)
              confirmedSaves.value.set(post.id, wasSaved)
          } finally {
            pendingSaves.delete(post.id)
          }
        })()
      },
    })
  } finally {
    pendingSaves.delete(post.id)
  }
}
function remind(id: string) {
  const next = new Set(reminders.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  try {
    localStorage.setItem(reminderKey.value, JSON.stringify([...next]))
    reminders.value = next
    runtime.value?.UI.toast(next.has(id) ? '已记下' : '已移除')
  } catch {
    runtime.value?.UI.toast('暂时未能保存，请重试')
  }
}
function eventDialog(id: string) {
  const event = events.value.find((item) => item.id === id),
    ui = runtime.value?.UI
  if (!event || !ui) return
  const esc = ui.escape
  const href = event.url && /^https?:\/\//i.test(event.url) ? event.url : null
  ui.openDialog(
    `<div class="event-detail"><span class="eyebrow">${esc(event.type)}</span><h2 id="dialog-title">${esc(event.title)}</h2><p class="dialog-copy">${event.month} 月 ${event.day} 日 · ${esc(event.time)}<br>${esc(event.venue)}</p><p class="dialog-copy">${esc(event.description)}</p><div class="dialog-actions"><button class="button button-dark" data-remind="${esc(id)}">${ui.icon('bookmark')}${reminders.value.has(id) ? '已记下' : '记下日程'}</button>${href ? `<a class="button button-outline" href="${esc(href)}" target="_blank" rel="noopener noreferrer">活动详情 ${ui.icon('arrow-up-right')}</a>` : ''}</div></div>`,
    '',
    { key: `event:${id}`, render: () => eventDialog(id) }
  )
}
let previewPost: JournalPost | undefined
function postDialog(post: JournalPost) {
  const ui = runtime.value?.UI
  if (!ui) return
  previewPost = post
  const esc = ui.escape,
    saved = savedPosts.value.has(post.id)
  const media = post.image
    ? `<button class="detail-photo-open" data-real-gallery="${esc(post.id)}" aria-label="查看大图"><img class="detail-photo" src="${esc(post.image)}" alt="${esc(post.title)}" width="400" height="500"><span>${ui.icon('expand')} 查看大图</span></button>`
    : `<div class="detail-text">${esc(post.text)}</div>`
  ui.openDialog(
    `<div class="post-detail"><div>${media}</div><div class="detail-copy"><div class="post-meta"><span class="platform">${esc(post.platform)}</span><span>${esc(post.time)}</span></div><h2 id="dialog-title">${esc(post.title)}</h2><p class="dialog-copy">${esc(post.text)}</p><div class="detail-tags">${post.tags.map((tag) => `<span class="badge badge-purple"># ${esc(tag)}</span>`).join('')}</div><button class="detail-author" data-author-id="${esc(post.authorId || '')}" data-author-query="${esc(post.author)}"><img src="${esc(post.avatar)}" alt="" width="33" height="33"><span>${esc(post.author)}<small>作者 ${ui.icon('arrow-up-right')}</small></span></button><div class="detail-actions"><button class="button button-dark button-small detail-save" data-save-id="${esc(post.id)}" aria-pressed="${saved}">${ui.icon('bookmark')}${saved ? '已收藏' : '收藏'}</button><a class="button button-outline button-small" href="/post/${esc(post.id)}">查看动态 ${ui.icon('arrow-up-right')}</a></div></div></div>`,
    'detail-dialog',
    { key: `post:${post.id}`, render: () => postDialog(post) }
  )
}
function realGallery(post: JournalPost) {
  const ui = runtime.value?.UI
  if (!ui || !post.image) return
  const esc = ui.escape
  ui.openDialog(
    `<div class="gallery-toolbar"><div><span class="eyebrow">PHOTOS</span><h2 id="dialog-title">${esc(post.title)}</h2></div><button class="icon-button" data-gallery-zoom aria-label="放大图片" aria-pressed="false">${ui.icon('expand')}</button></div><div class="gallery-stage"><div class="gallery-image-area"><img class="gallery-image" src="${esc(post.image)}" alt="${esc(post.title)}" width="900" height="1200"></div></div><div class="gallery-footer"><div class="gallery-counter">01<span> / 01</span></div><a class="text-button" href="/post/${esc(post.id)}">查看动态 ${ui.icon('arrow-up-right')}</a></div>`,
    'gallery-dialog journal-real-gallery',
    { key: `gallery:${post.id}`, render: () => realGallery(post) }
  )
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
    if (post) postDialog(post)
  }
  if (data['realGallery'] && previewPost?.id === data['realGallery']) realGallery(previewPost)
  if (data['saveId'] && previewPost?.id === data['saveId']) {
    const post = previewPost
    void save(post, event).then(() => {
      if (document.querySelector('#app-dialog.detail-dialog[open]')) postDialog(post)
    })
  }
  if (data['authorId']) void router.push(`/author/${data['authorId']}`)
  else if (data['authorQuery'])
    void router.push({ path: '/search', query: { q: data['authorQuery'] } })
  if (data['event']) eventDialog(data['event'])
  if (data['remind']) {
    remind(data['remind'])
    if (target.closest('#app-dialog')) eventDialog(data['remind'])
  }
  if (data['discussion'] && isUuidV7String(data['discussion']))
    void router.push(`/community/discussions/${data['discussion']}`)
  if (data['action'] === 'compose') void compose()
}
function documentClick(event: MouseEvent) {
  if (!(event.target instanceof Node) || root.value?.contains(event.target)) return
  handleClick(event)
}
async function compose() {
  if (!(await requireAccount())) return
  composeMounted.value = true
  await nextTick()
  composer.value?.showModal()
}
function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== composer.value) return
  const rect = composer.value.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    composer.value.close()
}
function created(item: Discussion) {
  composer.value?.close()
  void router.push(`/community/discussions/${item.id}`)
}
function storage(event: StorageEvent) {
  if (event.key === reminderKey.value) readReminders()
}
let saveObserver: IntersectionObserver | undefined
const checkingSaves = new Set<string>()
watch(
  [visiblePosts, () => auth.user?.id],
  async () => {
    saveObserver?.disconnect()
    if (!auth.isAuthenticated || fixture.value) return
    await nextTick()
    const userId = auth.user?.id
    saveObserver = createVisibilityObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = (entry.target as HTMLElement).dataset['post']
          saveObserver?.unobserve(entry.target)
          if (!id || !isUuidV7String(id) || confirmedSaves.value.has(id) || checkingSaves.has(id))
            continue
          checkingSaves.add(id)
          void favorites
            .checkFavorited(id)
            .then((saved) => {
              if (auth.user?.id === userId) confirmedSaves.value.set(id, saved)
            })
            .finally(() => checkingSaves.delete(id))
        }
      },
      { rootMargin: '100px' }
    )
    root.value?.querySelectorAll('.post-card').forEach((card) => saveObserver?.observe(card))
  },
  { immediate: true }
)
watch(
  () => [runtime.value, posts.value, events.value, discussions.value, route.query],
  async () => {
    await nextTick()
    if (root.value) runtime.value?.mount(root.value)
  },
  { deep: false }
)
onMounted(() => {
  document.addEventListener('click', documentClick)
  window.addEventListener('storage', storage)
})
onBeforeUnmount(() => {
  saveObserver?.disconnect()
  composer.value?.close()
  document.removeEventListener('click', documentClick)
  window.removeEventListener('storage', storage)
})
</script>
