<template>
  <section class="stats-section">
    <div class="container">
      <div class="stats-header">
        <h2 class="stats-title">
          <span>{{ $t('stats.title.prefix') }}</span>
          <span class="stats-title__highlight">{{ $t('stats.title.highlight') }}</span>
          <span>{{ $t('stats.title.suffix') }}</span>
        </h2>
        <p class="stats-subtitle">{{ $t('stats.subtitle') }}</p>
      </div>

      <div class="stats-grid">
        <div
          v-for="platform in platforms"
          :key="platform.key"
          class="platform-card"
          :class="`platform-card--${platform.key}`"
        >
          <div class="platform-card__icon">
            <component :is="platform.icon" :size="20" :stroke-width="2" />
          </div>
          <span class="platform-card__label">{{ $t(platform.labelKey) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Music2, Youtube, Instagram, Twitter } from 'lucide-vue-next'

const platforms = [
  {
    key: 'tiktok',
    icon: Music2,
    labelKey: 'stats.tiktok',
  },
  {
    key: 'youtube',
    icon: Youtube,
    labelKey: 'stats.youtube',
  },
  {
    key: 'instagram',
    icon: Instagram,
    labelKey: 'stats.instagram',
  },
  {
    key: 'twitter',
    icon: Twitter,
    labelKey: 'stats.twitter',
  },
]
</script>

<style scoped>
.stats-section {
  padding: var(--spacing-16) 0;
}

.stats-header {
  text-align: center;
  margin-bottom: var(--spacing-10);
}

.stats-title {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
  line-height: var(--leading-tight);
}

.stats-title__highlight {
  color: var(--color-primary);
}

.stats-subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 480px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
}

.platform-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.platform-card:hover {
  transform: translateY(-2px);
}

.platform-card__icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.platform-card__label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

/* 平台颜色 */
.platform-card--tiktok .platform-card__icon {
  background: rgba(0, 0, 0, 0.08);
  color: #000;
}

.platform-card--tiktok:hover {
  border-color: #000;
}

.platform-card--youtube .platform-card__icon {
  background: rgba(255, 0, 0, 0.1);
  color: #ff0000;
}

.platform-card--youtube:hover {
  border-color: #ff0000;
}

.platform-card--instagram .platform-card__icon {
  background: linear-gradient(135deg, rgba(131, 58, 180, 0.1), rgba(253, 29, 29, 0.1));
  color: #e1306c;
}

.platform-card--instagram:hover {
  border-color: #e1306c;
}

.platform-card--twitter .platform-card__icon {
  background: rgba(0, 0, 0, 0.08);
  color: #000;
}

.platform-card--twitter:hover {
  border-color: #000;
}

/* 暗色模式 */
[data-theme='dark'] .platform-card--tiktok .platform-card__icon {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

[data-theme='dark'] .platform-card--tiktok:hover {
  border-color: #fff;
}

[data-theme='dark'] .platform-card--twitter .platform-card__icon {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

[data-theme='dark'] .platform-card--twitter:hover {
  border-color: #fff;
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-section {
    padding: var(--spacing-12) 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }

  .platform-card {
    padding: var(--spacing-3) var(--spacing-4);
  }
}
</style>
