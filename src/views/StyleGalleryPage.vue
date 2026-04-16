<template>
  <div class="style-gallery-page">
    <div class="container">
      <section class="style-gallery-hero glass-surface--editorial">
        <div class="style-gallery-hero__copy">
          <p class="style-gallery-hero__eyebrow">{{ $t('styleGallery.eyebrow') }}</p>
          <h1 class="page-hero-shell__title">{{ $t('styleGallery.title') }}</h1>
          <p class="page-hero-shell__subtitle">{{ $t('styleGallery.subtitle') }}</p>
        </div>

        <div class="style-gallery-hero__meta">
          <PageMetaChip
            >{{ $t('styleGallery.currentPreset') }}: {{ currentPresetLabel }}</PageMetaChip
          >
          <PageMetaChip>{{ $t('styleGallery.currentMode') }}: {{ currentModeLabel }}</PageMetaChip>
          <ControlButton :tag="RouterLink" to="/profile/settings" size="compact">
            {{ $t('styleGallery.manageSettings') }}
          </ControlButton>
        </div>
      </section>

      <section class="style-gallery-grid" :aria-label="$t('styleGallery.title')">
        <article
          v-for="spec in presetSpecs"
          :key="spec.preset"
          class="style-gallery-card empty-surface"
          :class="{ 'style-gallery-card--active': settings.appearancePreset === spec.preset }"
        >
          <header class="style-gallery-card__header">
            <div class="style-gallery-card__copy">
              <p class="style-gallery-card__eyebrow">{{ presetLabel(spec.preset) }}</p>
              <h2 class="style-gallery-card__title">{{ spec.galleryTitle }}</h2>
              <p class="style-gallery-card__summary">{{ spec.gallerySummary }}</p>
            </div>

            <span
              v-if="settings.appearancePreset === spec.preset"
              class="style-gallery-card__state"
              aria-live="polite"
            >
              {{ $t('styleGallery.current') }}
            </span>
          </header>

          <ul class="style-gallery-keywords" aria-label="Keywords">
            <li v-for="keyword in spec.signatureKeywords" :key="`${spec.preset}-${keyword}`">
              {{ keyword }}
            </li>
          </ul>

          <dl class="style-gallery-compare">
            <div>
              <dt>{{ $t('styleGallery.surfaceStyle') }}</dt>
              <dd>{{ spec.surfaceStyle }}</dd>
            </div>
            <div>
              <dt>{{ $t('styleGallery.motionStyle') }}</dt>
              <dd>{{ spec.motionStyle }}</dd>
            </div>
            <div>
              <dt>{{ $t('styleGallery.densityStyle') }}</dt>
              <dd>{{ spec.densityStyle }}</dd>
            </div>
            <div>
              <dt>{{ $t('styleGallery.heroStyle') }}</dt>
              <dd>{{ spec.heroStyle }}</dd>
            </div>
          </dl>

          <div class="style-gallery-preview">
            <div class="style-gallery-preview-card style-gallery-preview-card--desktop">
              <span class="style-gallery-preview-card__label">{{
                $t('styleGallery.desktopPreview')
              }}</span>
              <strong>{{ spec.lightMood }}</strong>
            </div>
            <div class="style-gallery-preview-card style-gallery-preview-card--mobile">
              <span class="style-gallery-preview-card__label">{{
                $t('styleGallery.mobilePreview')
              }}</span>
              <strong>{{ spec.mobileMood }}</strong>
            </div>
          </div>

          <div class="style-gallery-notes">
            <p>{{ activeResolvedTheme === 'dark' ? spec.darkMood : spec.lightMood }}</p>
            <p>
              {{ $t('styleGallery.influences') }}:
              {{ spec.influences.join(' · ') }}
            </p>
          </div>

          <div class="style-gallery-actions">
            <ControlButton
              class="style-gallery-action"
              :disabled="isApplyingPreset"
              :pressed="settings.appearancePreset === spec.preset"
              @click="handleApplyPreset(spec.preset)"
            >
              <template #start>
                <AnimatedIcon
                  :name="settings.appearancePreset === spec.preset ? 'sparkle' : 'explore'"
                  :fallback-icon="settings.appearancePreset === spec.preset ? Check : Sparkles"
                  size="sm"
                />
              </template>
              {{
                settings.appearancePreset === spec.preset
                  ? $t('styleGallery.current')
                  : $t('styleGallery.applyPreset')
              }}
            </ControlButton>

            <ControlButton :tag="RouterLink" to="/profile/settings" size="compact">
              <template #start>
                <AnimatedIcon name="explore" :fallback-icon="ArrowRight" size="sm" />
              </template>
              {{ $t('styleGallery.viewSettings') }}
            </ControlButton>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowRight, Check, Sparkles } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getAppearancePresetSpecs } from '@/config/appearance'
import { useSettingsStore, useThemeStore, useToastStore } from '@/stores'
import { applyAppearancePreset } from '@/services/appearanceLoader'
import type { AppearancePreset } from '@/types'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const toastStore = useToastStore()
const { settings } = storeToRefs(settingsStore)
const { resolvedTheme } = storeToRefs(themeStore)

const isApplyingPreset = ref(false)
const presetSpecs = getAppearancePresetSpecs()

const activeResolvedTheme = computed(() => resolvedTheme.value)
const currentPresetLabel = computed(() => t(`settings.presets.${settings.value.appearancePreset}`))
const currentModeLabel = computed(() =>
  resolvedTheme.value === 'dark' ? t('settings.dark') : t('settings.light')
)

function presetLabel(preset: AppearancePreset): string {
  return t(`settings.presets.${preset}`)
}

async function handleApplyPreset(preset: AppearancePreset) {
  if (isApplyingPreset.value || settings.value.appearancePreset === preset) return

  isApplyingPreset.value = true
  const applied = await applyAppearancePreset(preset, resolvedTheme.value)

  if (applied) {
    settingsStore.setAppearancePreset(preset)
    toastStore.success(t('styleGallery.presetApplied', { preset: presetLabel(preset) }))
  } else {
    toastStore.error(t('settings.appearanceRuntimeFailed'))
  }

  isApplyingPreset.value = false
}
</script>
