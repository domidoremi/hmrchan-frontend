import { computed, onBeforeUnmount, onDeactivated, onMounted, ref, watch, type Ref } from 'vue'
import type { DiscussionCategory, PostReference } from '@/api/discussionService'
import { registerPrivateSessionReset } from '@/services/privateSessionState'

export interface DiscussionDraft {
  title: string
  content: string
  tagInput: string
  tags: string[]
  selectedPosts: PostReference[]
  category: DiscussionCategory
}
type Fields = { [K in keyof DiscussionDraft]: Ref<DiscussionDraft[K]> }
const emptyDraft = (): DiscussionDraft => ({
  title: '',
  content: '',
  tagInput: '',
  tags: [],
  selectedPosts: [],
  category: 'general',
})
const draftKey = (owner: string) => `momichan:discussion-draft:v1:${owner}`
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

export function decodeDiscussionDraft(
  raw: string | null,
  now = Date.now()
): DiscussionDraft | null {
  if (!raw || raw.length > 60000) return null
  try {
    const value = JSON.parse(raw)
    if (
      value.version !== 1 ||
      !Number.isFinite(value.savedAt) ||
      now - value.savedAt > MAX_AGE ||
      value.savedAt > now + 60000
    )
      return null
    if (typeof value.title !== 'string' || typeof value.content !== 'string') return null
    return {
      title: value.title.slice(0, 200),
      content: value.content.slice(0, 10000),
      tagInput: typeof value.tagInput === 'string' ? value.tagInput.slice(0, 200) : '',
      category: ['general', 'question', 'sharing', 'feedback'].includes(value.category)
        ? value.category
        : 'general',
      tags: Array.isArray(value.tags)
        ? value.tags
            .filter((tag: unknown) => typeof tag === 'string')
            .slice(0, 5)
            .map((tag: string) => tag.slice(0, 100))
        : [],
      selectedPosts: Array.isArray(value.selectedPosts)
        ? value.selectedPosts
            .filter(
              (post: unknown): post is PostReference =>
                !!post &&
                typeof post === 'object' &&
                'id' in post &&
                typeof post.id === 'string' &&
                'title' in post &&
                typeof post.title === 'string'
            )
            .slice(0, 5)
            .map((post: PostReference) => ({
              id: post.id.slice(0, 100),
              title: post.title.slice(0, 200),
            }))
        : [],
    }
  } catch {
    return null
  }
}

export function useDiscussionDraft(userId: () => string | undefined, fields: Fields) {
  const status = ref<'idle' | 'pending' | 'saved' | 'failed'>('idle')
  const undoDraft = ref<DiscussionDraft | null>(null)
  let owner: string | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let hydrating = false
  const value = computed<DiscussionDraft>(() => ({
    title: fields.title.value,
    content: fields.content.value,
    tagInput: fields.tagInput.value,
    tags: fields.tags.value,
    selectedPosts: fields.selectedPosts.value,
    category: fields.category.value,
  }))
  const hasDraft = computed(() =>
    Boolean(
      value.value.title ||
      value.value.content ||
      value.value.tagInput ||
      value.value.tags.length ||
      value.value.selectedPosts.length
    )
  )
  function cancel() {
    clearTimeout(timer)
    timer = undefined
  }
  function apply(draft: DiscussionDraft) {
    hydrating = true
    fields.title.value = draft.title
    fields.content.value = draft.content
    fields.tagInput.value = draft.tagInput
    fields.tags.value = [...draft.tags]
    fields.selectedPosts.value = [...draft.selectedPosts]
    fields.category.value = draft.category
    hydrating = false
  }
  function save() {
    cancel()
    if (!owner || typeof window === 'undefined') return
    try {
      if (hasDraft.value)
        localStorage.setItem(
          draftKey(owner),
          JSON.stringify({ ...value.value, version: 1, savedAt: Date.now() })
        )
      else localStorage.removeItem(draftKey(owner))
      status.value = hasDraft.value ? 'saved' : 'idle'
    } catch {
      status.value = 'failed'
    }
  }
  watch(
    userId,
    (next) => {
      if (owner) save()
      owner = next
      undoDraft.value = null
      apply(emptyDraft())
      status.value = 'idle'
      if (!owner || typeof window === 'undefined') return
      try {
        const draft = decodeDiscussionDraft(localStorage.getItem(draftKey(owner)))
        if (draft) {
          apply(draft)
          status.value = 'saved'
        }
      } catch {
        status.value = 'failed'
      }
    },
    { immediate: true, flush: 'sync' }
  )
  watch(
    value,
    () => {
      if (hydrating || !owner) return
      undoDraft.value = null
      status.value = 'pending'
      cancel()
      timer = setTimeout(save, 350)
    },
    { deep: true, flush: 'sync' }
  )
  function clear() {
    undoDraft.value = hasDraft.value
      ? (JSON.parse(JSON.stringify(value.value)) as DiscussionDraft)
      : null
    apply(emptyDraft())
    save()
  }
  function restore() {
    if (!undoDraft.value || owner !== userId()) return
    apply(undoDraft.value)
    undoDraft.value = null
    save()
  }
  function discard() {
    apply(emptyDraft())
    undoDraft.value = null
    save()
  }
  const unregister = registerPrivateSessionReset(() => {
    save()
    owner = undefined
    cancel()
    apply(emptyDraft())
    undoDraft.value = null
    status.value = 'idle'
  })
  onMounted(() => window.addEventListener('pagehide', save))
  onDeactivated(save)
  onBeforeUnmount(() => {
    save()
    cancel()
    unregister()
    window.removeEventListener('pagehide', save)
  })
  return {
    status,
    hasDraft,
    canUndo: computed(() => undoDraft.value !== null),
    clear,
    restore,
    discard,
  }
}
