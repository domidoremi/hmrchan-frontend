<template>
  <div ref="host" class="home-atmosphere" :data-scene="preset" aria-hidden="true">
    <div class="home-atmosphere-field">
      <div class="atmosphere-far" />
      <div class="atmosphere-near"><ThemeSceneArtwork :preset="preset" /></div>
      <div class="atmosphere-light" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import ThemeSceneArtwork from './ThemeSceneArtwork.vue'
import { useAtmosphereScroll } from './useAtmosphereScroll'
import { useHomeScroll } from './useHomeScroll'
import '../styles/scene-artwork.css'

const host = useTemplateRef<HTMLElement>('host')
const settings = useSettingsStore()
const preset = computed(() => settings.settings.appearancePreset)
useHomeScroll()
useAtmosphereScroll(host)
</script>
