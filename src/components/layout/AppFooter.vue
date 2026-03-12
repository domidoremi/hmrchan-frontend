<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-shell glass-card">
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
import { RouterLink } from 'vue-router'
import { Github, Sparkles } from 'lucide-vue-next'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.footer {
  position: relative;
  padding: var(--spacing-8) 0;
  background:
    radial-gradient(circle at top left, rgba(199, 220, 244, 0.18) 0%, transparent 34%),
    radial-gradient(circle at top right, rgba(246, 218, 229, 0.16) 0%, transparent 30%),
    linear-gradient(
      180deg,
      rgba(248, 247, 244, 0.82) 0%,
      rgba(248, 247, 244, 0.96) 32%,
      #f8f7f4 100%
    );
  opacity: var(--home-footer-opacity, 1);
  transform: translate3d(0, var(--home-footer-y, 0rem), 0);
  filter: blur(var(--home-footer-blur, 0rem));
  transition:
    opacity 360ms cubic-bezier(0.2, 0.84, 0.24, 1),
    transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1),
    filter 360ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  inset-block-start: 0;
  block-size: clamp(5rem, 10vw, 8rem);
  background:
    linear-gradient(180deg, rgba(248, 247, 244, 0), rgba(248, 247, 244, 0.72)),
    radial-gradient(circle at top center, rgba(255, 255, 255, 0.24), transparent 68%);
  pointer-events: none;
}

.footer-shell {
  padding: clamp(1.5rem, 3vw, 2rem);
  border-color: rgba(255, 255, 255, 0.6);
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.84)),
    rgba(255, 255, 255, 0.76);
  box-shadow:
    0 2rem 4.4rem -2.8rem rgba(35, 53, 85, 0.18),
    inset 0 0.0625rem 0 rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(1rem);
  will-change: transform, box-shadow;
  transform: translate3d(0, var(--home-footer-shell-y, 0rem), 0);
  transition:
    transform 420ms cubic-bezier(0.2, 0.9, 0.25, 1),
    box-shadow 360ms cubic-bezier(0.2, 0.84, 0.24, 1),
    border-color 360ms cubic-bezier(0.2, 0.84, 0.24, 1),
    background 360ms cubic-bezier(0.2, 0.84, 0.24, 1);
}

.footer-shell:hover {
  transform: translate3d(0, var(--home-footer-shell-y, 0rem), 0);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: var(--glass-shadow);
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
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(122, 146, 190, 0.22) 0%, rgba(220, 166, 187, 0.28) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
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
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
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
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.footer-column a:hover {
  color: var(--color-text-primary);
  transform: translateX(0.125rem);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding-top: var(--spacing-5);
  margin-top: var(--spacing-6);
  border-top: 1px solid rgba(148, 163, 184, 0.12);
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
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-text-secondary);
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.social-link:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: translateY(-0.125rem);
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
