<template>
  <div class="appearance-preset-picker" data-testid="appearance-preset-picker">
    <button
      v-for="spec in presetSpecs"
      :key="spec.preset"
      type="button"
      class="appearance-preset-card"
      :class="{
        'appearance-preset-card--active': settings.appearancePreset === spec.preset,
        'appearance-preset-card--revealed': revealedPresets[spec.preset],
      }"
      :data-preset="spec.preset"
      :aria-pressed="settings.appearancePreset === spec.preset"
      :aria-label="presetLabel(spec.preset)"
      :disabled="isApplyingPreset"
      @click="handleApplyPreset(spec.preset)"
    >
      <div
        class="appearance-preset-card__preview"
        :ref="bindPreview(spec.preset)"
        aria-hidden="true"
      >
        <span class="appearance-preset-card__wash" />
        <span class="appearance-preset-card__shape appearance-preset-card__shape--primary" />
        <span class="appearance-preset-card__shape appearance-preset-card__shape--secondary" />
        <span class="appearance-preset-card__shape appearance-preset-card__shape--accent" />
        <span class="appearance-preset-card__line appearance-preset-card__line--horizon" />
        <span class="appearance-preset-card__line appearance-preset-card__line--detail" />
        <span class="appearance-preset-card__glow" />
      </div>

      <div class="appearance-preset-card__footer">
        <span class="appearance-preset-card__title">{{ presetLabel(spec.preset) }}</span>
        <span
          v-if="settings.appearancePreset === spec.preset"
          class="appearance-preset-card__current"
        >
          <Check :size="14" />
        </span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Check } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { getAppearancePresetSpecs } from '@/config/appearance'
import { useSettingsStore, useThemeStore, useToastStore } from '@/stores'
import { applyAppearancePreset } from '@/services/appearanceLoader'
import { createVisibilityObserver } from '@/utils/modernAPIs'
import type { AppearancePreset } from '@/types'

defineOptions({ name: 'AppearancePresetPicker' })

const { t } = useI18n()
const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const toastStore = useToastStore()
const { settings } = storeToRefs(settingsStore)
const { resolvedTheme } = storeToRefs(themeStore)

const presetSpecs = getAppearancePresetSpecs()
const isApplyingPreset = ref(false)
const revealedPresets = reactive<Record<AppearancePreset, boolean>>({
  'minimal-editorial': false,
  'fluent-soft': false,
  'material-calm': false,
  'organic-natural': false,
  'biophilic-serene': false,
  'clay-playful': false,
  'sketch-doodle': false,
  'gradient-narrative': false,
})

const previewElements = new Map<AppearancePreset, HTMLElement>()
let revealObserver: IntersectionObserver | null = null

function ensureObserver() {
  if (
    revealObserver ||
    typeof window === 'undefined' ||
    typeof IntersectionObserver === 'undefined'
  ) {
    return
  }

  revealObserver = createVisibilityObserver(
    (entries) => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) continue
        const preset = entry.target.dataset['preset'] as AppearancePreset | undefined
        if (!preset) continue
        revealedPresets[preset] = true
        revealObserver?.unobserve(entry.target)
      }
    },
    {
      threshold: 0.45,
      rootMargin: '0px 0px -8% 0px',
    }
  )

  for (const element of previewElements.values()) {
    revealObserver.observe(element)
  }
}

function bindPreview(preset: AppearancePreset) {
  return (element: Element | null) => {
    const htmlElement = element instanceof HTMLElement ? element : null

    if (!htmlElement) {
      const current = previewElements.get(preset)
      if (current) {
        revealObserver?.unobserve(current)
        previewElements.delete(preset)
      }
      return
    }

    htmlElement.dataset['preset'] = preset
    previewElements.set(preset, htmlElement)

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      revealedPresets[preset] = true
      return
    }

    ensureObserver()
    if (!revealedPresets[preset]) {
      revealObserver?.observe(htmlElement)
    }
  }
}

function presetLabel(preset: AppearancePreset): string {
  return t(`settings.presets.${preset}`)
}

async function handleApplyPreset(preset: AppearancePreset) {
  if (settings.value.appearancePreset === preset || isApplyingPreset.value) return

  isApplyingPreset.value = true
  const applied = await applyAppearancePreset(preset, resolvedTheme.value)
  if (applied) {
    settingsStore.setAppearancePreset(preset)
  } else {
    toastStore.error(t('settings.appearanceRuntimeFailed'))
  }
  isApplyingPreset.value = false
}

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  revealObserver = null
})
</script>

<style scoped>
.appearance-preset-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr));
  gap: clamp(0.75rem, 1.8vw, 0.95rem);
}

.appearance-preset-card {
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 1.25rem;
  border: 1px solid var(--ui-compat-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 48%),
    var(--ui-compat-surface-interactive);
  box-shadow: 0 1.1rem 2.4rem rgba(15, 23, 42, 0.08);
  text-align: left;
  transition:
    transform var(--duration-fast) var(--ease-spring),
    border-color var(--duration-fast) var(--ease-smooth),
    box-shadow var(--duration-fast) var(--ease-smooth),
    background var(--duration-fast) var(--ease-smooth);
}

.appearance-preset-card:hover:not(:disabled) {
  transform: translateY(-0.125rem);
  border-color: var(--ui-compat-border-strong);
  box-shadow: 0 1.4rem 2.8rem rgba(15, 23, 42, 0.12);
}

.appearance-preset-card:disabled {
  opacity: 0.72;
}

.appearance-preset-card--active {
  border-color: rgba(var(--color-primary-rgb), 0.42);
  box-shadow:
    0 0 0 1px rgba(var(--color-primary-rgb), 0.24),
    0 1.6rem 2.8rem rgba(var(--color-primary-rgb), 0.16);
}

.appearance-preset-card__preview {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  min-block-size: 0;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.1), rgba(15, 23, 42, 0.05));
  isolation: isolate;
}

.appearance-preset-card__wash,
.appearance-preset-card__shape,
.appearance-preset-card__line,
.appearance-preset-card__glow {
  position: absolute;
  display: block;
}

.appearance-preset-card__wash {
  inset: 0;
  background:
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.78), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(15, 23, 42, 0.12));
  opacity: 0.92;
}

.appearance-preset-card__shape {
  transform-origin: center;
  opacity: 0.94;
}

.appearance-preset-card__shape--primary {
  inset: auto 10% 14% 10%;
  height: 2.4rem;
  border-radius: 999px;
}

.appearance-preset-card__shape--secondary {
  inset: 16% auto auto 12%;
  width: 44%;
  height: 44%;
  border-radius: 1.35rem;
}

.appearance-preset-card__shape--accent {
  inset: auto 14% 18% auto;
  width: 24%;
  height: 50%;
  border-radius: 1rem;
}

.appearance-preset-card__line--horizon {
  inset: 18% 14% auto 14%;
  height: 1px;
  background: rgba(255, 255, 255, 0.5);
  transform-origin: left center;
}

.appearance-preset-card__line--detail {
  inset: auto auto 20% 16%;
  width: 32%;
  height: 1px;
  background: rgba(15, 23, 42, 0.22);
  transform-origin: left center;
}

.appearance-preset-card__glow {
  inset: auto 12% -12% auto;
  width: 48%;
  height: 48%;
  border-radius: 999px;
  filter: blur(1rem);
  opacity: 0.62;
}

.appearance-preset-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.appearance-preset-card__title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.appearance-preset-card__current {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 1.6rem;
  block-size: 1.6rem;
  border-radius: 999px;
  background: rgba(var(--color-primary-rgb), 0.14);
  color: var(--color-primary);
}

.appearance-preset-card[data-preset='minimal-editorial'] .appearance-preset-card__preview {
  background:
    linear-gradient(180deg, rgba(231, 222, 207, 0.96), rgba(247, 242, 232, 0.88)), #f6f0e7;
}

.appearance-preset-card[data-preset='minimal-editorial'] .appearance-preset-card__shape--primary {
  background: rgba(204, 190, 170, 0.88);
}

.appearance-preset-card[data-preset='minimal-editorial'] .appearance-preset-card__shape--secondary {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(100, 83, 62, 0.16);
}

.appearance-preset-card[data-preset='minimal-editorial'] .appearance-preset-card__shape--accent {
  background: rgba(145, 124, 101, 0.14);
  border: 1px solid rgba(145, 124, 101, 0.22);
}

.appearance-preset-card[data-preset='minimal-editorial'] .appearance-preset-card__glow {
  background: rgba(202, 182, 156, 0.36);
}

.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__preview {
  background:
    linear-gradient(
      135deg,
      rgba(198, 224, 255, 0.88),
      rgba(241, 247, 255, 0.72) 56%,
      rgba(173, 214, 255, 0.48)
    ),
    rgba(222, 236, 255, 0.92);
}

.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__shape--primary,
.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__shape--secondary,
.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__shape--accent {
  background: rgba(255, 255, 255, 0.36);
  backdrop-filter: blur(0.625rem);
}

.appearance-preset-card[data-preset='fluent-soft'] .appearance-preset-card__glow {
  background: rgba(124, 182, 255, 0.56);
}

.appearance-preset-card[data-preset='material-calm'] .appearance-preset-card__preview {
  background:
    linear-gradient(180deg, rgba(232, 239, 247, 0.96), rgba(211, 223, 236, 0.92)), #dbe7f4;
}

.appearance-preset-card[data-preset='material-calm'] .appearance-preset-card__shape--primary {
  background: rgba(84, 110, 122, 0.88);
  border-radius: 0.875rem;
}

.appearance-preset-card[data-preset='material-calm'] .appearance-preset-card__shape--secondary {
  background: rgba(144, 164, 174, 0.66);
  border-radius: 0.875rem;
}

.appearance-preset-card[data-preset='material-calm'] .appearance-preset-card__shape--accent {
  background: rgba(255, 183, 77, 0.88);
  border-radius: 0.875rem;
}

.appearance-preset-card[data-preset='material-calm'] .appearance-preset-card__glow {
  background: rgba(94, 146, 255, 0.28);
}

.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__preview {
  background: linear-gradient(165deg, rgba(240, 225, 199, 0.96), rgba(213, 194, 159, 0.9)), #d8c29f;
}

.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__shape--primary {
  background: rgba(120, 90, 62, 0.82);
  border-radius: 42% 58% 52% 48% / 48% 40% 60% 52%;
}

.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__shape--secondary {
  background: rgba(196, 168, 132, 0.88);
  border-radius: 58% 42% 48% 52% / 42% 48% 52% 58%;
}

.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__shape--accent {
  background: rgba(159, 111, 72, 0.38);
  border-radius: 60% 40% 66% 34% / 38% 60% 40% 62%;
}

.appearance-preset-card[data-preset='organic-natural'] .appearance-preset-card__glow {
  background: rgba(170, 129, 91, 0.38);
}

.appearance-preset-card[data-preset='biophilic-serene'] .appearance-preset-card__preview {
  background:
    linear-gradient(
      180deg,
      rgba(221, 243, 232, 0.9),
      rgba(202, 232, 219, 0.84) 60%,
      rgba(181, 217, 205, 0.92)
    ),
    #d6efe3;
}

.appearance-preset-card[data-preset='biophilic-serene'] .appearance-preset-card__shape--primary {
  background: rgba(108, 153, 129, 0.34);
  border-radius: 999px;
}

.appearance-preset-card[data-preset='biophilic-serene'] .appearance-preset-card__shape--secondary {
  background: rgba(255, 255, 255, 0.48);
  border-radius: 45% 55% 45% 55% / 60% 42% 58% 40%;
}

.appearance-preset-card[data-preset='biophilic-serene'] .appearance-preset-card__shape--accent {
  background: linear-gradient(180deg, rgba(114, 159, 132, 0.82), rgba(70, 124, 95, 0.56));
  border-radius: 60% 40% 65% 35% / 35% 68% 32% 65%;
}

.appearance-preset-card[data-preset='biophilic-serene'] .appearance-preset-card__glow {
  background: rgba(132, 203, 173, 0.42);
}

.appearance-preset-card[data-preset='clay-playful'] .appearance-preset-card__preview {
  background:
    linear-gradient(180deg, rgba(255, 227, 214, 0.96), rgba(255, 205, 181, 0.92)), #ffd4c0;
}

.appearance-preset-card[data-preset='clay-playful'] .appearance-preset-card__shape--primary,
.appearance-preset-card[data-preset='clay-playful'] .appearance-preset-card__shape--secondary,
.appearance-preset-card[data-preset='clay-playful'] .appearance-preset-card__shape--accent {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.44), rgba(255, 160, 122, 0.86)),
    rgba(255, 160, 122, 0.9);
  box-shadow:
    inset 0 0.28rem 0.36rem rgba(255, 255, 255, 0.38),
    inset 0 -0.36rem 0.48rem rgba(191, 88, 56, 0.18);
}

.appearance-preset-card[data-preset='clay-playful'] .appearance-preset-card__glow {
  background: rgba(255, 143, 94, 0.48);
}

.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__preview {
  background:
    linear-gradient(180deg, rgba(251, 246, 236, 0.98), rgba(244, 234, 216, 0.92)), #f7ead7;
}

.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__shape--primary,
.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__shape--secondary,
.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__shape--accent {
  background: transparent;
  border: 2px solid rgba(55, 48, 39, 0.72);
  box-shadow: none;
}

.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__line--horizon,
.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__line--detail {
  background: rgba(55, 48, 39, 0.62);
}

.appearance-preset-card[data-preset='sketch-doodle'] .appearance-preset-card__glow {
  background: rgba(214, 170, 106, 0.18);
}

.appearance-preset-card[data-preset='gradient-narrative'] .appearance-preset-card__preview {
  background:
    linear-gradient(
      135deg,
      rgba(42, 75, 191, 0.96),
      rgba(137, 92, 246, 0.84) 48%,
      rgba(255, 148, 118, 0.84)
    ),
    #5b68d9;
}

.appearance-preset-card[data-preset='gradient-narrative'] .appearance-preset-card__shape--primary {
  background: rgba(255, 255, 255, 0.18);
}

.appearance-preset-card[data-preset='gradient-narrative']
  .appearance-preset-card__shape--secondary {
  background: rgba(255, 255, 255, 0.28);
}

.appearance-preset-card[data-preset='gradient-narrative'] .appearance-preset-card__shape--accent {
  background: rgba(255, 234, 178, 0.46);
}

.appearance-preset-card[data-preset='gradient-narrative'] .appearance-preset-card__glow {
  background: rgba(255, 194, 122, 0.56);
}

.appearance-preset-card--revealed[data-preset='minimal-editorial'] .appearance-preset-card__wash {
  animation: preset-editorial-reveal 780ms var(--ease-out) both;
}

.appearance-preset-card--revealed[data-preset='fluent-soft'] .appearance-preset-card__wash {
  animation: preset-acrylic-sheen 940ms var(--ease-out) both;
}

.appearance-preset-card--revealed[data-preset='material-calm'] .appearance-preset-card__shape {
  animation: preset-material-step 720ms var(--ease-out) both;
}

.appearance-preset-card--revealed[data-preset='organic-natural'] .appearance-preset-card__shape {
  animation: preset-organic-rise 960ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.appearance-preset-card--revealed[data-preset='biophilic-serene'] .appearance-preset-card__wash {
  animation: preset-mist-bloom 1200ms var(--ease-out) both;
}

.appearance-preset-card--revealed[data-preset='biophilic-serene']
  .appearance-preset-card__shape--accent {
  animation: preset-leaf-drift 1200ms var(--ease-out) both;
}

.appearance-preset-card--revealed[data-preset='clay-playful'] .appearance-preset-card__shape {
  animation: preset-clay-bounce 900ms var(--ease-spring) both;
}

.appearance-preset-card--revealed[data-preset='sketch-doodle'] .appearance-preset-card__line,
.appearance-preset-card--revealed[data-preset='sketch-doodle'] .appearance-preset-card__shape {
  animation: preset-sketch-draw 900ms ease-out both;
}

.appearance-preset-card--revealed[data-preset='gradient-narrative'] .appearance-preset-card__wash,
.appearance-preset-card--revealed[data-preset='gradient-narrative'] .appearance-preset-card__glow {
  animation: preset-gradient-push 1200ms cubic-bezier(0.2, 0.84, 0.22, 1) both;
}

@keyframes preset-editorial-reveal {
  0% {
    clip-path: inset(0 100% 0 0);
    opacity: 0.2;
  }
  100% {
    clip-path: inset(0 0 0 0);
    opacity: 0.92;
  }
}

@keyframes preset-acrylic-sheen {
  0% {
    transform: translateX(-28%);
    opacity: 0.28;
  }
  100% {
    transform: translateX(8%);
    opacity: 1;
  }
}

@keyframes preset-material-step {
  0% {
    transform: translateY(0.55rem);
    opacity: 0.4;
  }
  60% {
    transform: translateY(-0.12rem);
  }
  100% {
    transform: translateY(0);
    opacity: 0.94;
  }
}

@keyframes preset-organic-rise {
  0% {
    transform: translateY(0.4rem) scale(0.96);
    opacity: 0.45;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.94;
  }
}

@keyframes preset-mist-bloom {
  0% {
    opacity: 0.16;
    filter: blur(0.5rem);
  }
  100% {
    opacity: 0.92;
    filter: blur(0);
  }
}

@keyframes preset-leaf-drift {
  0% {
    transform: translate3d(-0.45rem, 0.5rem, 0) rotate(-8deg);
    opacity: 0.18;
  }
  100% {
    transform: translate3d(0, 0, 0) rotate(0deg);
    opacity: 0.9;
  }
}

@keyframes preset-clay-bounce {
  0% {
    transform: translateY(0.7rem) scale(0.88, 1.14);
    opacity: 0.35;
  }
  52% {
    transform: translateY(-0.18rem) scale(1.03, 0.96);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.94;
  }
}

@keyframes preset-sketch-draw {
  0% {
    opacity: 0;
    transform: scaleX(0.2) translateX(-0.25rem);
  }
  100% {
    opacity: 1;
    transform: scaleX(1) translateX(0);
  }
}

@keyframes preset-gradient-push {
  0% {
    transform: translate3d(-0.45rem, 0.35rem, 0) scale(1.06);
    opacity: 0.36;
  }
  100% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.98;
  }
}

@media (max-height: 54rem) {
  .appearance-preset-picker {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 7.25rem), 1fr));
    gap: 0.625rem;
  }

  .appearance-preset-card {
    gap: 0.5rem;
    padding: 0.625rem;
  }

  .appearance-preset-card__preview {
    aspect-ratio: 5 / 3;
  }
}

@media (max-width: 34rem) {
  .appearance-preset-picker {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.75rem), 1fr));
  }
}

@media (max-width: 22rem) {
  .appearance-preset-picker {
    grid-template-columns: 1fr;
  }
}
</style>
