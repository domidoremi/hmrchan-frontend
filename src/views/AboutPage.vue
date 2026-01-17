<template>
  <div class="about-page">
    <div class="container">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1 class="page-title">{{ $t('about.title') }}</h1>
        <p class="page-subtitle">{{ $t('about.subtitle') }}</p>
      </header>

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
            <div class="info-label">{{ $t('about.projectInfo.commit') }}</div>
            <div class="info-value commit-hash">{{ gitCommit }}</div>
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
            <div class="tech-name">{{ tech.name }}</div>
            <div class="tech-version">{{ tech.version }}</div>
            <div class="tech-description">{{ tech.description }}</div>
          </div>
        </div>
      </section>

      <!-- Git 推送清单 -->
      <section class="section">
        <div class="section-header">
          <GitBranch :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.gitChecklist.title') }}</h2>
        </div>
        <div class="checklist-container glass-card">
          <div class="checklist-intro">
            <p>{{ $t('about.gitChecklist.description') }}</p>
          </div>

          <div class="checklist-section">
            <h3 class="checklist-section-title">
              <CheckCircle :size="20" />
              {{ $t('about.gitChecklist.basic.title') }}
            </h3>
            <ul class="checklist">
              <li v-for="item in basicChecklist" :key="item">
                <Check :size="16" class="check-icon" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="checklist-section">
            <h3 class="checklist-section-title">
              <AlertCircle :size="20" />
              {{ $t('about.gitChecklist.feature.title') }}
            </h3>
            <ul class="checklist">
              <li v-for="item in featureChecklist" :key="item">
                <Check :size="16" class="check-icon" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div class="checklist-section">
            <h3 class="checklist-section-title">
              <Rocket :size="20" />
              {{ $t('about.gitChecklist.production.title') }}
            </h3>
            <ul class="checklist">
              <li v-for="item in productionChecklist" :key="item">
                <Check :size="16" class="check-icon" />
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 部署信息 -->
      <section class="section">
        <div class="section-header">
          <Cloud :size="24" class="section-icon" />
          <h2 class="section-title">{{ $t('about.deployment.title') }}</h2>
        </div>
        <div class="deployment-info glass-card">
          <div class="deployment-item">
            <div class="deployment-label">{{ $t('about.deployment.platform') }}</div>
            <div class="deployment-value">Cloudflare Pages</div>
          </div>
          <div class="deployment-item">
            <div class="deployment-label">{{ $t('about.deployment.buildCommand') }}</div>
            <code class="deployment-code"
              >bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build</code
            >
          </div>
          <div class="deployment-item">
            <div class="deployment-label">{{ $t('about.deployment.outputDir') }}</div>
            <code class="deployment-code">dist</code>
          </div>
          <div class="deployment-item">
            <div class="deployment-label">{{ $t('about.deployment.cdn') }}</div>
            <div class="deployment-value">{{ $t('about.deployment.globalCdn') }}</div>
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
  GitBranch,
  Cloud,
  BookOpen,
  Check,
  CheckCircle,
  AlertCircle,
  Rocket,
  Heart,
  ExternalLink,
} from 'lucide-vue-next'
import { useAboutData } from '@/composables/useAboutData'

const { locale } = useI18n()

// 项目信息
const version = import.meta.env['VITE_APP_VERSION'] || '1.0.0'
const gitCommit = import.meta.env['VITE_GIT_COMMIT']?.slice(0, 7) || 'dev'

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

// Extract data from composable
const { techStack, basicChecklist, featureChecklist, productionChecklist, quickLinks } =
  useAboutData()
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

/* 技术栈网格 */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-3);
}

.tech-card {
  padding: var(--spacing-4);
  transition: transform 0.2s ease;
}

.tech-card:hover {
  transform: translateY(-2px);
}

.tech-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-1);
}

.tech-version {
  font-size: var(--text-sm);
  color: var(--color-primary);
  margin-bottom: var(--spacing-2);
}

.tech-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* 检查清单 */
.checklist-container {
  padding: var(--spacing-6);
}

.checklist-intro {
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--glass-border);
}

.checklist-intro p {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

.checklist-section {
  margin-bottom: var(--spacing-6);
}

.checklist-section:last-child {
  margin-bottom: 0;
}

.checklist-section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-3);
  color: var(--color-primary);
}

.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
}

.checklist li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2) 0;
  color: var(--color-text-secondary);
}

.check-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-success);
}

/* 部署信息 */
.deployment-info {
  padding: var(--spacing-6);
}

.deployment-item {
  margin-bottom: var(--spacing-4);
}

.deployment-item:last-child {
  margin-bottom: 0;
}

.deployment-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-1);
}

.deployment-value {
  font-size: var(--text-base);
  color: var(--color-text);
}

.deployment-code {
  display: block;
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(var(--color-primary-rgb), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-primary);
  overflow-x: auto;
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

  .checklist-container {
    padding: var(--spacing-4);
  }

  .deployment-info {
    padding: var(--spacing-4);
  }

  .footer-text {
    flex-wrap: wrap;
  }
}

/* 暗色主题 */
[data-theme='dark'] .deployment-code {
  background: rgba(var(--color-primary-rgb), 0.1);
  border-color: rgba(var(--color-primary-rgb), 0.2);
}
</style>
