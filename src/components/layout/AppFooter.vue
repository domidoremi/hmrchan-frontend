<template>
  <footer class="footer">
    <!-- CTA Section - MindMarket 风格 -->
    <section class="footer-cta">
      <!-- MindMarket 有机形状背景 -->
      <div class="mm-hero-bg">
        <div class="mm-blob mm-blob--green mm-blob--float" style="width: 500px; height: 500px; top: -200px; left: -100px;" />
        <div class="mm-blob mm-blob--yellow mm-blob--float-reverse" style="width: 400px; height: 400px; bottom: -150px; right: -50px;" />
        <div class="mm-blob mm-blob--purple mm-blob--float-slow" style="width: 300px; height: 300px; top: 50%; left: 60%;" />
      </div>

      <div class="container">
        <div class="cta-content">
          <!-- MindMarket 风格徽章 -->
          <div class="mm-badge">
            <Sparkles :size="14" />
            <span>{{ $t('app.name') }}</span>
          </div>

          <h2 class="mm-heading mm-heading--xl cta-title">
            <span class="cta-title-line">{{ $t('footer.cta.title1') }}</span>
            <span class="mm-heading--gradient">{{ $t('footer.cta.title2') }}</span>
          </h2>
          <p class="cta-desc">{{ $t('footer.cta.desc') }}</p>

          <div class="cta-actions">
            <RouterLink to="/explore" class="mm-btn mm-btn--green mm-btn--lg">
              <Compass :size="18" />
              {{ $t('nav.explore') }}
              <span class="mm-btn__icon">
                <ArrowRight :size="16" />
              </span>
            </RouterLink>
            <RouterLink v-if="!isAuthenticated" to="/login" class="mm-btn mm-btn--outline mm-btn--lg">
              <UserPlus :size="18" />
              {{ $t('footer.cta.join') }}
            </RouterLink>
          </div>

          <div class="cta-features">
            <div class="mm-feature-tag">
              <div class="mm-feature-tag__icon">
                <Zap :size="16" />
              </div>
              <span>{{ $t('footer.cta.feature1') }}</span>
            </div>
            <div class="mm-feature-tag mm-feature-tag--orange">
              <div class="mm-feature-tag__icon">
                <Globe :size="16" />
              </div>
              <span>{{ $t('footer.cta.feature2') }}</span>
            </div>
            <div class="mm-feature-tag mm-feature-tag--coral">
              <div class="mm-feature-tag__icon">
                <Heart :size="16" />
              </div>
              <span>{{ $t('footer.cta.feature3') }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Footer -->
    <div class="footer-main">
      <div class="container footer-content">
        <div class="footer-grid">
          <!-- Brand Column -->
          <div class="footer-brand">
            <div class="brand-logo">
              <Sparkles :size="20" />
              <span class="brand-name">{{ $t('app.name') }}</span>
            </div>
            <p class="footer-desc">{{ $t('footer.desc') }}</p>
          </div>

          <!-- Navigation Column -->
          <div class="footer-nav">
            <h4 class="footer-nav-title">{{ $t('footer.nav.explore') }}</h4>
            <div class="footer-links">
              <RouterLink to="/explore">{{ $t('nav.explore') }}</RouterLink>
              <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
              <RouterLink to="/community">{{ $t('nav.community') }}</RouterLink>
              <RouterLink to="/search">{{ $t('nav.search') }}</RouterLink>
            </div>
          </div>

          <!-- Support Column -->
          <div class="footer-nav">
            <h4 class="footer-nav-title">{{ $t('footer.nav.support') }}</h4>
            <div class="footer-links">
              <RouterLink to="/contact">{{ $t('nav.contact') }}</RouterLink>
              <RouterLink to="/settings">{{ $t('nav.settings') }}</RouterLink>
            </div>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="footer-bottom">
          <p class="footer-copyright">
            &copy; {{ currentYear }} {{ $t('app.name') }}. {{ $t('footer.rights') }}
          </p>
          <div class="footer-social">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              aria-label="GitHub"
            >
              <GithubIcon :size="18" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowRight, Compass, GithubIcon, Globe, Heart, Sparkles, UserPlus, Zap } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
/* ========== CTA Section - MindMarket 风格 ========== */
.footer-cta {
  position: relative;
  padding: var(--spacing-20) 0 var(--spacing-16);
  overflow: hidden;
}

.cta-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

.cta-content .mm-badge {
  margin-bottom: var(--spacing-6);
}

.cta-title {
  margin-bottom: var(--spacing-5);
}

.cta-title-line {
  display: block;
  color: var(--color-text-primary);
}

.cta-desc {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
  line-height: var(--leading-relaxed);
}

.cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-10);
}

.cta-features {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

/* ========== Main Footer ========== */
.footer-main {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--glass-border);
  padding: var(--spacing-12) 0 var(--spacing-6);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--spacing-8);
}

/* Brand */
.footer-brand {
  max-width: 320px;
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-3);
}

.brand-logo svg {
  color: var(--mm-green);
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  background: var(--mm-gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-desc {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

/* Navigation */
.footer-nav-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.footer-links a {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--mm-green);
}

/* Bottom Bar */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--spacing-6);
  border-top: 1px solid var(--glass-border);
}

.footer-copyright {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.footer-social {
  display: flex;
  gap: var(--spacing-3);
}

.social-link {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg-subtle);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.social-link:hover {
  background: var(--mm-green);
  border-color: var(--mm-green);
  color: var(--color-white);
  transform: translateY(-2px);
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .footer-cta {
    padding: var(--spacing-16) 0 var(--spacing-12);
  }

  .cta-features {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
  }

  .cta-features .mm-feature-tag {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }

  .footer-main {
    padding-bottom: calc(72px + var(--spacing-6));
  }

  .footer-grid {
    grid-template-columns: 1fr;
    text-align: center;
    gap: var(--spacing-6);
  }

  .footer-brand {
    max-width: none;
  }

  .footer-links {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-3) var(--spacing-5);
  }

  .footer-bottom {
    flex-direction: column;
    gap: var(--spacing-4);
    text-align: center;
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .mm-blob {
    animation: none;
  }
}
</style>
