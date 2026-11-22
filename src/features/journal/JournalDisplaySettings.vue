<template>
  <div class="journal-display-settings">
    <fieldset class="display-color-field">
      <legend>{{ t('journal.appearance.colorMode') }}</legend>
      <div class="display-color-options">
        <label v-for="option in colorOptions" :key="option.value">
          <input
            type="radio"
            :name="colorGroup"
            :value="option.value"
            :checked="theme === option.value"
            @change="themeStore.setTheme(option.value)"
          />
          <span>{{ t(option.labelKey) }}</span>
        </label>
      </div>
    </fieldset>
    <fieldset class="display-language-field" :aria-busy="languagePending">
      <legend :id="languageGroup">{{ t('settings.language') }}</legend>
      <p class="display-language-hint sr-only">{{ t('journal.appearance.languageHint') }}</p>
      <div class="display-language-options" role="group" :aria-labelledby="languageGroup">
        <button
          v-for="option in languageOptions"
          :key="option.code"
          type="button"
          :aria-pressed="locale === option.code"
          :aria-disabled="languagePending"
          @click="changeLanguage(option.code)"
        >
          <span :lang="option.code">{{ option.name }}</span>
        </button>
      </div>
      <p class="display-language-status" role="status" aria-live="polite">
        {{
          languagePending
            ? t('journal.appearance.languageChanging')
            : languageFallback
              ? t('journal.appearance.languageUnavailable', { language: activeLanguageName })
              : ''
        }}
      </p>
    </fieldset>
    <section :aria-label="t('settings.appearancePreset')">
      <h3 class="display-preset-heading">{{ t('settings.appearancePreset') }}</h3>
      <AppearancePresetPicker />
    </section>
    <div class="display-motion-row">
      <div>
        <h3>{{ t('journal.appearance.motion') }}</h3>
      </div>
      <div class="display-motion-options" role="group" :aria-label="t('journal.appearance.motion')">
        <button
          v-for="option in motionOptions"
          :key="option.value"
          type="button"
          :aria-pressed="motion === option.value"
          @click="selectMotion(option.value)"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>
    </div>
    <fieldset class="display-text-field">
      <legend>{{ t('journal.appearance.textSize') }}</legend>
      <div class="display-motion-options">
        <button
          v-for="option in textOptions"
          :key="option.value"
          type="button"
          :aria-pressed="textSize === option.value"
          @click="setDisplayPreference('textSize', option.value)"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>
    </fieldset>
    <fieldset v-if="designEdition === 'archive'" class="display-density-field">
      <legend>{{ t('journal.next.indexDensity') }}</legend>
      <div class="display-motion-options">
        <button
          v-for="option in densityOptions"
          :key="option.value"
          type="button"
          :aria-pressed="density === option.value"
          @click="setDisplayPreference('density', option.value)"
        >
          {{ t(option.labelKey) }}
        </button>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, type SupportedLocale } from '@/i18n'
import { storeToRefs } from 'pinia'
import { useSettingsStore, useThemeStore } from '@/stores'
import AppearancePresetPicker from '@/components/appearance/AppearancePresetPicker.vue'
import type { Theme } from '@/types'
import { designEdition } from '@/config/designEdition'
import { DEFAULT_APPEARANCE_PRESET } from '@/config/appearance'
import {
  readDisplayPreference,
  setDisplayPreference,
  type JournalDensity,
  type JournalTextSize,
} from './displayPreferences'

const { locale, t } = useI18n({ useScope: 'global' })
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { theme } = storeToRefs(themeStore)
const colorGroup = useId()
const languageGroup = useId()
const languagePending = ref(false)
const languageFallback = ref(false)
const languageOptions: { code: SupportedLocale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
]
const activeLanguageName = computed(
  () => languageOptions.find((option) => option.code === locale.value)?.name ?? 'English'
)
async function changeLanguage(code: SupportedLocale) {
  if (languagePending.value || code === locale.value) return
  languagePending.value = true
  languageFallback.value = false
  try {
    await setLocale(code)
    languageFallback.value = locale.value !== code
  } catch {
    languageFallback.value = true
  } finally {
    languagePending.value = false
  }
}

const colorOptions: { value: Theme; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.light' },
  { value: 'auto', labelKey: 'settings.auto' },
  { value: 'dark', labelKey: 'settings.dark' },
]
type MotionChoice = 'auto' | 'full' | 'reduced'
const motionOptions: { value: MotionChoice; labelKey: string }[] = [
  { value: 'full', labelKey: 'settings.animationFull' },
  { value: 'reduced', labelKey: 'settings.animationReduced' },
  { value: 'auto', labelKey: 'settings.auto' },
]
const textOptions: { value: JournalTextSize; labelKey: string }[] = [
  { value: 'standard', labelKey: 'journal.appearance.textStandard' },
  { value: 'large', labelKey: 'journal.appearance.textLarge' },
]
const densityOptions: { value: JournalDensity; labelKey: string }[] = [
  { value: 'standard', labelKey: 'journal.density.standard' },
  { value: 'compact', labelKey: 'journal.density.compact' },
]
const motion = ref<MotionChoice>('full')
const textSize = ref<JournalTextSize>('standard')
const density = ref<JournalDensity>('standard')
function syncMotion() {
  const value = document.body.dataset['motionPreference'] ?? document.body.dataset['motion']
  motion.value = value === 'auto' || value === 'reduced' ? value : 'full'
}
function selectMotion(value: MotionChoice) {
  document.dispatchEvent(new CustomEvent('journalmotionrequest', { detail: value }))
}
function syncDisplay() {
  const text = document.body.dataset['textSize'],
    index = document.body.dataset['archiveDensity']
  textSize.value =
    text === 'large' || text === 'standard' ? text : readDisplayPreference('textSize')
  density.value =
    index === 'compact' || index === 'standard' ? index : readDisplayPreference('density')
}
function reset() {
  themeStore.setTheme('auto')
  settingsStore.setAppearancePreset(DEFAULT_APPEARANCE_PRESET)
  selectMotion('full')
  setDisplayPreference('textSize', 'standard')
  setDisplayPreference('density', 'standard')
}
defineExpose({ reset })
onMounted(() => {
  document.addEventListener('journalmotionchange', syncMotion)
  document.addEventListener('journaldisplaychange', syncDisplay)
  syncDisplay()
  void nextTick(syncMotion)
})
onBeforeUnmount(() => {
  document.removeEventListener('journalmotionchange', syncMotion)
  document.removeEventListener('journaldisplaychange', syncDisplay)
})
</script>

<style scoped>
.journal-display-settings {
  display: grid;
  gap: 2rem;
}
.display-motion-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding-block: 1.5rem;
  gap: 1.25rem;
  border-top: 1px solid var(--line);
}
.display-motion-row h3 {
  margin: 0 0 0.375rem;
  font-size: 1rem;
  font-weight: 500;
}
.display-motion-options {
  display: flex;
  flex-wrap: wrap;
  max-inline-size: 100%;
  padding: 0.25rem;
  border: 1px solid var(--line);
  border-radius: 4px;
}
.display-motion-options button {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  padding: 0.75rem 1.75rem;
  min-block-size: 2.75rem;
  border-radius: 2px;
  color: var(--muted);
}
.display-motion-options button[aria-pressed='true'] {
  color: var(--paper);
  background: var(--ink);
}
@media (max-width: 600px) {
  .display-motion-options button {
    padding: 0.75rem 1.25rem;
  }
}
.display-language-field {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.display-language-field legend {
  padding: 0;
  font-size: 1rem;
  font-weight: 500;
}
.display-language-hint {
  max-inline-size: 65ch;
  margin-block: 0.75rem 1rem;
  color: var(--muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
.display-language-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.display-language-options > button {
  display: inline-flex;
  align-items: center;
  min-block-size: 2.75rem;
  min-inline-size: 0;
  padding-block: 0.625rem;
  padding-inline: 0.875rem;
  font: inherit;
  color: var(--ink);
  background: var(--paper);
  border: 0.0625rem solid var(--line);
  border-radius: 0.25rem;
}
.display-language-options > button[aria-pressed='true'] {
  color: var(--paper);
  background: var(--ink);
  border-color: var(--ink);
}
.display-language-options > button:focus-visible {
  outline: 0.125rem solid var(--accent);
  outline-offset: 0.125rem;
}
.display-language-options > button[aria-disabled='true'] {
  cursor: progress;
}
.display-language-options > button > span {
  overflow-wrap: anywhere;
}
.display-language-status {
  min-block-size: 1.5em;
  margin-block: 0.75rem 0;
  color: var(--muted);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
.display-text-field,
.display-density-field {
  border: 0;
  margin: 0;
  padding: 0;
  min-inline-size: 0;
}
.display-text-field legend,
.display-density-field legend {
  padding: 0;
  margin-block-end: 0.875rem;
}
</style>
