<template>
  <div class="about-page">
    <div class="container">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1 class="page-title">{{ $t('about.title') }}</h1>
        <p class="page-subtitle">{{ $t('about.subtitle') }}</p>
      </header>

      <!-- 网站起源 -->
      <section class="section">
        <div class="section-header">
          <Heart :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.origin.title') }}</h2>
        </div>
        <div class="origin-content glass-card">
          <div class="himeri-name">
            <span class="himeri-jp">{{ $t('about.origin.himeri') }}</span>
            <span class="himeri-romaji">{{ $t('about.origin.himeriRomaji') }}</span>
          </div>
          <p class="origin-text">{{ $t('about.origin.story') }}</p>
          <p class="origin-text">{{ $t('about.origin.purpose') }}</p>
          <p class="origin-text highlight">{{ $t('about.origin.vision') }}</p>
        </div>
      </section>

      <!-- 核心功能 -->
      <section class="section">
        <div class="section-header">
          <Sparkles :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.features.title') }}</h2>
        </div>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card glass-card">
            <component :is="feature.icon" :size="32" class="feature-icon" />
            <div class="feature-title">{{ feature.title }}</div>
            <div class="feature-description">{{ feature.description }}</div>
          </div>
        </div>
      </section>

      <!-- 技术实现 -->
      <section class="section">
        <div class="section-header">
          <Code :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.tech.title') }}</h2>
        </div>
        <p class="tech-intro">{{ $t('about.tech.description') }}</p>
        <div class="tech-grid">
          <a
            v-for="tech in techStack"
            :key="tech.name"
            :href="tech.url"
            target="_blank"
            rel="noopener noreferrer"
            class="tech-card glass-card"
          >
            <div class="tech-header">
              <div class="tech-name">{{ tech.name }}</div>
              <div class="tech-version-badge">v{{ tech.version }}</div>
            </div>
            <div class="tech-description">{{ tech.description }}</div>
          </a>
        </div>
      </section>

      <!-- 项目信息 -->
      <section class="section">
        <div class="section-header">
          <Info :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.projectInfo.title') }}</h2>
        </div>
        <div class="info-grid">
          <div class="info-card glass-card">
            <div class="info-label">{{ $t('about.projectInfo.buildHash') }}</div>
            <div class="info-value commit-hash">{{ buildHash }}</div>
          </div>
          <div class="info-card glass-card">
            <div class="info-label">{{ $t('about.projectInfo.buildTime') }}</div>
            <div class="info-value">{{ buildTime }}</div>
          </div>
          <div class="info-card glass-card">
            <div class="info-label">{{ $t('about.projectInfo.status') }}</div>
            <div class="info-value status-active">
              <span class="status-dot"></span>
              {{ $t('about.projectInfo.active') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 页脚信息 -->
      <footer class="about-footer">
        <p class="footer-text">
          {{ $t('about.footer.madeWith') }}
          <Heart :size="16" class="heart-icon" />
          {{ $t('about.footer.by') }}
          <a
            href="https://github.com/domidoremi"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-link"
          >
            @domi
          </a>
        </p>
        <p class="footer-copyright">© 2025 MomiChan. {{ $t('about.footer.rights') }}</p>
        <p class="footer-disclaimer">{{ $t('about.footer.fanProject') }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AboutPage' })

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Info,
  Code,
  Heart,
  Sparkles,
  Layers,
  Users,
  Star,
  Globe,
} from 'lucide-vue-next'
import { useAboutData } from '@/composables/useAboutData'

const { locale, t } = useI18n()

// Build hash - should be injected at build time, fallback to 'dev' for development
const buildHash = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev'

// Build time - should be injected at build time, fallback to current date for dev
const buildTime = computed(() => {
  // In production, __BUILD_TIME__ would be defined by Vite
  const timestamp = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : Date.now()
  return new Date(timestamp).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

// 核心功能
const features = computed(() => [
  {
    icon: Layers,
    title: t('about.features.aggregation'),
    description: t('about.features.aggregationDesc'),
  },
  {
    icon: Users,
    title: t('about.features.community'),
    description: t('about.features.communityDesc'),
  },
  {
    icon: Star,
    title: t('about.features.personalization'),
    description: t('about.features.personalizationDesc'),
  },
  {
    icon: Globe,
    title: t('about.features.multilingual'),
    description: t('about.features.multilinguralDesc'),
  },
])

// Extract data from composable
const { techStack } = useAboutData()
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  padding: var(--spacing-6) 0;
  background: linear-gradient(
    180deg,
    rgba(var(--mm-green-rgb), 0.02) 0%,
    transparent 50%,
    rgba(var(--mm-purple-rgb), 0.02) 100%
  );
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-2);
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

/* 章节 */
.section {
  margin-bottom: var(--spacing-8);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.section-icon {
  color: var(--color-primary);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

/* 网站起源 */
.origin-content {
  padding: var(--spacing-6);
}

.himeri-name {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-4);
  border-bottom: 2px solid var(--glass-border);
}

.himeri-jp {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.himeri-romaji {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  font-style: italic;
}

.origin-text {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-4);
}

.origin-text.highlight {
  color: var(--color-text);
  font-weight: var(--font-medium);
  padding: var(--spacing-3);
  background: rgba(var(--color-primary-rgb), 0.05);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
}

/* 核心功能 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.feature-card {
  padding: var(--spacing-5);
  text-align: center;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  color: var(--color-primary);
  margin: 0 auto var(--spacing-3);
}

.feature-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-2);
  color: var(--color-text);
}

.feature-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* 技术实现 */
.tech-intro {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
  line-height: var(--leading-relaxed);
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-4);
}

.tech-card {
  padding: var(--spacing-5);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: block;
  text-decoration: none;
  color: inherit;
}

.tech-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-primary);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.tech-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.tech-card:hover::before {
  transform: scaleX(1);
}

.tech-card:active {
  transform: translateY(-2px);
}

.tech-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-3);
  gap: var(--spacing-2);
}

.tech-name {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text);
}

.tech-version-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-white);
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.tech-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* 项目信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.info-card {
  padding: var(--spacing-4);
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.info-value {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.status-active {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--color-success);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 页脚 */
.about-footer {
  margin-top: var(--spacing-12);
  padding-top: var(--spacing-6);
  border-top: 1px solid var(--glass-border);
  text-align: center;
}

.footer-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2);
}

.heart-icon {
  color: #ef4444;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.footer-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-medium);
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.footer-copyright {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-1);
}

.footer-disclaimer {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
  }

  .himeri-name {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
