<template>
  <div ref="host" class="brand-raw-page"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { mountPageRuntime, teardownPageRuntime } from '@/brand-appart/runtime/brandAppartRuntime'
import { createMirrorPageSource } from '@/brand-appart/content/pageSources'

const props = defineProps<{
  mirrorPath: string
  requestedPath?: string
  notFound?: boolean
}>()

const router = useRouter()
const host = ref<HTMLElement | null>(null)
let renderToken = 0

async function renderMirrorPage(): Promise<void> {
  if (!host.value) {
    return
  }

  const token = ++renderToken
  const source = createMirrorPageSource(props.mirrorPath, {
    key: props.mirrorPath,
    requestedPath: props.requestedPath,
    notFound: props.notFound,
    status: props.notFound ? 404 : undefined,
  })

  await mountPageRuntime(source, host.value, router)

  if (token !== renderToken) {
    return
  }
}

onMounted(() => {
  void renderMirrorPage()
})

watch(
  () => props.mirrorPath,
  () => {
    void renderMirrorPage()
  }
)

onBeforeUnmount(() => {
  teardownPageRuntime()
})
</script>
