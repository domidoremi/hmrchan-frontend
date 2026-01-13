<template>
  <section class="stats-section">
    <!-- MindMarket 风格背景装饰 -->
    <div class="mm-hero-bg">
      <div class="mm-hero-bg__blob mm-hero-bg__blob--1" />
      <div class="mm-hero-bg__blob mm-hero-bg__blob--2" />
    </div>

    <div class="container">
      <div class="stats-header">
        <h2 class="mm-heading mm-heading--lg">
          <span>{{ $t('stats.title.prefix') }}</span>
          <span class="mm-heading--highlight">{{ $t('stats.title.highlight') }}</span>
          <span>{{ $t('stats.title.suffix') }}</span>
        </h2>
        <p class="stats-subtitle">{{ $t('stats.subtitle') }}</p>
      </div>

      <div class="stats-grid">
        <div
          v-for="(stat, index) in stats"
          :key="stat.key"
          class="mm-stat-card"
          :class="[`mm-animate-fade-in-up mm-animate-delay-${index + 1}`]"
        >
          <div class="mm-stat-card__icon" :class="stat.iconClass">
            <component :is="stat.icon" :size="24" />
          </div>
          <div class="mm-stat-card__number">{{ stat.value }}</div>
          <div class="mm-stat-card__label">{{ $t(stat.labelKey) }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Globe, Users, Heart, TrendingUp } from 'lucide-vue-next'

const stats = [
  {
    key: 'languages',
    icon: Globe,
    value: '3+',
    labelKey: 'stats.languages',
    iconClass: 'mm-stat-card__icon--teal',
  },
  {
    key: 'creators',
    icon: Users,
    value: '100+',
    labelKey: 'stats.creators',
    iconClass: 'mm-stat-card__icon--purple',
  },
  {
    key: 'content',
    icon: Heart,
    value: '1K+',
    labelKey: 'stats.content',
    iconClass: 'mm-stat-card__icon--coral',
  },
  {
    key: 'growing',
    icon: TrendingUp,
    value: '∞',
    labelKey: 'stats.growing',
    iconClass: 'mm-stat-card__icon--green',
  },
]
</script>

<style scoped>
.stats-section {
  position: relative;
  padding: var(--spacing-20) 0;
  overflow: hidden;
}

.stats-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.stats-header .mm-heading {
  margin-bottom: var(--spacing-4);
}

.stats-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: var(--leading-relaxed);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-6);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-section {
    padding: var(--spacing-16) 0;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .mm-hero-bg__blob {
    animation: none;
  }
}
</style>
