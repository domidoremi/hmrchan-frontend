<template>
  <div class="about-page">
    <div class="container">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1 class="page-title">{{ $t('about.title') }}</h1>
        <p class="page-subtitle">{{ $t('about.subtitle') }}</p>
      </header>

      <!-- 前端介绍 -->
      <section class="section">
        <div class="section-header">
          <Sparkles :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.introduction.title') }}</h2>
        </div>
        <div class="intro-content glass-card">
          <p class="intro-text">{{ $t('about.introduction.description') }}</p>
          <div class="features-grid">
            <div v-for="feature in features" :key="feature.title" class="feature-item">
              <component :is="feature.icon" :size="20" class="feature-icon" />
              <div class="feature-content">
                <div class="feature-title">{{ feature.title }}</div>
                <div class="feature-description">{{ feature.description }}</div>
              </div>
            </div>
          </div>
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
            <div class="info-label">{{ $t('about.projectInfo.name') }}</div>
            <div class="info-value">MomiChan Frontend</div>
          </div>
          <div class="info-card glass-card">
            <div class="info-label">{{ $t('about.projectInfo.version') }}</div>
            <div class="info-value">{{ version }}</div>
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

      <!-- 技术栈 -->
      <section class="section">
        <div class="section-header">
          <Code :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.techStack.title') }}</h2>
        </div>
        <div class="tech-grid">
          <div v-for="tech in techStack" :key="tech.name" class="tech-card glass-card">
            <div class="tech-header">
              <div class="tech-name">{{ tech.name }}</div>
              <div class="tech-version-badge">v{{ tech.version }}</div>
            </div>
            <div class="tech-description">{{ tech.description }}</div>
          </div>
        </div>
      </section>

      <!-- 快速链接 -->
      <section class="section">
        <div class="section-header">
          <BookOpen :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.links.title') }}</h2>
        </div>
        <div class="links-grid">
          <a
            v-for="link in quickLinks"
            :key="link.name"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="link-card glass-card"
          >
            <component :is="link.icon" :size="20" class="link-icon" />
            <div class="link-content">
              <div class="link-name">{{ link.name }}</div>
              <div class="link-description">{{ link.description }}</div>
            </div>
            <ExternalLink :size="16" class="link-external" />
          </a>
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
  BookOpen,
  Heart,
  ExternalLink,
  Sparkles,
  Zap,
  Palette,
  Globe,
  Shield,
} from 'lucide-vue-next'
import { useAboutData } from '@/composables/useAboutData'
import packageJson from '../../package.json'

const { locale, t } = useI18n()

// 项目版本从 package.json 读取
const version = packageJson.version

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

// 前端特性
const features = computed(() => [
  {
    icon: Zap,
    title: t('about.introduction.features.performance'),
    description: t('about.introduction.features.performanceDesc'),
  },
  {
    icon: Palette,
    title: t('about.introduction.features.design'),
    description: t('about.introduction.features.designDesc'),
  },
  {
    icon: Globe,
    title: t('about.introduction.features.i18n'),
    description: t('about.introduction.features.i18nDesc'),
  },
  {
    icon: Shield,
    title: t('about.introduction.features.security'),
    description: t('about.introduction.features.securityDesc'),
  },
])

// Extract data from composable
const { techStack, quickLinks } = useAboutData()
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

/* 信息网格 */
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

.commit-hash {
  font-family: var(--font-mono);
  font-size: var(--text-base);
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

/* 前端介绍 */
.intro-content {
  padding: var(--spacing-6);
}

.intro-text {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.feature-item {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  transition: background 0.2s ease;
}

.feature-item:hover {
  background: rgba(var(--color-primary-rgb), 0.05);
}

.feature-icon {
  flex-shrink: 0;
  color: var(--color-primary);
  margin-top: 2px;
}

.feature-content {
  flex: 1;
  min-width: 0;
}

.feature-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-1);
  color: var(--color-text);
}

.feature-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* 技术栈网格 */
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
}

.tech-card:hover::before {
  transform: scaleX(1);
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

/* 快速链接 */
.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.link-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.link-icon {
  flex-shrink: 0;
  color: var(--color-primary);
}

.link-content {
  flex: 1;
  min-width: 0;
}

.link-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-1);
}

.link-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.link-external {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
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
}

.footer-link:hover {
  text-decoration: underline;
}

.footer-copyright {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* 响应式 */
@media (max-width: 768px) {
  .page-title {
    font-size: var(--text-2xl);
  }

  .page-subtitle {
    font-size: var(--text-base);
  }

  .section-title {
    font-size: var(--text-xl);
  }

  .info-grid,
  .tech-grid,
  .links-grid {
    grid-template-columns: 1fr;
  }

  .intro-content {
    padding: var(--spacing-4);
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .footer-text {
    flex-wrap: wrap;
  }
}

/* 暗色主题 */
[data-theme='dark'] .feature-item:hover {
  background: rgba(var(--color-primary-rgb), 0.08);
}
</style>
