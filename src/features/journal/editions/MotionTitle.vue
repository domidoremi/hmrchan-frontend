<template>
  <span class="motion-title" aria-hidden="true">
    <span
      v-for="(letter, index) in letters"
      :key="index"
      class="motion-letter"
      :style="{ '--letter-index': Math.min(index, 18) }"
      >{{ letter }}</span
    >
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ text: string }>()
const letters = computed(() =>
  typeof Intl.Segmenter === 'function'
    ? Array.from(
        new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(props.text),
        (item) => item.segment
      )
    : Array.from(props.text)
)
</script>
