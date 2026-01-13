<template>
  <footer class="footer">
    <!-- CTA Section -->
    <section class="footer-cta">
      <div class="container">
        <div class="cta-content">
          <h2 class="cta-title">
            <span>{{ $t('footer.cta.title1') }}</span>
            <span class="cta-title--highlight">{{ $t('footer.cta.title2') }}</span>
          </h2>
          <p class="cta-desc">{{ $t('footer.cta.desc') }}</p>

          <div class="cta-actions">
            <RouterLink to="/explore" class="cta-btn cta-btn--primary">
              <Compass :size="18" />
              {{ $t('nav.explore') }}
            </RouterLink>
            <RouterLink v-if="!isAuthenticated" to="/login" class="cta-btn cta-btn--outline">
              <UserPlus :size="18" />
              {{ $t('footer.cta.join') }}
            </RouterLink>
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
import { Compass, Github, Sparkles, UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
/* ========== CTA Section ========== */
.footer-cta {
  padding: var(--spacing-16) 0;
  background: var(--glass-bg-subtle);
  border-bottom: 1px solid var(--glass-border);
}

.cta-content {
  text-align: center;
  max-width: 560px;
  margin: 0 auto;
}

.cta-title {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-4);
  line-height: var(--leading-tight);
}

.cta-title--highlight {
  color: var(--color-primary);
}

.cta-desc {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
  line-height: var(--leading-relaxed);
}

.cta-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-decoration: none;
  transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease;
}

.cta-btn:active {
  transform: scale(0.98);
}

.cta-btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.cta-btn--primary:hover {
  background: var(--color-primary-hover);
}

.cta-btn--outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.cta-btn--outline:hover {
  border-color: var(--color-primary);
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
  color: var(--color-primary);
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
  transition: color 0.15s ease;
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
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.social-link:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .footer-cta {
    padding: var(--spacing-12) 0;
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
