<template>
  <footer class="app-footer glass">
    <div class="container footer-content">
      <div class="footer-section">
        <h4>{{ $t('app.name') }}</h4>
        <p>{{ $t('app.description') }}</p>
      </div>

      <div class="footer-section">
        <h4>{{ $t('nav.explore') }}</h4>
        <ul class="footer-links">
          <li><RouterLink to="/explore?platform=youtube">YouTube</RouterLink></li>
          <li><RouterLink to="/explore?platform=twitter">Twitter</RouterLink></li>
          <li><RouterLink to="/explore?platform=tiktok">TikTok</RouterLink></li>
          <li><RouterLink to="/explore?platform=instagram">Instagram</RouterLink></li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>{{ $t('common.more') }}</h4>
        <ul class="footer-links">
          <li>
            <RouterLink to="/authors">{{ $t('nav.authors') }}</RouterLink>
          </li>
          <li>
            <RouterLink to="/settings">{{ $t('nav.settings') }}</RouterLink>
          </li>
        </ul>
      </div>

      <div class="footer-section">
        <p class="footer-copyright">&copy; 2025 HMRChan. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  padding: var(--spacing-2xl) 0;
  border-top: 1px solid var(--glass-border);
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-xl);
}

.footer-section h4 {
  color: var(--color-text-primary);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.footer-section p {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  line-height: var(--line-relaxed);
}

.footer-links {
  list-style: none;
  padding: 0;
}

.footer-links li {
  margin-bottom: var(--spacing-sm);
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

.footer-copyright {
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
}

@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
}
</style>
