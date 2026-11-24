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
      @click="selectPreset(spec.preset)"
    >
      <span class="appearance-preset-card__preview" aria-hidden="true">
        <span v-if="spec.preset === 'apple-native'" class="preview-apple">
          <i /><b /><b /><span><i /><i /></span>
        </span>
        <span v-else-if="spec.preset === 'material-expressive'" class="preview-material">
          <i /><b /><b /><em />
        </span>
        <span v-else-if="spec.preset === 'fluent-workspace'" class="preview-fluent">
          <i /><span><b /><b /><b /></span><em />
        </span>
        <span v-else class="preview-carbon"> <i /><b /><b /><b /><b /> </span>
      </span>
      <span class="appearance-preset-card__footer">
        <span class="appearance-preset-card__title">{{
          t(`settings.presets.${spec.preset}`)
        }}</span>
        <Check v-if="settings.appearancePreset === spec.preset" aria-hidden="true" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { nextTick } from 'vue'
import { Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { getAppearancePresetSpecs } from '@/config/appearance'
import { useSettingsStore } from '@/stores'
import { designEdition } from '@/config/designEdition'
import type { AppearancePreset } from '@/types'

defineOptions({ name: 'AppearancePresetPicker' })
const { t } = useI18n()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const presetSpecs = getAppearancePresetSpecs()
function selectPreset(preset: AppearancePreset) {
  if (preset === settings.value.appearancePreset) return
  const update = async () => {
    settingsStore.setAppearancePreset(preset)
    await nextTick()
  }
  if (
    designEdition !== 'archive' ||
    document.body.dataset['motion'] !== 'full' ||
    typeof document.startViewTransition !== 'function'
  ) {
    void update()
    return
  }
  const transition = document.startViewTransition(update)
  void transition.ready.catch(() => {})
}
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
  overflow-wrap: anywhere;
}
.appearance-preset-card__footer > svg {
  inline-size: 1em;
  block-size: 1em;
  flex: none;
}
.appearance-preset-card__preview {
  display: grid;
  overflow: hidden;
  aspect-ratio: 1.8;
  min-inline-size: 0;
  border: 1px solid var(--appearance-border);
  border-radius: var(--appearance-radius-md);
}
.appearance-preset-card__preview > span {
  display: grid;
  gap: 0.3rem;
  min-inline-size: 0;
  padding: 0.55rem;
}
.preview-apple {
  grid-template-rows: 0.35fr 1.5fr 0.15fr 0.65fr;
  justify-items: center;
  background: #f5f5f7;
}
.preview-apple > i {
  inline-size: 28%;
  align-self: center;
  block-size: 2px;
  background: #1d1d1f;
}
.preview-apple > b:nth-child(2) {
  inline-size: 100%;
  border-radius: 0.25rem;
  background: #a7c8e5;
}
.preview-apple > b:nth-child(3) {
  inline-size: 45%;
  background: #005ab6;
  border-radius: 1rem;
}
.preview-apple > span {
  display: grid;
  inline-size: 100%;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
}
.preview-apple > span i {
  background: #e4e4e8;
  border-radius: 0.25rem;
}
.preview-material {
  grid-template-columns: 0.7fr 1fr 0.65fr;
  grid-template-rows: 0.45fr 1fr 1fr;
  background: #f9f5ff;
}
.preview-material > i {
  inline-size: 77%;
  grid-column: 1 / -1;
  background: #eaddff;
  border-radius: 1rem;
}
.preview-material > b:nth-child(2) {
  grid-area: 2 / 1 / 4 / 3;
  background: #6e50a4;
  border-radius: 0.75rem 0.75rem 0.3rem 0.3rem;
}
.preview-material > b:nth-child(3) {
  background: #efab89;
  border-radius: 0.7rem;
}
.preview-material > em {
  background: #eaddff;
  border-radius: 0.3rem 0.3rem 0.65rem 0.65rem;
}
.preview-fluent {
  grid-template-columns: 0.75fr 1fr;
  grid-template-rows: 0.4fr 1.5fr;
  background: #eaf0f5;
}
.preview-fluent > i {
  grid-column: 1 / -1;
  background: #d1deea;
  border-block-end: 1px solid #005a91;
}
.preview-fluent > span {
  display: grid;
  gap: 0.16rem;
  padding: 0.25rem;
  background: #fff;
  border-radius: 0.2rem;
}
.preview-fluent > span b {
  background: #d8e2eb;
}
.preview-fluent > span b:nth-child(2) {
  border-inline-start: 2px solid #005a91;
  background: #dcecff;
}
.preview-fluent > em {
  border-block-start: 2px solid #005a91;
  border-radius: 0.2rem;
  background: #b1c9e0;
}
.appearance-preset-card__preview > .preview-carbon {
  grid-template-rows: 0.55fr repeat(4, 1fr);
  gap: 1px;
  background: #f4f4f4;
}
.preview-carbon > i {
  background: #161616;
}
.preview-carbon > b {
  background: #fff;
  border-block-end: 1px solid #a8a8a8;
  background-image: linear-gradient(90deg, #6f6f6f 27%, transparent 27%);
  background-size: 55% 2px;
  background-position: 0.25rem center;
  background-repeat: no-repeat;
}
.preview-carbon > b:nth-child(odd) {
  background-color: #e8e8e8;
}
.preview-carbon > b:nth-child(4) {
  border-inline-start: 2px solid #0043ce;
  background-color: #dde7ff;
}
@media (max-width: 25rem) {
  .appearance-preset-picker {
    gap: 0.5rem;
  }
  .appearance-preset-card {
    padding: 0.5rem;
  }
}
</style>
