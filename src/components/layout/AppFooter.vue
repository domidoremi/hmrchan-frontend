<template>
  <footer class="footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <span class="brand-name">{{ $t('app.name') }}</span>
        <p class="footer-desc">Discover amazing content from talented creators.</p>
      </div>

      <div class="footer-links">
        <RouterLink to="/explore">{{ $t('nav.explore') }}</RouterLink>
        <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
        <RouterLink to="/contact">{{ $t('nav.contact') }}</RouterLink>
        <RouterLink to="/settings">{{ $t('nav.settings') }}</RouterLink>
      </div>

      <div class="footer-bottom">
        <p>&copy; {{ currentYear }} {{ $t('app.name') }}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.footer {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--glass-border);
  padding: var(--spacing-12) 0 var(--spacing-6);
  margin-top: auto;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

.footer-brand {
  text-align: center;
}

.brand-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-desc {
  margin-top: var(--spacing-2);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.footer-links {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--spacing-4) var(--spacing-6);
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

.footer-bottom {
  text-align: center;
  padding-top: var(--spacing-6);
  border-top: 1px solid var(--glass-border);
}

.footer-bottom p {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

@media (max-width: 768px) {
  .footer {
    padding-bottom: calc(64px + var(--spacing-6));
  }
}
</style>
