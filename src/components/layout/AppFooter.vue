<template>
  <footer class="footer">
    <!-- CTA Section - MindMarket 风格增强版 -->
    <section class="footer-cta">
      <!-- 有机形状装饰背景 -->
      <div class="cta-bg">
        <div class="cta-blob cta-blob--1" />
        <div class="cta-blob cta-blob--2" />
        <div class="cta-blob cta-blob--3" />
        <svg class="cta-wave" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,60 C360,120 720,0 1080,60 C1260,90 1380,30 1440,60 L1440,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div class="container">
        <div class="cta-content">
          <!-- 装饰性徽章 -->
          <div class="cta-badge">
            <Sparkles :size="14" />
            <span>{{ $t('app.name') }}</span>
          </div>

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
            <RouterLink v-if="!isAuthenticated" to="/login" class="cta-btn cta-btn--secondary">
              <UserPlus :size="18" />
              {{ $t('footer.cta.join') }}
            </RouterLink>
          </div>

          <div class="cta-features">
            <div class="cta-feature">
              <div class="cta-feature-icon">
                <Zap :size="16" />
              </div>
              <span>{{ $t('footer.cta.feature1') }}</span>
            </div>
            <div class="cta-feature">
              <div class="cta-feature-icon">
                <Globe :size="16" />
              </div>
              <span>{{ $t('footer.cta.feature2') }}</span>
            </div>
            <div class="cta-feature">
              <div class="cta-feature-icon">
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
import { Compass, GithubIcon, Globe, Heart, Sparkles, UserPlus, Zap } from 'lucide-vue-next'
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

/* 背景装饰 */
.cta-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.cta-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: blob-float 20s ease-in-out infinite;
}

.cta-blob--1 {
  width: 500px;
  height: 500px;
  top: -200px;
  left: -100px;
  background: radial-gradient(
    circle,
    rgba(var(--color-primary-rgb), 0.25) 0%,
    rgba(var(--color-primary-rgb), 0.1) 40%,
    transparent 70%
  );
  animation-delay: 0s;
}

.cta-blob--2 {
  width: 400px;
  height: 400px;
  bottom: -150px;
  right: -50px;
  background: radial-gradient(
    circle,
    rgba(var(--color-accent-rgb), 0.2) 0%,
    rgba(var(--color-accent-rgb), 0.08) 40%,
    transparent 70%
  );
  animation-delay: -7s;
}

.cta-blob--3 {
  width: 300px;
  height: 300px;
  top: 50%;
  left: 60%;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgba(var(--color-secondary-rgb), 0.15) 0%,
    transparent 60%
  );
  animation-delay: -14s;
}

@keyframes blob-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -20px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(20px, 10px) scale(1.02);
  }
}

.cta-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 80px;
  color: var(--color-bg-primary);
  opacity: 0.5;
}

.cta-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
}

/* 徽章 */
.cta-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  margin-bottom: var(--spacing-6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.cta-badge svg {
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.9);
  }
}

.cta-title {
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: var(--font-bold);
  line-height: 1.15;
  margin-bottom: var(--spacing-5);
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

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4) var(--spacing-8);
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: all var(--transition-normal);
}

.cta-btn--primary {
  background: var(--gradient-primary);
  color: var(--color-white);
  box-shadow:
    0 4px 20px rgba(var(--color-primary-rgb), 0.35),
    0 0 0 0 rgba(var(--color-primary-rgb), 0.2);
}

.cta-btn--primary:hover {
  transform: translateY(-3px);
  box-shadow:
    0 8px 30px rgba(var(--color-primary-rgb), 0.45),
    0 0 0 4px rgba(var(--color-primary-rgb), 0.1);
}

.cta-btn--secondary {
  background: var(--glass-bg-strong);
  color: var(--color-text-primary);
  border: 2px solid var(--glass-border-strong);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.cta-btn--secondary:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-3px);
}

.cta-features {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}

.cta-feature {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-5);
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all var(--transition-fast);
}

.cta-feature:hover {
  border-color: rgba(var(--color-primary-rgb), 0.3);
  transform: translateY(-2px);
}

.cta-feature-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--color-primary-rgb), 0.12);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
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
    padding: var(--spacing-16) 0 var(--spacing-12);
  }

  .cta-blob--1 {
    width: 300px;
    height: 300px;
  }

  .cta-blob--2 {
    width: 250px;
    height: 250px;
  }

  .cta-blob--3 {
    display: none;
  }

  .cta-features {
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
  }

  .cta-feature {
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
  .cta-blob {
    animation: none;
  }

  .cta-badge svg {
    animation: none;
  }
}
</style>
