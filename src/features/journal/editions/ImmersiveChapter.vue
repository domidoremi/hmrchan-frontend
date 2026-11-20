<template>
  <section ref="root" class="immersive-chapter" :data-chapter="kind" tabindex="-1">
    <div ref="stage" class="chapter-stage">
      <div class="chapter-surface">
        <div ref="content" class="chapter-content"><slot /></div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useChapterScene } from './useChapterScene'
import '../styles/chapters.css'
import '../styles/home-composition.css'
import '../styles/home-themes.css'

defineProps<{ kind: string }>()
const root = ref<HTMLElement>(),
  stage = ref<HTMLElement>(),
  content = ref<HTMLElement>()
useChapterScene(root, stage, content)
</script>
