<template>
  <img
    :key="activeSource"
    class="public-author-avatar"
    :src="activeSource"
    :width="size"
    :height="size"
    :data-author-id="authorId || undefined"
    :data-avatar-state="
      pendingLookup ? 'loading' : activeSource === AUTHOR_AVATAR_FALLBACK ? 'fallback' : 'resolved'
    "
    :alt="activeSource ? alt : ''"
    :loading="loading"
    decoding="async"
    referrerpolicy="no-referrer"
    @error="onError"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AUTHOR_AVATAR_FALLBACK,
  loadPublicAuthorAvatar,
  publicAuthorAvatar,
} from '@/utils/publicAuthorAvatar'

const props = withDefaults(
  defineProps<{
    src?: string | null | undefined
    authorId?: string | null | undefined
    alt?: string
    size: number
    loading?: 'lazy' | 'eager'
  }>(),
  { alt: '', loading: 'lazy' }
)
const source = computed(() => publicAuthorAvatar(props.src))
const verified = ref<string>()
const failed = ref<string>()
const pendingLookup = ref(false)
const candidate = computed(() => source.value ?? verified.value)
const activeSource = computed(() =>
  candidate.value && candidate.value !== failed.value
    ? candidate.value
    : pendingLookup.value
      ? undefined
      : AUTHOR_AVATAR_FALLBACK
)

watch(
  [source, () => props.authorId],
  ([portrait, id], _, onCleanup) => {
    verified.value = undefined
    failed.value = undefined
    pendingLookup.value = !portrait && Boolean(id)
    if (portrait || !id) return
    let current = true
    onCleanup(() => (current = false))
    void loadPublicAuthorAvatar(id).then((value) => {
      if (current) {
        verified.value = value
        pendingLookup.value = false
      }
    })
  },
  { immediate: true }
)

function onError(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (image.getAttribute('src') === candidate.value) failed.value = candidate.value
}
</script>

<style scoped>
.public-author-avatar {
  flex: none;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
}
</style>
