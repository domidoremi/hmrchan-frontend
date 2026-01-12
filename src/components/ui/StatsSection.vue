<template>
  <section class="stats-section">
    <div class="stats-bg">
      <div class="stats-blob stats-blob--1" />
      <div class="stats-blob stats-blob--2" />
    </div>

    <div class="container">
      <div class="stats-header">
        <h2 class="stats-title">
          <span>{{ $t('stats.title.prefix') }}</span>
          <span class="stats-title-highlight">{{ $t('stats.title.highlight') }}</span>
          <span>{{ $t('stats.title.suffix') }}</span>
        </h2>
        <p class="stats-subtitle">{{ $t('stats.subtitle') }}</p>
      </div>

      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.key" class="stat-card">
          <div class="stat-card-icon" :style="{ background: stat.bgColor }">
            <component :is="stat.icon" :size="24" :style="{ color: stat.iconColor }" />
          </div>
          <div class="stat-card-number">{{ stat.value }}</div>
          <div class="stat-card-label">{{ $t(stat.labelKey) }}</div>
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
    bgColor: 'rgba(99, 102, 241, 0.1)',
    iconColor: 'var(--color-primary)',
  },
  {
    key: 'creators',
    icon: Users,
    value: '100+',
    labelKey: 'stats.creators',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    iconColor: 'var(--color-accent)',
  },
  {
    key: 'content',
    icon: Heart,
    value: '1K+',
    labelKey: 'stats.content',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    iconColor: '#ef4444',
  },
  {
    key: 'growing',
    icon: TrendingUp,
    value: '∞',
    labelKey: 'stats.growing',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    iconColor: 'var(--color-success)',
  },
]
</script>

<style scoped>
.stats-section {
  position: relative;
  padding: var(--spacing-20) 0;
  overflow: hidden;
}

.stats-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stats-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}

.stats-blob--1 {
  width: 400px;
  height: 400px;
  top: -100px;
  right: -100px;
  background: radial-gradient(
    circle,
    rgba(var(--color-primary-rgb), 0.15) 0%,
    transparent 70%
  );
  animation: stats-float 15s ease-in-out infinite;
}

.stats-blob--2 {
  width: 300px;
  height: 300px;
  bottom: -50px;
  left: -50px;
  background: radial-gradient(
    circle,
    rgba(var(--color-accent-rgb), 0.12) 0%,
    transparent 70%
  );
  animation: stats-float 18s ease-in-out infinite reverse;
}

@keyframes stats-float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(20px, -20px) scale(1.05);
  }
}

.stats-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.stats-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  margin-bottom: var(--spacing-4);
}

.stats-title-highlight {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

.stat-card {
  position: relative;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-8);
  text-align: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all var(--transition-normal);
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--color-primary-rgb), 0.3);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

.stat-card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--spacing-4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xl);
  transition: transform var(--transition-fast);
}

.stat-card:hover .stat-card-icon {
  transform: scale(1.1);
}

.stat-card-number {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
  line-height: 1;
}

.stat-card-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
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

  .stat-card {
    padding: var(--spacing-6);
  }

  .stat-card-icon {
    width: 48px;
    height: 48px;
  }

  .stat-card-number {
    font-size: var(--text-3xl);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .stats-blob {
    animation: none;
  }
}
</style>
