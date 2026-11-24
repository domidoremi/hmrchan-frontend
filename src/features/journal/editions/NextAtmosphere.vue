<template>
  <div ref="host" class="idol-atmosphere" :data-scene="preset" aria-hidden="true">
    <div class="idol-atmosphere-field">
      <div class="idol-atmosphere-plane">
        <div class="idol-atmosphere-wash" />
        <div class="idol-atmosphere-beam" />
        <div class="idol-atmosphere-edge" />
        <svg
          class="idol-atmosphere-drawing"
          viewBox="0 0 1440 1000"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <g v-if="preset === 'apple-native'" class="ambient-plane">
            <path class="ambient-filled" d="M-90 181h1620v136H-90z" />
            <path d="M-90 181h1620M-90 317h1620" />
          </g>
          <g v-else-if="preset === 'material-expressive'" class="ambient-tonal">
            <rect class="ambient-filled" x="944" y="110" width="550" height="320" rx="72" />
            <rect class="ambient-companion" x="-186" y="557" width="510" height="275" rx="58" />
          </g>
          <g v-else-if="preset === 'fluent-workspace'" class="ambient-workspace">
            <path class="ambient-filled" d="M1146 0h294v1000h-294z" />
            <path d="M126 0v1000M1146 0v1000M0 250h1440M0 752h1440" />
          </g>
          <g v-else class="ambient-index">
            <path
              d="M120 0v1000M360 0v1000M600 0v1000M840 0v1000M1080 0v1000M1320 0v1000M0 250h1440M0 500h1440M0 750h1440"
            />
            <path class="ambient-track" d="M1080 250h240M120 750h240" />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAtmosphereScroll } from './useAtmosphereScroll'
import '../styles/idol-atmosphere.css'

const host = useTemplateRef<HTMLElement>('host')
const settings = useSettingsStore()
const preset = computed(() => settings.settings.appearancePreset)
useAtmosphereScroll(host)
</script>
