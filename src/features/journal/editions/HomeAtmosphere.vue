<template>
  <div ref="host" class="home-atmosphere" aria-hidden="true">
    <div class="home-atmosphere-field">
      <canvas ref="canvas" class="home-space-canvas" />
      <div class="home-light"><i /><i /></div>
      <div class="home-orbit"><i /><i /></div>
      <div class="home-rule" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { JournalPost } from '../models'
import { useHomeSpace } from './space/useHomeSpace'
import { useHomeScroll } from './useHomeScroll'
import '../styles/home-space.css'

const props = defineProps<{ posts: JournalPost[] }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const host = useTemplateRef<HTMLElement>('host')
const images = computed(() =>
  [...new Set(props.posts.flatMap(({ image }) => image ?? []))].slice(0, 5)
)
useHomeScroll()
useHomeSpace(canvas, host, () => images.value)
</script>
