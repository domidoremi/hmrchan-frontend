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
      <p class="display-language-hint">{{ t('journal.appearance.languageHint') }}</p>
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
    <div class="display-editions" :aria-label="t('journal.appearance.sites')">
      <a
        v-for="edition in editions"
        :key="edition.id"
        :href="edition.href"
        class="display-edition"
        :class="[edition.id, { selected: edition.id === designEdition }]"
        :aria-current="edition.id === designEdition ? 'true' : undefined"
      >
        <span class="display-edition-art" aria-hidden="true"><i /><i /><i /><b>m.</b></span>
        <span class="display-edition-label"
          ><strong>{{ t(edition.labelKey) }}</strong
          ><span>{{
            edition.id === designEdition
              ? t('journal.appearance.currentSite')
              : `${t('journal.appearance.visit')} ↗`
          }}</span></span
        >
      </a>
    </div>
    <div class="display-motion-row">
      <div>
        <h3>{{ t('journal.appearance.motion') }}</h3>
        <span>{{ t('journal.appearance.thisDevice') }}</span>
      </div>
      <div class="display-motion-options" role="group" :aria-label="t('journal.appearance.motion')">
        <button type="button" :aria-pressed="motion === 'full'" @click="selectMotion('full')">
          {{ t('settings.animationFull') }}
        </button>
        <button type="button" :aria-pressed="motion === 'reduced'" @click="selectMotion('reduced')">
          {{ t('settings.animationReduced') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, type SupportedLocale } from '@/i18n'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores'
import AppearancePresetPicker from '@/components/appearance/AppearancePresetPicker.vue'
import type { Theme } from '@/types'
import { designEdition } from '@/config/designEdition'

const { locale, t } = useI18n({ useScope: 'global' })
const themeStore = useThemeStore()
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
const editions = [
  { id: 'editorial', labelKey: 'journal.appearance.journalEdition', href: 'https://momichan.com' },
  {
    id: 'archive',
    labelKey: 'journal.appearance.archiveEdition',
    href: 'https://next.momichan.com',
  },
]
const motion = ref<'full' | 'reduced'>('full')
function syncMotion() {
  motion.value = document.body.dataset['motion'] === 'reduced' ? 'reduced' : 'full'
}
function selectMotion(value: 'full' | 'reduced') {
  document.dispatchEvent(new CustomEvent('journalmotionrequest', { detail: value }))
}
onMounted(() => {
  document.addEventListener('journalmotionchange', syncMotion)
  void nextTick(syncMotion)
})
onBeforeUnmount(() => document.removeEventListener('journalmotionchange', syncMotion))
</script>

<style scoped>
.journal-display-settings {
  display: grid;
  gap: 2rem;
}
.display-editions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}
.display-edition {
  display: grid;
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.display-edition.selected {
  border-color: var(--accent);
}
.display-edition-art {
  position: relative;
  display: grid;
  place-items: center;
  block-size: 11.25rem;
  overflow: hidden;
  perspective: 50rem;
  background: #e8e4d8;
  color: #2d3029;
}
.display-edition-art i {
  position: absolute;
  inline-size: 6.75rem;
  block-size: 8.75rem;
  background: #faf9f3;
  border: 1px solid #c5c2b5;
  transform: rotateY(-20deg) rotateZ(-10deg);
  transition: transform 0.6s;
}
.display-edition-art i:nth-child(1) {
  transform: translate(1.75rem, -0.5rem) rotateY(-20deg) rotateZ(9deg);
  background: #b83d29;
}
.display-edition-art i:nth-child(2) {
  transform: translate(0.875rem, -0.25rem) rotateY(-20deg) rotateZ(0deg);
  background: #dad7ca;
}
.display-edition-art b {
  position: relative;
  font:
    4rem Georgia,
    serif;
  transform: rotateY(-20deg) rotateZ(-10deg);
}
.display-edition.archive .display-edition-art {
  background: #10211b;
  color: #b8f4ce;
}
.display-edition.archive .display-edition-art i {
  background: #244437;
  border-color: #668675;
  inline-size: 9.375rem;
  block-size: 6rem;
  transform: rotateX(40deg) rotateZ(-24deg);
}
.display-edition.archive .display-edition-art i:nth-child(1) {
  transform: translateY(1.375rem) rotateX(40deg) rotateZ(-24deg);
  background: #406b53;
}
.display-edition.archive .display-edition-art i:nth-child(2) {
  transform: translateY(0.6875rem) rotateX(40deg) rotateZ(-24deg);
  background: #315440;
}
.display-edition.archive .display-edition-art b {
  transform: rotateX(40deg) rotateZ(-24deg);
}
.display-edition:hover .display-edition-art i:first-child {
  transform: translate(2.25rem, -0.75rem) rotateY(-20deg) rotateZ(14deg);
}
.display-edition.archive:hover .display-edition-art i:first-child {
  transform: translateY(2rem) rotateX(40deg) rotateZ(-24deg);
}
.display-edition-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.display-edition-label strong {
  min-inline-size: 0;
  overflow-wrap: anywhere;
  font-weight: 500;
}
.display-edition-label > span {
  color: var(--muted);
  font-size: 0.75rem;
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
.display-motion-row > div > span {
  font-size: 0.75rem;
  color: var(--muted);
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
  .display-editions {
    gap: 0.75rem;
  }
  .display-edition-art {
    block-size: 8.75rem;
  }
  .display-edition-label {
    flex-direction: column;
    align-items: start;
    gap: 0.375rem;
    padding: 0.75rem;
  }
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
</style>
