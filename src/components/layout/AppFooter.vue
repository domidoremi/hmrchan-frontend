<template>
  <footer class="footer">
    <!-- CTA Section - 借鉴 MindMarket "Ready when you are" 风格 -->
    <section class="footer-cta">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">
            <span class="cta-title-line">{{ $t('footer.cta.title1') }}</span>
            <span class="cta-title-highlight">{{ $t('footer.cta.title2') }}</span>
          </h2>
          <p class="cta-desc">{{ $t('footer.cta.desc') }}</p>
          <div class="cta-actions">
            <RouterLink to="/explore" class="cta-btn cta-btn--primary">
              <Compass :size="18" />
              {{ $t('nav.explore') }}
            </RouterLink>
            <RouterLink v-if="!isAuthenticated" to="/login" class="cta-btn cta-btn--ghost">
              <UserPlus :size="18" />
              {{ $t('footer.cta.join') }}
            </RouterLink>
          </div>
          <div class="cta-features">
            <div class="cta-feature">
              <Zap :size="14" />
              <span>{{ $t('footer.cta.feature1') }}</span>
            </div>
            <div class="cta-feature">
              <Globe :size="14" />
              <span>{{ $t('footer.cta.feature2') }}</span>
            </div>
            <div class="cta-feature">
              <Heart :size="14" />
              <span>{{ $t('footer.cta.feature3') }}</span>
            </div>
          </div>
        </div>
        <!-- 装饰性有机形状 -->
        <div class="cta-decoration">
          <div class="cta-blob cta-blob--1" />
          <div class="cta-blob cta-blob--2" />
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
              <Github :size="18" />
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
import { Compass, Github, Globe, Heart, Sparkles, UserPlus, Zap } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
/* ========== CTA Section ========== */
.footer-cta {
  position: relative;
  padding: var(--spacing-16) 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--color-primary-rgb), 0.03) 50%,
    rgba(var(--color-primary-rgb), 0.06) 100%
  );
  overflow: hidden;
}

.cta-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: var(--font-bold);
  line-height: 1.2;
  margin-bottom: var(--spacing-4);
}

.cta-title-line {
  display: block;
  color: var(--color-text-primary);
}

.cta-title-highlight {
  display: block;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.cta-desc {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-8);
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-6);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.cta-btn--primary {
  background: var(--gradient-primary);
  color: var(--color-white);
  box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.3);
}

.cta-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(var(--color-primary-rgb), 0.4);
}

.cta-btn--ghost {
  background: var(--glass-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--glass-border-strong);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cta-btn--ghost:hover {
  background: var(--glass-bg-strong);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.cta-features {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4) var(--spacing-6);
}

.cta-feature {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cta-feature svg {
  color: var(--color-primary);
}

/* Decorative Blobs */
.cta-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cta-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
}

.cta-blob--1 {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -50px;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.3) 0%, transparent 70%);
}

.cta-blob--2 {
  width: 250px;
  height: 250px;
  bottom: -80px;
  right: -30px;
  background: radial-gradient(circle, rgba(var(--color-accent-rgb), 0.25) 0%, transparent 70%);
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
  color: var(--color-primary);
}

.brand-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  background: var(--gradient-accent);
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
  color: var(--color-primary);
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
  transition: all var(--transition-fast);
}

.social-link:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
  transform: translateY(-2px);
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .footer-cta {
    padding: var(--spacing-12) 0;
  }

  .cta-features {
    flex-direction: column;
    align-items: center;
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
</style>
