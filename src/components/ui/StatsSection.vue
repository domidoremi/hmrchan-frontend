<template>
  <section class="stats-section">
    <div class="container">
      <div class="stats-header glass-panel">
        <div>
          <h2 class="stats-title">
            <span>{{ $t('stats.title.prefix') }}</span>
            <span class="stats-title__highlight">{{ $t('stats.title.highlight') }}</span>
            <span>{{ $t('stats.title.suffix') }}</span>
          </h2>
          <p class="stats-subtitle">{{ $t('stats.subtitle') }}</p>
        </div>
        <div class="stats-cta">
          <span class="cta-label">{{ $t('stats.ctaLabel') }}</span>
          <span class="cta-dot" />
        </div>
      </div>

      <div class="stats-grid">
        <div
          v-for="platform in platforms"
          :key="platform.key"
          class="platform-card glass-card"
          :class="`platform-card--${platform.key}`"
        >
          <div class="platform-card__icon">
            <AnimatedIcon :name="platform.animation" :fallback-icon="platform.icon" size="md" />
          </div>
          <div class="platform-card__body">
            <span class="platform-card__label">{{ $t(platform.labelKey) }}</span>
            <span class="platform-card__value">{{ platform.value }}</span>
          </div>
          <div
            class="platform-card__trend"
            :class="{ up: platform.trend === 'up', down: platform.trend === 'down' }"
          >
            <span>{{ platform.trend === 'up' ? '+' : '-' }}{{ platform.trendValue }}%</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { IconYoutube, IconX, IconTiktok, IconInstagram } from '@/components/icons'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const platforms = [
  {
    key: 'tiktok',
    icon: IconTiktok,
    animation: 'explore',
    labelKey: 'stats.tiktok',
    value: '128k',
    trend: 'up',
    trendValue: 12.4,
  },
  {
    key: 'youtube',
    icon: IconYoutube,
    animation: 'sparkle',
    labelKey: 'stats.youtube',
    value: '64k',
    trend: 'up',
    trendValue: 6.8,
  },
  {
    key: 'instagram',
    icon: IconInstagram,
    animation: 'heart',
    labelKey: 'stats.instagram',
    value: '92k',
    trend: 'up',
    trendValue: 9.2,
  },
  {
    key: 'twitter',
    icon: IconX,
    animation: 'search',
    labelKey: 'stats.twitter',
    value: '45k',
    trend: 'down',
    trendValue: 2.1,
  },
]
</script>

<style scoped>
.stats-section {
  padding: var(--spacing-16) 0;
  position: relative;
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-6);
  margin-bottom: var(--spacing-10);
  padding: var(--spacing-6) var(--spacing-8);
  border-radius: var(--radius-2xl);
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
  margin: 0;
}

.glass-panel {
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border-strong);
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur-strong);
}

.stats-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: rgba(var(--color-success-rgb), 0.12);
  color: var(--color-success);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.cta-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px rgba(var(--color-success-rgb), 0.6);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-4);
}

.platform-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4) var(--spacing-5);
  border-radius: var(--radius-xl);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.platform-card:hover {
  border-color: rgba(var(--color-primary-rgb), 0.18);
  box-shadow: var(--glass-shadow-lg);
}

.platform-card__icon {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.platform-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  flex: 1;
}

.platform-card__label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.platform-card__value {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.platform-card__trend {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-full);
  background: rgba(var(--color-error-rgb), 0.12);
  color: var(--color-error);
}

.platform-card__trend.up {
  background: rgba(var(--color-success-rgb), 0.12);
  color: var(--color-success);
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
[data-color-mode='dark'] .platform-card--tiktok .platform-card__icon {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-gray-100);
}

[data-color-mode='dark'] .platform-card--tiktok:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

[data-color-mode='dark'] .platform-card--twitter .platform-card__icon {
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-gray-100);
}

[data-color-mode='dark'] .platform-card--twitter:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-header {
    flex-direction: column;
    align-items: flex-start;
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
