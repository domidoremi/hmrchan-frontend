<template>
  <div class="about-page">
    <div class="container">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1 class="page-title gradient-text">{{ $t('about.title') }}</h1>
      </header>

      <!-- 关于 Himeri -->
      <section class="section himeri-section">
        <div class="section-header">
          <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" class="section-icon" />
          <h2 class="section-title">{{ $t('about.origin.title') }}</h2>
        </div>
        <div class="origin-content glass-card">
          <!-- 名字展示 -->
          <div class="himeri-header">
            <div class="himeri-name-card">
              <div class="name-wrapper">
                <h3 class="himeri-jp gradient-text">{{ $t('about.origin.himeri') }}</h3>
                <p class="himeri-romaji">{{ $t('about.origin.himeriRomaji') }}</p>
              </div>
              <div class="name-decoration">
                <AnimatedIcon
                  name="heart"
                  :fallback-icon="Heart"
                  size="xl"
                  class="decoration-icon"
                />
              </div>
            </div>
          </div>

          <!-- 个人资料 -->
          <div class="profile-section">
            <h4 class="subsection-title">
              <AnimatedIcon name="user" :fallback-icon="User" size="md" />
              <span>Profile</span>
            </h4>
            <div class="profile-grid-enhanced">
              <div
                v-for="(item, index) in profileItems"
                :key="item.label"
                class="profile-card"
                :style="{ animationDelay: `${index * 0.05}s` }"
              >
                <div class="profile-card-icon">
                  <AnimatedIcon name="explore" :fallback-icon="item.icon" size="md" />
                </div>
                <div class="profile-card-content">
                  <span class="profile-card-text">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 简介 -->
          <div class="bio-section">
            <h4 class="subsection-title">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="md" />
              <span>About</span>
            </h4>
            <div class="bio-content">
              <p class="bio-text">{{ $t('about.origin.career') }}</p>
              <p class="bio-text">{{ $t('about.origin.personality') }}</p>
              <p class="bio-text">{{ $t('about.origin.platforms') }}</p>
              <div class="bio-highlight">
                <div class="highlight-icon">
                  <AnimatedIcon name="sparkle" :fallback-icon="Star" size="md" />
                </div>
                <p class="bio-text-highlight">{{ $t('about.origin.purpose') }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 官方网站 & 社交媒体 -->
      <section class="section links-section">
        <div class="section-header">
          <AnimatedIcon name="explore" :fallback-icon="Globe" size="lg" class="section-icon" />
          <h2 class="section-title">{{ $t('about.links.title') }}</h2>
        </div>

        <!-- 官方网站 -->
        <div class="links-group">
          <h4 class="subsection-title">
            <AnimatedIcon name="explore" :fallback-icon="Globe" size="md" />
            <span>{{ $t('about.links.official') }}</span>
          </h4>
          <div class="links-grid">
            <a
              v-for="link in officialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card glass-card"
              :style="{ '--link-color': link.color }"
            >
              <div class="link-icon-wrap">
                <component :is="link.icon" :size="22" />
              </div>
              <div class="link-info">
                <span class="link-name">{{ link.name }}</span>
                <span class="link-desc">{{ link.desc }}</span>
              </div>
              <ExternalLink :size="14" class="link-arrow" />
            </a>
          </div>
        </div>

        <!-- 社交媒体 -->
        <div class="links-group">
          <h4 class="subsection-title">
            <AnimatedIcon name="heart" :fallback-icon="Share2" size="md" />
            <span>{{ $t('about.links.social') }}</span>
          </h4>
          <div class="links-grid links-grid--social">
            <a
              v-for="link in socialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card link-card--compact glass-card"
              :style="{ '--link-color': link.color }"
            >
              <div class="link-icon-wrap">
                <component :is="link.icon" :size="20" />
              </div>
              <span class="link-name">{{ link.name }}</span>
              <ExternalLink :size="12" class="link-arrow" />
            </a>
          </div>
        </div>
      </section>

      <!-- 核心功能 -->
      <section class="section">
        <div class="section-header">
          <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="lg" class="section-icon" />
          <h2 class="section-title">{{ $t('about.features.title') }}</h2>
        </div>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card glass-card">
            <AnimatedIcon
              name="explore"
              :fallback-icon="feature.icon"
              size="xl"
              class="feature-icon"
            />
            <div class="feature-title">{{ feature.title }}</div>
            <div class="feature-description">{{ feature.description }}</div>
          </div>
        </div>
      </section>

      <!-- 技术实现 -->
      <section class="section tech-section">
        <div class="section-header">
          <AnimatedIcon name="explore" :fallback-icon="Code" size="lg" class="section-icon" />
          <h2 class="section-title">{{ $t('about.tech.title') }}</h2>
        </div>
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
      <section class="section info-section">
        <div class="section-header">
          <AnimatedIcon name="sparkle" :fallback-icon="Info" size="lg" class="section-icon" />
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
          <AnimatedIcon name="heart" :fallback-icon="Heart" size="sm" class="heart-icon" />
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
  Cake,
  User,
  Smile,
  Ruler,
  Droplet,
  Sparkle,
  MapPin,
  Music,
  Palette,
  ExternalLink,
  Share2,
  Twitter,
  Instagram,
  Youtube,
  Video,
  MessageCircle,
  Radio,
  BookOpen,
} from 'lucide-vue-next'
import { useAboutData } from '@/composables/useAboutData'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const { locale, t } = useI18n()

// Profile items configuration
const profileItems = computed(() => [
  { icon: Cake, label: t('about.origin.profile.birthday') },
  { icon: User, label: t('about.origin.profile.age') },
  { icon: Droplet, label: t('about.origin.profile.bloodType') },
  { icon: Sparkle, label: t('about.origin.profile.zodiac') },
  { icon: Ruler, label: t('about.origin.profile.height') },
  { icon: MapPin, label: t('about.origin.profile.birthplace') },
  { icon: Users, label: t('about.origin.profile.group') },
  { icon: Star, label: t('about.origin.profile.position') },
  { icon: Smile, label: t('about.origin.profile.nickname') },
  { icon: Music, label: t('about.origin.profile.hobbies') },
  { icon: Palette, label: t('about.origin.profile.skills') },
])

// Official & Social links
const officialLinks = computed(() => [
  {
    name: t('about.links.groupSite'),
    desc: 'takanenonadeshiko.jp',
    url: 'https://takanenonadeshiko.jp/',
    icon: Globe,
    color: '#e22658',
  },
  {
    name: t('about.links.memberPage'),
    desc: 'himeri_momiyama',
    url: 'https://takanenonadeshiko.jp/himeri_momiyama/',
    icon: User,
    color: '#e22658',
  },
  {
    name: t('about.links.schedule'),
    desc: 'takanenonadeshiko.jp/schedule',
    url: 'https://takanenonadeshiko.jp/schedule/',
    icon: BookOpen,
    color: '#6366f1',
  },
])

const socialLinks = computed(() => [
  {
    name: 'X (Twitter)',
    url: 'https://x.com/himeri_momi',
    icon: Twitter,
    color: '#000000',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/himeri_momiyama/',
    icon: Instagram,
    color: '#E4405F',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@himeri_momiyama',
    icon: Video,
    color: '#000000',
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@takanenonadeshiko',
    icon: Youtube,
    color: '#FF0000',
  },
  {
    name: 'SHOWROOM',
    url: 'https://www.showroom-live.com/r/takananohimeri',
    icon: Radio,
    color: '#E6194B',
  },
  {
    name: t('about.links.groupTwitter'),
    url: 'https://x.com/takane_ndsck',
    icon: Twitter,
    color: '#000000',
  },
  {
    name: t('about.links.groupInstagram'),
    url: 'https://www.instagram.com/takane_no_nadeshiko/',
    icon: Instagram,
    color: '#E4405F',
  },
  {
    name: 'LINE',
    url: 'https://page.line.me/takanenonadeshiko',
    icon: MessageCircle,
    color: '#06C755',
  },
])

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
  min-height: 100svh;
  min-height: 100dvh;
  padding: var(--spacing-6) 0;
  background: linear-gradient(
    180deg,
    rgba(var(--mm-green-rgb), 0.02) 0%,
    transparent 50%,
    rgba(var(--mm-purple-rgb), 0.02) 100%
  );
}

.container {
  max-width: var(--container-max-fluid);
  margin: 0 auto;
  padding: 0 var(--page-padding);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-2);
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

/* 关于 Himeri - 优化版 */
.himeri-section {
  position: relative;
}

.origin-content {
  padding: 0;
  overflow: hidden;
}

/* 名字卡片 */
.himeri-header {
  padding: var(--spacing-8) var(--spacing-6);
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.1) 0%,
    rgba(var(--color-primary-rgb), 0.05) 100%
  );
  border-bottom: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
}

.himeri-header::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.himeri-name-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  position: relative;
  z-index: 1;
}

.name-wrapper {
  flex: 1;
}

.himeri-jp {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  margin: 0 0 var(--spacing-2) 0;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.himeri-romaji {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  font-style: italic;
  font-weight: var(--font-medium);
  margin: 0;
  letter-spacing: 0.05em;
}

.name-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 50%;
  position: relative;
}

.name-decoration::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: var(--gradient-primary);
  opacity: 0.2;
  animation: rotate 8s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.decoration-icon {
  color: var(--color-primary);
  position: relative;
  z-index: 1;
  animation: heartbeat 2s ease-in-out infinite;
}

/* 子标题 */
.subsection-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-2);
  border-bottom: 2px solid var(--glass-border);
}

.subsection-title svg {
  color: var(--color-primary);
}

/* 个人资料区域 */
.profile-section {
  padding: var(--spacing-6);
  background: rgba(var(--color-background-rgb), 0.3);
}

.profile-grid-enhanced {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-3);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.5s ease-out backwards;
  position: relative;
  overflow: hidden;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--gradient-primary);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s ease;
}

.profile-card:hover {
  transform: translateX(8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--color-primary-rgb), 0.3);
}

.profile-card:hover::before {
  transform: scaleY(1);
  transform-origin: top;
}

.profile-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.profile-card:hover .profile-card-icon {
  background: rgba(var(--color-primary-rgb), 0.2);
  transform: scale(1.1) rotate(5deg);
}

.profile-card-content {
  flex: 1;
  min-width: 0;
}

.profile-card-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  display: block;
  word-break: break-word;
}

/* 简介区域 */
.bio-section {
  padding: var(--spacing-6);
}

.bio-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.bio-text {
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
  margin: 0;
  text-align: justify;
}

.bio-highlight {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.08) 0%,
    rgba(var(--color-primary-rgb), 0.03) 100%
  );
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}

.bio-highlight::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.highlight-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 2px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.bio-text-highlight {
  flex: 1;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  font-weight: var(--font-medium);
  margin: 0;
}

/* 官方 & 社交链接 */
.links-section .origin-content {
  padding: 0;
}

.links-group {
  margin-bottom: var(--spacing-6);
}

.links-group .subsection-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-2);
  border-bottom: 2px solid var(--glass-border);
}

.links-group .subsection-title svg {
  color: var(--color-primary);
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-3);
}

.links-grid--social {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.link-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
}

.link-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--link-color, var(--color-primary));
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.3s ease;
}

.link-card:hover {
  transform: translateX(4px);
  border-color: rgba(var(--color-primary-rgb), 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.link-card:hover::before {
  transform: scaleY(1);
  transform-origin: top;
}

.link-card--compact {
  padding: var(--spacing-3);
}

.link-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--link-color, var(--color-primary)) 12%, transparent);
  color: var(--link-color, var(--color-primary));
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.link-card--compact .link-icon-wrap {
  width: 36px;
  height: 36px;
}

.link-card:hover .link-icon-wrap {
  transform: scale(1.1);
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.link-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-arrow {
  color: var(--color-text-tertiary);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.link-card:hover .link-arrow {
  opacity: 1;
  transform: translateX(0);
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
.section-surface {
  position: relative;
  width: min(100%, 65rem);
  margin-inline: auto;
  padding: var(--spacing-4);
  border-radius: var(--radius-2xl);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

.section-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-surface, var(--gradient-card-hover));
  opacity: 0.7;
  pointer-events: none;
}

.section-surface > * {
  position: relative;
  z-index: 1;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
  min-height: 10rem;
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
  box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.25);
}

[data-theme='dark'] .tech-version-badge {
  color: var(--color-gray-900);
  background: linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 100%);
  box-shadow: 0 6px 16px rgba(244, 244, 245, 0.15);
}

.tech-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

/* 项目信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--spacing-4);
}

.info-card {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-height: 7.5rem;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.info-value {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}
.commit-hash {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  letter-spacing: 0.04em;
  word-break: break-all;
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
  box-shadow: 0 0 0 6px rgba(var(--color-success-rgb), 0.15);
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

  .himeri-header {
    padding: var(--spacing-6) var(--spacing-4);
  }

  .himeri-name-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .himeri-jp {
    font-size: var(--text-2xl);
  }

  .himeri-romaji {
    font-size: var(--text-lg);
  }

  .name-decoration {
    width: 60px;
    height: 60px;
    align-self: flex-end;
  }

  .decoration-icon {
    width: 24px;
    height: 24px;
  }

  .profile-section,
  .bio-section {
    padding: var(--spacing-4);
  }

  .profile-grid-enhanced {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .links-grid {
    grid-template-columns: 1fr;
  }

  .links-grid--social {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .section-surface {
    width: calc(100% - var(--spacing-5));
    padding: var(--spacing-3);
  }
}
</style>
