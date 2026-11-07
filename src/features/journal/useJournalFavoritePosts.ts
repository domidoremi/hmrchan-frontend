import { ref, watch, type Ref } from 'vue'
import { postService, type PostDetailResponse } from '@/api/postService'
import { useAuthStore, useFavoritesStore } from '@/stores'
import { favoriteModel, type JournalPost } from './models'

export function useJournalFavoritePosts(enabled: Ref<boolean>) {
  const auth = useAuthStore(),
    favorites = useFavoritesStore()
  const posts = ref<JournalPost[]>([])
  const details = new Map<string, PostDetailResponse>()
  let owner: string | undefined

  watch(
    [enabled, () => auth.user?.id, () => auth.isAuthenticated, () => favorites.items],
    async ([active, userId, authenticated], _, onCleanup) => {
      const controller = new AbortController()
      onCleanup(() => controller.abort())
      if (owner !== userId) {
        details.clear()
        owner = userId
      }
      if (!active || !authenticated) {
        posts.value = []
        return
      }
      const current = () => !controller.signal.aborted && auth.user?.id === userId
      const render = () => {
        if (current()) {
          posts.value = favorites.items.map((item) =>
            favoriteModel(item, details.get(item.post_id))
          )
        }
      }
      render()
      const queue = [...new Set(favorites.items.map((item) => item.post_id))].filter(
        (id) => !details.has(id)
      )
      async function worker() {
        while (current()) {
          const id = queue.shift()
          if (!id) return
          try {
            const detail = await postService.getPost(id, {
              signal: controller.signal,
              skipErrorToast: true,
            })
            if (!current()) return
            if (details.size >= 300) details.delete(details.keys().next().value!)
            details.set(id, detail)
            render()
          } catch {
            // Keep a saved entry available when its public detail cannot be loaded.
          }
        }
      }
      await Promise.all([worker(), worker()])
    },
    { immediate: true, deep: true }
  )
  return posts
}
