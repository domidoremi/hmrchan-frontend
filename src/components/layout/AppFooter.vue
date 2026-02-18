<template>
  <footer class="footer">
    <div class="container footer-content">
      <!-- Brand -->
      <div class="footer-brand">
        <RouterLink to="/" class="brand-logo">
          <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="md" />
          <span>{{ $t('app.name') }}</span>
        </RouterLink>
        <p>{{ $t('footer.desc') }}</p>
      </div>

      <!-- Links -->
      <nav class="footer-nav" aria-label="Footer navigation">
        <RouterLink to="/explore">{{ $t('nav.explore') }}</RouterLink>
        <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
        <RouterLink to="/community">{{ $t('nav.community') }}</RouterLink>
        <RouterLink to="/contact">{{ $t('nav.contact') }}</RouterLink>
      </nav>

      <!-- Bottom -->
      <div class="footer-bottom">
        <span>&copy; {{ currentYear }} {{ $t('app.name') }}</span>
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
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--glass-border);
  padding: var(--spacing-8) 0;
}

.footer-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-6);
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-primary);
  text-decoration: none;
}

.brand-logo svg {
  color: var(--color-primary);
}

.footer-brand p {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  max-width: min(90vw, 17.5rem);
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-4) var(--spacing-6);
}

.footer-nav a {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-nav a:hover {
  color: var(--color-primary);
}

.footer-bottom {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: var(--glass-bg-subtle);
  color: var(--color-text-secondary);
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.social-link:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

@media (max-width: 768px) {
  .footer {
    padding-bottom: calc(var(--mobile-nav-height) + var(--spacing-6));
  }

  .footer-content {
    flex-direction: column;
    text-align: center;
  }

  .footer-brand {
    align-items: center;
  }

  .footer-brand p {
    max-width: none;
  }

  .footer-nav {
    justify-content: center;
  }

  .footer-bottom {
    flex-direction: column;
    gap: var(--spacing-3);
  }
}
</style>
