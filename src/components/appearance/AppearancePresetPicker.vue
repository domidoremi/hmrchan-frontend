<template>
  <div class="appearance-preset-picker" data-testid="appearance-preset-picker">
    <button
      v-for="spec in presetSpecs"
      :key="spec.preset"
      type="button"
      class="appearance-preset-card"
      :class="{ 'appearance-preset-card--active': settings.appearancePreset === spec.preset }"
      :data-preset="spec.preset"
      :aria-pressed="settings.appearancePreset === spec.preset"
      :aria-label="t(`settings.presets.${spec.preset}`)"
      @click="settingsStore.setAppearancePreset(spec.preset)"
    >
      <span class="appearance-preset-card__preview" aria-hidden="true">
        <span class="preset-preview-header"><i /><i /><i /></span>
        <span class="preset-preview-layout"
          ><i /><span><b /><b /><b /></span
        ></span>
        <span class="preset-preview-cards"><i /><i /><i /></span>
      </span>
      <span class="appearance-preset-card__footer">
        <span class="appearance-preset-card__title">{{
          t(`settings.presets.${spec.preset}`)
        }}</span>
        <Check v-if="settings.appearancePreset === spec.preset" :size="16" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { getAppearancePresetSpecs } from '@/config/appearance'
import { useSettingsStore } from '@/stores'

defineOptions({ name: 'AppearancePresetPicker' })
const { t } = useI18n()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const presetSpecs = getAppearancePresetSpecs()
</script>

<style scoped>
.appearance-preset-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.appearance-preset-card {
  display: grid;
  gap: 0.75rem;
  min-inline-size: 0;
  padding: 0.75rem;
  text-align: start;
  border: 1px solid var(--appearance-border);
  border-radius: var(--appearance-radius-panel);
  background: var(--appearance-surface-1);
  color: var(--appearance-text-primary);
  transition:
    border-color 180ms,
    box-shadow 180ms;
}
.appearance-preset-card:hover,
.appearance-preset-card--active {
  border-color: var(--appearance-accent);
}
.appearance-preset-card--active {
  box-shadow: 0 0 0 1px var(--appearance-accent);
}
.appearance-preset-card:focus-visible {
  outline: 2px solid var(--appearance-accent);
  outline-offset: 3px;
}
.appearance-preset-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.875rem;
}
.appearance-preset-card__preview {
  --preview-bg: #f6f3eb;
  --preview-ink: #45483b;
  --preview-accent: #a13c30;
  --preview-radius: 0.125rem;
  display: grid;
  gap: 0.625rem;
  padding: 0.875rem;
  aspect-ratio: 1.65;
  overflow: hidden;
  border-radius: 0.5rem;
  background: var(--preview-bg);
  color: var(--preview-ink);
  border: 1px solid color-mix(in srgb, var(--preview-ink) 20%, transparent);
}
.preset-preview-header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-block-end: 1px solid currentColor;
  padding-block-end: 0.5rem;
}
.preset-preview-header i {
  block-size: 0.1875rem;
  inline-size: 0.5rem;
  background: currentColor;
}
.preset-preview-header i:first-child {
  inline-size: 2rem;
  margin-inline-end: auto;
  background: var(--preview-accent);
}
.preset-preview-layout {
  display: grid;
  grid-template-columns: 1fr 0.8fr;
  gap: 0.5rem;
}
.preset-preview-layout > i {
  border-radius: var(--preview-radius);
  background: var(--preview-accent);
  min-block-size: 2rem;
}
.preset-preview-layout > span {
  display: grid;
  align-content: center;
  gap: 0.375rem;
}
.preset-preview-layout b {
  block-size: 0.1875rem;
  background: currentColor;
  opacity: 0.65;
}
.preset-preview-layout b:last-child {
  inline-size: 65%;
}
.preset-preview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.preset-preview-cards i {
  min-block-size: 0.75rem;
  border: 1px solid currentColor;
  border-radius: var(--preview-radius);
  opacity: 0.6;
}
.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__preview {
  --preview-bg: #e7f1ff;
  --preview-ink: #264664;
  --preview-accent: #376ba4;
  --preview-radius: 0.5rem;
  background: radial-gradient(at 100% 0, #c3d8ff, transparent 70%), var(--preview-bg);
}
.appearance-preset-card[data-preset='fluent-soft'] .preset-preview-header {
  padding: 0.25rem;
  border: 1px solid #fff;
  border-radius: 1rem;
}
.appearance-preset-card[data-preset='fluent-soft'] .preset-preview-layout {
  grid-template-columns: 1fr 1fr;
}
.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__preview {
  --preview-bg: #edf0e4;
  --preview-ink: #3b5137;
  --preview-accent: #496e4e;
  --preview-radius: 0.75rem 0.25rem;
}
.appearance-preset-card[data-preset='organic-natural'] .preset-preview-layout {
  grid-template-columns: 0.7fr 1fr;
}
.appearance-preset-card[data-preset='organic-natural'] .preset-preview-cards {
  grid-template-columns: 1fr 1.5fr 1fr;
}
.appearance-preset-card[data-preset='gradient-narrative'] .appearance-preset-card__preview {
  --preview-bg: #1c1c38;
  --preview-ink: #b6d7ff;
  --preview-accent: #b5a6ff;
  --preview-radius: 0.25rem 0.75rem;
  background: radial-gradient(at 100% 0, #3c3177, transparent 75%), var(--preview-bg);
}
.appearance-preset-card[data-preset='gradient-narrative'] .preset-preview-layout {
  grid-template-columns: 1.4fr 0.7fr;
}
.appearance-preset-card[data-preset='gradient-narrative'] .preset-preview-layout > i {
  background: linear-gradient(140deg, #b5a6ff, #88dce4);
}
</style>
