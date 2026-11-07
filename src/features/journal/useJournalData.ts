import { ref, computed, watch, onScopeDispose, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import photos from './photos.json'
const collectionPhotos: Record<string, string[]> = {
  letters: ['garden', 'memory'],
  daydream: ['pink', 'shop'],
  encore: ['stage', 'radio', 'cheer'],
}
import { postService } from '@/api/postService'
import { searchService } from '@/api/searchService'
import { discussionService } from '@/api/discussionService'
import { scheduleService } from '@/api/scheduleService'
import { useAuthStore, useFavoritesStore } from '@/stores'
import {
  postModel,
  discussionModel,
  eventModel,
  favoriteModel,
  type JournalPost,
  type JournalEvent,
  type JournalDiscussion,
} from './models'

export function useJournalData(page: Ref<string>) {
  const route = useRoute(),
    auth = useAuthStore(),
    favorites = useFavoritesStore()
  const posts = ref<JournalPost[]>([]),
    events = ref<JournalEvent[]>([]),
    discussions = ref<JournalDiscussion[]>([])
  const loading = ref(false),
    error = ref(''),
    hasMore = ref(false)
  let cursor: string | null = null,
    controller: AbortController | null = null,
    generation = 0
  const fixture = computed(
    () => import.meta.env.DEV && route.query['journal-fixture'] === 'reference'
  )
  const query = computed(() => (typeof route.query['q'] === 'string' ? route.query['q'] : ''))
  const month = computed(() => {
    const value = route.query['month']
    if (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value
    return fixture.value
      ? '2026-11'
      : new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
        }).format(new Date())
  })
  async function load(more = false) {
    if (more && (loading.value || !hasMore.value)) return
    controller?.abort()
    const current = new AbortController()
    controller = current
    const request = ++generation
    const valid = () => request === generation && !current.signal.aborted
    const config = { signal: current.signal, skipErrorToast: true }
    loading.value = true
    error.value = ''
    if (!more) {
      cursor = null
      hasMore.value = false
      posts.value = []
      events.value = []
      discussions.value = []
    }
    try {
      if (import.meta.env.DEV && fixture.value) {
        const reference = await import('./reference-data.json')
        if (!valid()) return
        posts.value =
          page.value === 'favorites'
            ? []
            : reference.posts.map((post) => ({
                ...post,
                image: post.image ? '/journal/' + post.image : null,
                avatar: '/journal/himeri-garden.webp',
                authorId: null,
              }))
        events.value = reference.events.map((event) => ({
          ...event,
          month: 11,
          date: '2026-11-' + String(event.day).padStart(2, '0'),
          description: event.desc,
          url: null,
        }))
        discussions.value = reference.discussions
        return
      }
      const collection =
        typeof route.query['collection'] === 'string'
          ? collectionPhotos[route.query['collection']]
          : undefined
      if (collection && page.value === 'explore') {
        posts.value = collection.flatMap((id) => {
          const item = photos.find((photo) => photo.id === id)
          return item
            ? [
                {
                  ...item,
                  image: '/journal/' + item.image,
                  avatar: '/journal/himeri-garden.webp',
                  authorId: null,
                  time: '',
                  likes: 0,
                  platform: 'official',
                  editorial: true,
                },
              ]
            : []
        })
        return
      }
      const jobs: Promise<void>[] = []
      if (page.value === 'home' || page.value === 'explore')
        jobs.push(
          (async () => {
            const response = query.value
              ? await searchService.searchPosts({ q: query.value, limit: 24, cursor }, config)
              : await postService.listPosts({ limit: 24, cursor }, config)
            if (!valid()) return
            const mapped = response.items.map(postModel)
            posts.value = more
              ? [
                  ...posts.value,
                  ...mapped.filter((item) => !posts.value.some((old) => old.id === item.id)),
                ]
              : mapped
            cursor = response.next_cursor ?? null
            hasMore.value = Boolean(response.has_more && cursor)
          })()
        )
      if (page.value === 'favorites' && auth.isAuthenticated)
        jobs.push(
          (async () => {
            const ok = await favorites.fetchFavorites(!more)
            if (!valid()) return
            if (!ok) throw new Error('收藏暂时无法加载')
            posts.value = favorites.items.map(favoriteModel)
            hasMore.value = favorites.hasMore
          })()
        )
      if (page.value === 'schedule' || page.value === 'home')
        jobs.push(
          (async () => {
            const [year, number] = month.value.split('-').map(Number)
            const lastDay = new Date(year!, number!, 0).getDate()
            const collected: JournalEvent[] = []
            let next: string | null = null
            do {
              const response = await scheduleService.list(
                {
                  limit: 100,
                  cursor: next,
                  start: month.value + '-01T00:00:00+08:00',
                  end: month.value + '-' + lastDay + 'T23:59:59+08:00',
                  published_only: true,
                },
                config
              )
              if (!valid()) return
              collected.push(...response.items.map(eventModel))
              next = response.has_more ? (response.next_cursor ?? null) : null
            } while (next)
            events.value = collected
          })()
        )
      if (page.value === 'community' || page.value === 'home')
        jobs.push(
          (async () => {
            const response = await discussionService.list(
              { limit: 20, ...(more && cursor ? { cursor } : {}) },
              config
            )
            if (!valid()) return
            const mapped = response.items.map(discussionModel)
            discussions.value = more
              ? [
                  ...discussions.value,
                  ...mapped.filter((item) => !discussions.value.some((old) => old.id === item.id)),
                ]
              : mapped
            if (page.value === 'community') {
              cursor = response.next_cursor ?? null
              hasMore.value = Boolean(response.has_more && cursor)
            }
          })()
        )
      const results = await Promise.allSettled(jobs)
      if (valid() && results.some((result) => result.status === 'rejected'))
        error.value = '暂时无法加载，请重试'
    } catch {
      if (valid()) error.value = '暂时无法加载，请重试'
    } finally {
      if (request === generation) loading.value = false
    }
  }
  watch(
    [
      page,
      () => (['home', 'explore'].includes(page.value) ? query.value : ''),
      month,
      fixture,
      () => route.query['collection'],
      () => (page.value === 'favorites' ? auth.user?.id : undefined),
    ],
    () => {
      void load()
    },
    { immediate: true }
  )
  watch(
    () => favorites.items,
    (items) => {
      if (page.value === 'favorites' && !fixture.value)
        posts.value = auth.isAuthenticated ? items.map(favoriteModel) : []
    },
    { deep: true }
  )
  onScopeDispose(() => {
    generation++
    controller?.abort()
  })
  return { posts, events, discussions, loading, error, hasMore, load, fixture, month }
}
