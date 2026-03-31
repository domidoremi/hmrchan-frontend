<template>
  <footer class="footer" :class="{ 'footer--home': isHomeVariant }">
    <div class="container">
      <div v-if="isHomeVariant" class="footer-marquee" aria-hidden="true">
        <div class="footer-marquee__track">
          <span v-for="(item, index) in marqueeItems" :key="`footer-marquee-a-${index}`">
            {{ item }}
          </span>
          <span v-for="(item, index) in marqueeItems" :key="`footer-marquee-b-${index}`">
            {{ item }}
          </span>
        </div>
      </div>

      <div class="footer-shell empty-surface" :style="[footerShellStyle, noGlassBackdropStyle]">
        <div class="footer-main">
          <div class="footer-brand">
            <RouterLink to="/" class="brand-logo" :aria-label="$t('app.name')">
              <span class="brand-logo__mark">M</span>
              <span class="brand-logo__copy">
                <span class="brand-logo__name">{{ $t('app.name') }}</span>
              </span>
            </RouterLink>
            <p>{{ $t('footer.desc') }}</p>
            <div class="footer-note ui-pill ui-pill--info">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
              <span>{{ $t('footer.note') }}</span>
            </div>
            <div v-if="isHomeVariant" class="footer-actions">
              <RouterLink to="/explore" class="footer-link footer-link--cta cta-secondary">
                {{ $t('home.hero.primaryAction') }}
              </RouterLink>
              <RouterLink to="/contact" class="footer-link cta-secondary">
                {{ $t('nav.contact') }}
              </RouterLink>
            </div>
          </div>

          <div class="footer-columns">
            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.discover') }}</span>
              <RouterLink to="/explore" class="footer-link cta-secondary">
                {{ $t('nav.explore') }}
              </RouterLink>
              <RouterLink to="/authors" class="footer-link cta-secondary">
                {{ $t('nav.authors') }}
              </RouterLink>
              <RouterLink to="/schedule" class="footer-link cta-secondary">
                {{ $t('nav.schedule') }}
              </RouterLink>
            </nav>

            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.community') }}</span>
              <RouterLink to="/community" class="footer-link cta-secondary">
                {{ $t('nav.community') }}
              </RouterLink>
              <RouterLink to="/contact" class="footer-link cta-secondary">
                {{ $t('nav.contact') }}
              </RouterLink>
              <RouterLink to="/about" class="footer-link cta-secondary">
                {{ $t('nav.about') }}
              </RouterLink>
            </nav>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; {{ currentYear }} {{ $t('app.name') }}</span>
          <span class="footer-bottom__meta">{{ $t('footer.rights') }}</span>
          <a
            href="https://github.com/domidoremi/hmrchan-frontend"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            class="footer-social-link cta-secondary"
          >
            <AnimatedIcon name="explore" :fallback-icon="IconGithub" size="sm" />
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { Sparkles } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore, useThemeStore } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { IconGithub } from '@/components/icons'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'home'
  }>(),
  {
    variant: 'default',
  }
)

const { t } = useI18n()
const currentYear = computed(() => new Date().getFullYear())
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)
const isHomeVariant = computed(() => props.variant === 'home')
const noGlassBackdropStyle = Object.freeze({
  backdropFilter: 'blur(0rem)',
  WebkitBackdropFilter: 'blur(0rem)',
}) as Readonly<Record<string, string>>
const marqueeItems = computed(() => [
  t('app.name'),
  t('nav.explore'),
  t('nav.authors'),
  t('nav.community'),
  t('nav.schedule'),
])
const footerShellStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    '--footer-shell-bg': isHomeVariant.value
      ? 'var(--home-panel-bg-soft, var(--chrome-surface-bg))'
      : 'var(--chrome-surface-bg)',
    '--footer-shell-border': isHomeVariant.value
      ? 'var(--home-panel-border, var(--chrome-surface-border))'
      : 'var(--chrome-surface-border)',
    '--footer-shell-shadow': isHomeVariant.value
      ? 'var(--home-panel-shadow, var(--chrome-surface-shadow))'
      : 'var(--chrome-surface-shadow)',
    '--footer-chip-bg': isHomeVariant.value
      ? 'var(--home-pill-bg, var(--chrome-chip-bg))'
      : 'var(--chrome-chip-bg)',
    '--footer-chip-border': isHomeVariant.value
      ? 'var(--home-pill-border, var(--chrome-chip-border))'
      : 'var(--chrome-chip-border)',
    '--footer-divider': isHomeVariant.value
      ? 'var(--home-panel-border, var(--chrome-muted-border))'
      : 'var(--chrome-muted-border)',
    '--footer-link-hover-bg': isHomeVariant.value
      ? 'var(--home-tag-hover, var(--chrome-muted-bg))'
      : 'var(--chrome-muted-bg)',
  }

  if (isHomeVariant.value) {
    style['--footer-bg'] = 'transparent'
    style['--footer-overlay'] = 'none'
    style['--footer-top-fade'] = 'none'
  } else if (resolvedTheme.value === 'dark') {
    style['--footer-top-fade'] =
      'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)'
  }

  if (settings.value.uiStyle === 'material') {
    style['--footer-shell-shadow'] = 'var(--shadow-md)'
    style['--footer-shell-border'] = 'var(--ui-surface-border)'
  }

  return style
})
</script>

<style scoped>
.footer {
  position: relative;
  isolation: isolate;
  overflow: clip;
  padding: clamp(1.25rem, 3vw, 2rem) 0 clamp(2rem, 4vw, 2.75rem);
  --footer-bg: linear-gradient(
    180deg,
    rgba(248, 247, 244, 0) 0%,
    rgba(248, 247, 244, 0.42) 20%,
    rgba(248, 247, 244, 0.82) 54%,
    #f8f7f4 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.04) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.03) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 100%);
  --footer-shell-bg: var(--chrome-surface-bg);
  --footer-shell-border: var(--chrome-surface-border);
  --footer-shell-shadow: var(--chrome-surface-shadow);
  --footer-chip-bg: var(--chrome-chip-bg);
  --footer-chip-border: var(--chrome-chip-border);
  --footer-divider: var(--chrome-muted-border);
  --footer-link-hover-bg: var(--chrome-muted-bg);
  background: var(--footer-bg);
}

.footer--home {
  opacity: var(--home-footer-opacity, 1);
  transform: translate3d(0, var(--home-footer-y, 0rem), 0)
    scale3d(var(--home-footer-scale, 1), var(--home-footer-scale, 1), 1);
  transform-origin: 50% 100%;
  transition:
    opacity 220ms cubic-bezier(0.2, 0.84, 0.24, 1),
    transform 220ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer::before,
.footer::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  pointer-events: none;
  z-index: 0;
}

.footer::before {
  inset: 0;
  background: var(--footer-overlay);
  opacity: 0.96;
}

.footer::after {
  inset-block-start: 0;
  block-size: min(18rem, 34dvh);
  background: var(--footer-top-fade);
}

.footer > .container {
  position: relative;
  z-index: 1;
}

:global(#app[data-theme='dark'] .footer),
:global([data-theme='dark'] .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(8, 12, 18, 0) 0%,
    rgba(8, 12, 18, 0.54) 20%,
    rgba(7, 10, 16, 0.88) 54%,
    #070910 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.06) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.04) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  --footer-shell-bg: var(--chrome-surface-bg);
  --footer-shell-border: var(--chrome-surface-border);
  --footer-shell-shadow: var(--chrome-surface-shadow);
  --footer-chip-bg: var(--chrome-chip-bg);
  --footer-chip-border: var(--chrome-chip-border);
  --footer-divider: var(--chrome-muted-border);
  --footer-link-hover-bg: var(--chrome-muted-bg);
}

:global(#app[data-theme='blue'] .footer),
:global([data-theme='blue'] .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0.24) 0%,
    rgba(239, 246, 255, 0.72) 28%,
    rgba(239, 246, 255, 0.96) 62%,
    #eff6ff 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 36%),
    radial-gradient(circle at 82% 6%, rgba(99, 102, 241, 0.06) 0%, transparent 32%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, transparent 100%);
  --footer-shell-bg: var(--chrome-surface-bg);
  --footer-shell-border: var(--chrome-surface-border);
  --footer-shell-shadow: var(--chrome-surface-shadow);
  --footer-chip-bg: var(--chrome-chip-bg);
  --footer-chip-border: var(--chrome-chip-border);
  --footer-divider: var(--chrome-muted-border);
  --footer-link-hover-bg: var(--chrome-muted-bg);
}

:global(main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(248, 247, 244, 0.18) 0%,
    rgba(248, 247, 244, 0.62) 34%,
    rgba(248, 247, 244, 0.92) 70%,
    #f8f7f4 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.04) 0%, transparent 36%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.03) 0%, transparent 32%);
  --footer-top-fade: linear-gradient(180deg, rgba(248, 247, 244, 0.12) 0%, transparent 100%);
}

:global(#app[data-theme='dark'] main.main--home + .footer),
:global([data-theme='dark'] main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(8, 12, 18, 0.18) 0%,
    rgba(8, 12, 18, 0.72) 34%,
    rgba(7, 10, 16, 0.94) 70%,
    #070910 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.06) 0%, transparent 36%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.04) 0%, transparent 32%);
  --footer-top-fade: linear-gradient(180deg, rgba(8, 12, 18, 0.08) 0%, transparent 100%);
}

:global(#app[data-theme='blue'] main.main--home + .footer),
:global([data-theme='blue'] main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0.2) 0%,
    rgba(239, 246, 255, 0.72) 34%,
    rgba(239, 246, 255, 0.96) 70%,
    #eff6ff 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.06) 0%, transparent 36%),
    radial-gradient(circle at 82% 6%, rgba(99, 102, 241, 0.05) 0%, transparent 32%);
  --footer-top-fade: linear-gradient(180deg, rgba(239, 246, 255, 0.12) 0%, transparent 100%);
}

:global(#app[data-ui-style='material'] .footer),
:global([data-ui-style='material'] .footer) {
  --footer-shell-shadow: var(--shadow-md);
}

.footer-shell.empty-surface {
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: var(--ui-radius-card, var(--radius-2xl));
  border-color: var(--footer-shell-border) !important;
  background: var(--footer-shell-bg) !important;
  box-shadow: var(--footer-shell-shadow) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  animation: none;
  will-change: box-shadow;
  transition:
    box-shadow 240ms cubic-bezier(0.2, 0.84, 0.24, 1),
    border-color 240ms cubic-bezier(0.2, 0.84, 0.24, 1),
    background 240ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer-marquee {
  overflow: clip;
  margin-block-end: clamp(0.875rem, 2vw, 1.25rem);
  border-block: 0.0625rem solid rgba(148, 163, 184, 0.12);
  opacity: var(--home-footer-marquee-opacity, 1);
  transition: opacity 220ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer-marquee__track {
  display: inline-flex;
  min-inline-size: max-content;
  gap: clamp(1.25rem, 2.4vw, 1.75rem);
  padding-block: 0.625rem;
  font-size: clamp(1.35rem, 3vw, 2.5rem);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--color-text-primary) 72%, transparent);
  text-transform: uppercase;
  white-space: nowrap;
  animation: footer-marquee 22s linear infinite;
  animation-duration: calc(22s - (var(--home-footer-marquee-speed-progress, 0) * 6s));
  animation-play-state: var(--home-footer-marquee-play-state, running);
  will-change: transform;
}

.footer--home .footer-shell.empty-surface {
  background: var(--footer-shell-bg) !important;
}

.footer-shell.empty-surface::before,
.footer-shell.empty-surface::after {
  display: none;
}

.footer-shell.empty-surface:hover {
  border-color: var(--footer-shell-border);
  box-shadow: var(--footer-shell-shadow);
}

.footer-main {
  display: flex;
  justify-content: space-between;
  gap: clamp(1.5rem, 4vw, 3rem);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-width: 32rem;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  text-decoration: none;
  color: var(--color-text-primary);
}

.brand-logo__mark {
  display: inline-grid;
  place-items: center;
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: var(--ui-radius-input, 1rem);
  background:
    linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.14) 0%, transparent 100%),
    var(--footer-chip-bg);
  border: 1px solid var(--footer-chip-border);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 1rem 2rem -1.5rem rgba(15, 23, 42, 0.18);
  font-size: 1rem;
  font-weight: var(--font-bold);
}

.brand-logo__copy {
  display: flex;
  flex-direction: column;
}

.brand-logo__name {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}

.footer-brand p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.footer-note {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  align-self: flex-start;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.footer-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-6);
  min-width: min(24rem, 100%);
}

.footer-column {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.footer-column__title {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  min-block-size: 2.25rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.footer-link--cta {
  color: var(--color-text-primary);
}

.footer-link:hover {
  color: var(--color-text-primary);
  background: var(--footer-link-hover-bg);
  border-color: var(--footer-chip-border);
}

.footer-link:focus-visible {
  outline: none;
  color: var(--color-text-primary);
  background: var(--footer-link-hover-bg);
  border-color: var(--footer-chip-border);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-4);
  padding-top: var(--spacing-5);
  margin-top: var(--spacing-6);
  border-top: 1px solid var(--footer-divider);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.footer-bottom__meta {
  margin-inline-start: auto;
}

.footer-social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  color: var(--color-text-secondary);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.footer-social-link:hover,
.footer-social-link:focus-visible {
  background: var(--footer-link-hover-bg);
  border-color: var(--footer-chip-border);
  color: var(--color-primary);
}

@keyframes footer-marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
}

@media (max-width: 768px) {
  .footer {
    padding-bottom: calc(env(safe-area-inset-bottom, 0rem) + var(--spacing-6));
  }

  .footer-marquee__track {
    font-size: clamp(1.1rem, 6vw, 1.8rem);
  }

  .footer-main,
  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-columns {
    grid-template-columns: 1fr;
    width: 100%;
    min-width: 0;
  }

  .footer-bottom__meta {
    margin-inline-start: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer--home {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .footer-marquee,
  .footer-marquee__track {
    transition: none;
    animation: none;
  }
}

:global(#app[data-animation-intensity='none'] .footer--home),
:global([data-animation-intensity='none'] .footer--home) {
  opacity: 1;
  transform: none;
}

:global(#app[data-animation-intensity='none'] .footer-marquee__track),
:global([data-animation-intensity='none'] .footer-marquee__track) {
  animation: none;
}
</style>
