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

      <div class="footer-shell empty-surface" :style="footerShellStyle">
        <div class="footer-main">
          <div class="footer-brand">
            <RouterLink to="/" class="brand-logo" :aria-label="$t('app.name')">
              <span class="brand-logo__mark" aria-hidden="true">M</span>
              <span class="brand-logo__copy">
                <span class="brand-logo__name">{{ $t('app.name') }}</span>
              </span>
            </RouterLink>
            <p>{{ $t('footer.desc') }}</p>
            <PageMetaChip class="footer-note">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
              <span>{{ $t('footer.note') }}</span>
            </PageMetaChip>
            <div v-if="isHomeVariant" class="footer-actions">
              <ControlButton :tag="RouterLink" to="/explore" class="footer-link footer-link--cta">
                {{ $t('home.hero.primaryAction') }}
              </ControlButton>
              <ControlButton :tag="RouterLink" to="/contact" class="footer-link" size="compact">
                {{ $t('nav.contact') }}
              </ControlButton>
            </div>
          </div>

          <div class="footer-columns">
            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.discover') }}</span>
              <ControlButton :tag="RouterLink" to="/explore" class="footer-link" size="compact">
                {{ $t('nav.explore') }}
              </ControlButton>
              <ControlButton :tag="RouterLink" to="/authors" class="footer-link" size="compact">
                {{ $t('nav.authors') }}
              </ControlButton>
              <ControlButton :tag="RouterLink" to="/schedule" class="footer-link" size="compact">
                {{ $t('nav.schedule') }}
              </ControlButton>
            </nav>

            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.community') }}</span>
              <ControlButton :tag="RouterLink" to="/community" class="footer-link" size="compact">
                {{ $t('nav.community') }}
              </ControlButton>
              <ControlButton :tag="RouterLink" to="/contact" class="footer-link" size="compact">
                {{ $t('nav.contact') }}
              </ControlButton>
              <ControlButton :tag="RouterLink" to="/about" class="footer-link" size="compact">
                {{ $t('nav.about') }}
              </ControlButton>
            </nav>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; {{ currentYear }} {{ $t('app.name') }}</span>
          <span class="footer-bottom__meta">{{ $t('footer.rights') }}</span>
          <ControlButton
            :tag="'a'"
            href="https://github.com/domidoremi/hmrchan-frontend"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            class="footer-social-link"
            size="square"
            icon-only
          >
            <template #start>
              <AnimatedIcon name="explore" :fallback-icon="IconGithub" size="sm" />
            </template>
          </ControlButton>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Sparkles } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import ControlButton from '@/components/appearance/ControlButton.vue'
import PageMetaChip from '@/components/appearance/PageMetaChip.vue'
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
const isHomeVariant = computed(() => props.variant === 'home')
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
      ? 'var(--home-panel-bg-soft, var(--ui-compat-surface-elevated, var(--chrome-surface-bg)))'
      : 'var(--ui-compat-surface-elevated, var(--chrome-surface-bg))',
    '--footer-shell-border': isHomeVariant.value
      ? 'var(--home-panel-border, var(--ui-compat-shell-border, var(--chrome-surface-border)))'
      : 'var(--ui-compat-shell-border, var(--chrome-surface-border))',
    '--footer-shell-shadow': isHomeVariant.value
      ? 'var(--home-panel-shadow, var(--ui-compat-shell-shadow, var(--chrome-surface-shadow)))'
      : 'var(--ui-compat-shell-shadow, var(--chrome-surface-shadow))',
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
  return style
})
</script>

<style scoped>
.footer {
  position: relative;
  isolation: isolate;
  overflow: visible;
  padding: clamp(1.25rem, 3vw, 2rem) 0 clamp(2rem, 4vw, 2.75rem);
  --footer-shell-bg: var(--ui-compat-surface-elevated, var(--chrome-surface-bg));
  --footer-shell-border: var(--ui-compat-shell-border, var(--chrome-surface-border));
  --footer-shell-shadow: var(--ui-compat-shell-shadow, var(--chrome-surface-shadow));
  --footer-chip-bg: var(--chrome-chip-bg);
  --footer-chip-border: var(--chrome-chip-border);
  --footer-divider: var(--chrome-muted-border);
  --footer-link-hover-bg: var(--chrome-muted-bg);
  --footer-marquee-ink: color-mix(in srgb, var(--color-text-primary) 88%, transparent);
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

.footer > .container {
  position: relative;
  z-index: 1;
}

.footer-shell.empty-surface {
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: var(--appearance-radius-panel);
  border-color: var(--footer-shell-border);
  background: var(--footer-shell-bg);
  box-shadow: var(--footer-shell-shadow);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
  flex-shrink: 0;
  gap: clamp(1.25rem, 2.4vw, 1.75rem);
  padding-block: 0.625rem;
  font-size: clamp(1.35rem, 3vw, 2.5rem);
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  color: var(--footer-marquee-ink);
  text-transform: uppercase;
  white-space: nowrap;
  animation: footer-marquee 22s linear infinite;
  animation-duration: calc(22s - (var(--home-footer-marquee-speed-progress, 0) * 6s));
  animation-play-state: var(--home-footer-marquee-play-state, running);
  will-change: transform;
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

.footer-note.page-meta-chip {
  gap: var(--spacing-2);
  align-self: flex-start;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  box-shadow: none;
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

.footer-link.page-control {
  justify-content: flex-start;
  min-inline-size: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  box-shadow: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.footer-link--cta.page-control {
  color: var(--color-text-primary);
}

.footer-link.page-control:hover,
.footer-link.page-control:focus-visible {
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

.footer-social-link.page-control {
  min-inline-size: var(--ui-action-size);
  block-size: var(--ui-action-size);
  padding: 0;
  color: var(--color-text-secondary);
  box-shadow: none;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.footer-social-link.page-control:hover,
.footer-social-link.page-control:focus-visible {
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
    gap: clamp(0.75rem, 4vw, 1.25rem);
    font-size: clamp(1rem, 5vw, 1.35rem);
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

@media (max-width: 1024px) {
  .footer--home {
    transform: none;
    transition: opacity 180ms cubic-bezier(0.2, 0.84, 0.24, 1);
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
</style>
