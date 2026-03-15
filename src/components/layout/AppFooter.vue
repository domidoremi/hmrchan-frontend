<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-shell glass-card" :style="[footerShellStyle, noGlassBackdropStyle]">
        <div class="footer-main">
          <div class="footer-brand">
            <RouterLink to="/" class="brand-logo" :aria-label="$t('app.name')">
              <span class="brand-logo__mark">M</span>
              <span class="brand-logo__copy">
                <span class="brand-logo__name">{{ $t('app.name') }}</span>
                <span class="brand-logo__tagline">{{ $t('app.tagline') }}</span>
              </span>
            </RouterLink>
            <p>{{ $t('footer.desc') }}</p>
            <div class="footer-note">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="sm" />
              <span>{{ $t('footer.note') }}</span>
            </div>
          </div>

          <div class="footer-columns">
            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.discover') }}</span>
              <RouterLink to="/explore">{{ $t('nav.explore') }}</RouterLink>
              <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
              <RouterLink to="/schedule">{{ $t('nav.schedule') }}</RouterLink>
            </nav>

            <nav class="footer-column" :aria-label="$t('common.footerNav')">
              <span class="footer-column__title">{{ $t('footer.columns.community') }}</span>
              <RouterLink to="/community">{{ $t('nav.community') }}</RouterLink>
              <RouterLink to="/contact">{{ $t('nav.contact') }}</RouterLink>
              <RouterLink to="/about">{{ $t('nav.about') }}</RouterLink>
            </nav>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; {{ currentYear }} {{ $t('app.name') }}</span>
          <span class="footer-bottom__meta">{{ $t('footer.rights') }}</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            class="social-link"
          >
            <AnimatedIcon name="explore" :fallback-icon="Github" size="sm" />
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
import { Github, Sparkles } from 'lucide-vue-next'
import { useSettingsStore, useThemeStore } from '@/stores'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const currentYear = computed(() => new Date().getFullYear())
const themeStore = useThemeStore()
const settingsStore = useSettingsStore()
const { resolvedTheme } = storeToRefs(themeStore)
const { settings } = storeToRefs(settingsStore)
const noGlassBackdropStyle = Object.freeze({
  backdropFilter: 'blur(0rem)',
  WebkitBackdropFilter: 'blur(0rem)',
}) as Readonly<Record<string, string>>
const footerShellStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}

  if (resolvedTheme.value === 'dark') {
    style['--footer-shell-bg'] =
      'linear-gradient(160deg, rgba(9, 13, 21, 0.92), rgba(14, 19, 29, 0.84))'
    style['--footer-shell-border'] = 'rgba(255, 255, 255, 0.08)'
    style['--footer-shell-shadow'] = '0 1.25rem 3rem -2rem rgba(0, 0, 0, 0.46)'
    style['--footer-chip-bg'] = 'rgba(18, 24, 36, 0.72)'
    style['--footer-chip-border'] = 'rgba(255, 255, 255, 0.08)'
  } else if (resolvedTheme.value === 'blue') {
    style['--footer-shell-bg'] =
      'linear-gradient(160deg, rgba(255, 255, 255, 0.92), rgba(239, 246, 255, 0.84))'
    style['--footer-shell-border'] = 'rgba(59, 130, 246, 0.14)'
    style['--footer-shell-shadow'] = '0 1.2rem 3rem -2rem rgba(37, 99, 235, 0.18)'
    style['--footer-chip-bg'] = 'rgba(255, 255, 255, 0.76)'
    style['--footer-chip-border'] = 'rgba(59, 130, 246, 0.12)'
  } else {
    style['--footer-shell-bg'] =
      'linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.78))'
    style['--footer-shell-border'] = 'rgba(255, 255, 255, 0.46)'
    style['--footer-shell-shadow'] = '0 1.15rem 2.8rem -1.9rem rgba(35, 53, 85, 0.22)'
    style['--footer-chip-bg'] = 'rgba(255, 255, 255, 0.72)'
    style['--footer-chip-border'] = 'rgba(148, 163, 184, 0.12)'
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
    rgba(248, 247, 244, 0.54) 18%,
    rgba(248, 247, 244, 0.92) 50%,
    #f8f7f4 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.07) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0%, transparent 100%);
  --footer-shell-bg: linear-gradient(155deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.82));
  --footer-shell-border: rgba(255, 255, 255, 0.58);
  --footer-shell-shadow: 0 1.5rem 3.6rem -2.2rem rgba(35, 53, 85, 0.28);
  --footer-chip-bg: rgba(255, 255, 255, 0.78);
  --footer-chip-border: rgba(148, 163, 184, 0.14);
  --footer-divider: rgba(148, 163, 184, 0.14);
  --footer-link-hover-bg: rgba(255, 255, 255, 0.58);
  background: var(--footer-bg);
  opacity: var(--home-footer-opacity, 1);
  transform: translate3d(0, var(--home-footer-y, 0rem), 0);
  will-change: transform, opacity;
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
    rgba(7, 10, 16, 0) 0%,
    rgba(8, 12, 18, 0.7) 18%,
    rgba(7, 10, 16, 0.94) 48%,
    #070910 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.12) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.08) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%);
  --footer-shell-bg: linear-gradient(155deg, rgba(12, 16, 23, 0.98), rgba(18, 24, 36, 0.94));
  --footer-shell-border: rgba(255, 255, 255, 0.12);
  --footer-shell-shadow: 0 1.8rem 4rem -2.4rem rgba(0, 0, 0, 0.52);
  --footer-chip-bg: rgba(18, 24, 36, 0.88);
  --footer-chip-border: rgba(255, 255, 255, 0.08);
  --footer-divider: rgba(255, 255, 255, 0.08);
  --footer-link-hover-bg: rgba(255, 255, 255, 0.03);
}

:global(#app[data-theme='blue'] .footer),
:global([data-theme='blue'] .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0) 0%,
    rgba(239, 246, 255, 0.66) 18%,
    rgba(239, 246, 255, 0.96) 50%,
    #eff6ff 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.12) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(99, 102, 241, 0.1) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, transparent 100%);
  --footer-shell-bg: linear-gradient(155deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
  --footer-shell-border: rgba(59, 130, 246, 0.18);
  --footer-shell-shadow: 0 1.7rem 4rem -2.4rem rgba(37, 99, 235, 0.2);
  --footer-chip-bg: rgba(255, 255, 255, 0.88);
  --footer-chip-border: rgba(59, 130, 246, 0.14);
  --footer-divider: rgba(59, 130, 246, 0.14);
  --footer-link-hover-bg: rgba(255, 255, 255, 0.64);
}

:global(main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(248, 247, 244, 0.58) 0%,
    rgba(248, 247, 244, 0.72) 22%,
    rgba(248, 247, 244, 0.92) 58%,
    #f8f7f4 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.05) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.04) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(248, 247, 244, 0.18) 0%, transparent 100%);
}

:global(#app[data-theme='dark'] main.main--home + .footer),
:global([data-theme='dark'] main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(8, 12, 18, 0.74) 0%,
    rgba(8, 12, 18, 0.82) 22%,
    rgba(7, 10, 16, 0.94) 58%,
    #070910 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(var(--color-accent-rgb), 0.06) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(8, 12, 18, 0.12) 0%, transparent 100%);
}

:global(#app[data-theme='blue'] main.main--home + .footer),
:global([data-theme='blue'] main.main--home + .footer) {
  --footer-bg: linear-gradient(
    180deg,
    rgba(239, 246, 255, 0.72) 0%,
    rgba(239, 246, 255, 0.82) 22%,
    rgba(239, 246, 255, 0.96) 58%,
    #eff6ff 100%
  );
  --footer-overlay:
    radial-gradient(circle at 18% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 34%),
    radial-gradient(circle at 82% 6%, rgba(99, 102, 241, 0.06) 0%, transparent 30%);
  --footer-top-fade: linear-gradient(180deg, rgba(239, 246, 255, 0.18) 0%, transparent 100%);
}

:global(#app[data-ui-style='material'] .footer),
:global([data-ui-style='material'] .footer) {
  --footer-shell-shadow: var(--shadow-md);
}

.footer-shell.glass-card {
  padding: clamp(1.5rem, 3vw, 2rem);
  border-radius: var(--ui-radius-card, var(--radius-2xl));
  border-color: var(--footer-shell-border) !important;
  background: var(--footer-shell-bg) !important;
  box-shadow: var(--footer-shell-shadow) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  will-change: box-shadow;
  transition:
    box-shadow 240ms cubic-bezier(0.2, 0.84, 0.24, 1),
    border-color 240ms cubic-bezier(0.2, 0.84, 0.24, 1),
    background 240ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer-shell.glass-card::before,
.footer-shell.glass-card::after {
  display: none;
}

.footer-shell.glass-card:hover {
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
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.2) 0%,
    rgba(var(--color-accent-rgb), 0.24) 100%
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
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

.brand-logo__tagline {
  font-size: 0.6875rem;
  color: var(--color-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--ui-radius-button, var(--radius-full));
  background: var(--footer-chip-bg);
  border: 1px solid var(--footer-chip-border);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
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

.footer-column a {
  display: inline-flex;
  align-items: center;
  min-block-size: 2rem;
  padding-inline: 0.125rem;
  border-radius: 0.5rem;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.footer-column a:hover {
  color: var(--color-text-primary);
  background: var(--footer-link-hover-bg);
  transform: translateX(0.125rem);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--ui-radius-button, var(--radius-full));
  background: var(--footer-chip-bg);
  border: 1px solid var(--footer-chip-border);
  color: var(--color-text-secondary);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.social-link:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: translateY(-0.0625rem);
}

@media (max-width: 768px) {
  .footer {
    padding-bottom: calc(var(--mobile-nav-height) + var(--spacing-6));
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
</style>
