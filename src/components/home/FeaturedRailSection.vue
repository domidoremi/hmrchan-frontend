<template>
  <section
    ref="element"
    class="rail home-screen"
    data-scroll-anchor="home-featured"
    :style="sceneStyle"
  >
    <div class="rail-sticky">
      <div class="rail-stage">
        <div class="rail-stage__chrome">
          <div class="rail-stage__eyebrow">
            <span class="rail-stage__index">{{ String(activeIndex + 1).padStart(2, '0') }}</span>
            <span class="rail-stage__label">{{ activeLabel }}</span>
          </div>
          <div class="rail-stage__dots" aria-hidden="true">
            <span
              v-for="slide in slides"
              :key="slide.key"
              class="rail-stage__dot"
              :class="{ 'is-active': slide.key === activeKey }"
            />
          </div>
        </div>

        <div class="rail-track" :style="trackStyle" role="list">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, type StyleValue } from 'vue'

defineOptions({ name: 'FeaturedRailSection' })

defineProps<{
  sceneStyle: StyleValue
  trackStyle: StyleValue
  slides: Array<{ key: string; label: string }>
  activeIndex: number
  activeKey?: string
  activeLabel?: string
}>()

const element = ref<HTMLElement | null>(null)

defineExpose({
  element,
})
</script>
