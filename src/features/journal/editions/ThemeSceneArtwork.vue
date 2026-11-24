<template>
  <svg
    class="theme-scene-art"
    viewBox="0 0 1440 900"
    preserveAspectRatio="xMidYMid slice"
    focusable="false"
  >
    <g v-if="preset === 'apple-native'" class="scene-quiet">
      <path class="scene-fill" d="M0 580h1440v126H0z" />
      <path d="M0 580h1440M0 706h1440" />
      <path class="scene-trace" d="M142 581h524" />
    </g>
    <g v-else-if="preset === 'material-expressive'" class="scene-tonal">
      <rect class="scene-fill" x="1050" y="100" width="470" height="312" rx="52" />
      <rect class="scene-companion" x="-144" y="555" width="500" height="238" rx="46" />
      <rect class="scene-trace" x="1066" y="119" width="420" height="275" rx="36" />
    </g>
    <g v-else-if="preset === 'fluent-workspace'" class="scene-workspace">
      <path class="scene-fill" d="M1030 0h410v900h-410z" />
      <path d="M130 0v900M1030 0v900M0 156h1440M0 767h1440" />
      <path class="scene-trace" d="M1030 156h304M130 480v287" />
    </g>
    <g v-else class="scene-index">
      <path
        d="M120 0v900M360 0v900M600 0v900M840 0v900M1080 0v900M1320 0v900M0 180h1440M0 450h1440M0 720h1440"
      />
      <path class="scene-fill" d="M1080 450h240v270h-240z" />
      <path class="scene-trace" d="M1080 450h240M360 720h240" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { AppearancePreset } from '@/types'

defineProps<{ preset: AppearancePreset }>()
</script>
