<template>
  <PostPreviewModal
    v-model:isOpen="isOpen"
    :post-id="postId"
    :initial-post="initialPost"
    :initial-thumbnail-src="initialThumbnailSrc"
    @open-detail="emit('open-detail', $event)"
  />
</template>

<script setup lang="ts">
import type { PostListItem } from '@/api'
import PostPreviewModal from '@/components/business/PostPreviewModal.vue'

defineOptions({ name: 'HomepagePreviewController' })

const isOpen = defineModel<boolean>('isOpen', { required: true })

defineProps<{
  postId: string | null
  initialPost: PostListItem | null
  initialThumbnailSrc: string | null
}>()

const emit = defineEmits<{
  (event: 'open-detail', postId: string): void
}>()
</script>
