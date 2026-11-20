<template>
  <section ref="root" class="immersive-chapter" :data-chapter="kind" tabindex="-1">
    <div ref="stage" class="chapter-stage">
      <div class="chapter-surface">
        <div class="chapter-atmosphere" aria-hidden="true"><i /><i /></div>
        <div ref="content" class="chapter-content"><slot /></div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useChapterScene } from './useChapterScene'
import '../styles/chapters.css'

const props = withDefaults(defineProps<{ kind: string; opening?: boolean }>(), { opening: false })
const root = ref<HTMLElement>(),
  stage = ref<HTMLElement>(),
  content = ref<HTMLElement>()
useChapterScene(root, stage, content, props.opening)
</script>
