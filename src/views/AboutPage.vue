<template>
  <div class="about-page">
    <div class="container">
      <!-- 页面标题 -->
      <header class="page-hero about-hero">
        <div class="page-hero__content">
          <div class="page-hero__heading">
            <span class="page-hero__eyebrow">{{ $t('nav.about') }}</span>
            <h1 class="page-hero__title gradient-text">{{ $t('about.title') }}</h1>
          </div>
        </div>
      </header>

      <!-- 关于 Himeri -->
      <section class="section himeri-section">
        <div class="page-section-head about-section-head">
          <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" class="about-section-icon" />
          <h2 class="page-section-title about-section-title">{{ $t('about.origin.title') }}</h2>
        </div>
        <div class="origin-content empty-surface">
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
            <h3 class="subsection-title">
              <AnimatedIcon name="user" :fallback-icon="User" size="md" />
              <span>{{ $t('about.origin.profileTitle') }}</span>
            </h3>
            <div class="profile-grid-enhanced">
              <div
                v-for="(item, index) in profileItems"
                :key="item.label"
                class="profile-card page-list-card"
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
            <h3 class="subsection-title">
              <AnimatedIcon name="sparkle" :fallback-icon="Sparkles" size="md" />
              <span>{{ $t('about.origin.aboutTitle') }}</span>
            </h3>
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
        <div class="page-section-head about-section-head">
          <AnimatedIcon
            name="explore"
            :fallback-icon="Globe"
            size="lg"
            class="about-section-icon"
          />
          <h2 class="page-section-title about-section-title">{{ $t('about.links.title') }}</h2>
        </div>

        <!-- 官方网站 -->
        <div class="links-group">
          <h3 class="subsection-title">
            <AnimatedIcon name="explore" :fallback-icon="Globe" size="md" />
            <span>{{ $t('about.links.official') }}</span>
          </h3>
          <div class="links-grid">
            <a
              v-for="link in officialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card page-list-card"
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

        <!-- 个人社交媒体 -->
        <div class="links-group">
          <h3 class="subsection-title">
            <AnimatedIcon name="heart" :fallback-icon="User" size="md" />
            <span>{{ $t('about.links.personal') }}</span>
          </h3>
          <div class="links-grid links-grid--social">
            <a
              v-for="link in personalLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card link-card--compact page-list-card"
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

        <!-- 团体社交媒体 -->
        <div class="links-group">
          <h3 class="subsection-title">
            <AnimatedIcon name="heart" :fallback-icon="Share2" size="md" />
            <span>{{ $t('about.links.groupSocial') }}</span>
          </h3>
          <div class="links-grid links-grid--social">
            <a
              v-for="link in groupSocialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="link-card link-card--compact page-list-card"
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
        <div class="page-section-head about-section-head">
          <AnimatedIcon
            name="sparkle"
            :fallback-icon="Sparkles"
            size="lg"
            class="about-section-icon"
          />
          <h2 class="page-section-title about-section-title">{{ $t('about.features.title') }}</h2>
        </div>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card page-list-card">
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
        <div class="page-section-head about-section-head">
          <AnimatedIcon name="explore" :fallback-icon="Code" size="lg" class="about-section-icon" />
          <h2 class="page-section-title about-section-title">{{ $t('about.tech.title') }}</h2>
        </div>
        <div class="tech-grid">
          <a
            v-for="tech in techStack"
            :key="tech.name"
            :href="tech.url"
            target="_blank"
            rel="noopener noreferrer"
            class="tech-card page-list-card"
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
        <div class="page-section-head about-section-head">
          <AnimatedIcon name="sparkle" :fallback-icon="Info" size="lg" class="about-section-icon" />
          <h2 class="page-section-title about-section-title">
            {{ $t('about.projectInfo.title') }}
          </h2>
        </div>
        <div class="info-grid">
          <div class="info-card page-list-card">
            <div class="info-label">{{ $t('about.projectInfo.buildHash') }}</div>
            <div class="info-value commit-hash">{{ buildHash }}</div>
          </div>
          <div class="info-card page-list-card">
            <div class="info-label">{{ $t('about.projectInfo.buildTime') }}</div>
            <div class="info-value">{{ buildTime }}</div>
          </div>
          <div class="info-card page-list-card">
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
  ShoppingBag,
  Disc,
  Gamepad2,
  Camera,
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

// Official websites (all verified from takanenonadeshiko.jp)
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
  {
    name: t('about.links.fanClub'),
    desc: 'takanekofc.com',
    url: 'https://takanekofc.com/',
    icon: Heart,
    color: '#ec4899',
  },
  {
    name: t('about.links.ecShop'),
    desc: 'takanenonadeshiko-ec.com',
    url: 'https://takanenonadeshiko-ec.com/',
    icon: ShoppingBag,
    color: '#f59e0b',
  },
])

// Himeri's personal social media (from her profile page)
const personalLinks = computed(() => [
  {
    name: 'X (Twitter)',
    url: 'https://mobile.twitter.com/himeri_momiyama',
    icon: Twitter,
    color: '#000000',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/momichan_hime/',
    icon: Instagram,
    color: '#E4405F',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@momichan_hime/',
    icon: Video,
    color: '#000000',
  },
  {
    name: 'SHOWROOM',
    url: 'https://www.showroom-live.com/r/himeri_momiyama',
    icon: Radio,
    color: '#E6194B',
  },
])

// Group social media (from official site footer)
const groupSocialLinks = computed(() => [
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/channel/UCoR4zZDvWvUIqgEWz4HS-sA',
    icon: Youtube,
    color: '#FF0000',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@takanenofficial',
    icon: Video,
    color: '#000000',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/takanenofficial/',
    icon: Instagram,
    color: '#E4405F',
  },
  {
    name: 'Discord',
    url: 'https://discord.gg/gao-ling-nonadeshiko-1158648392516378624',
    icon: Gamepad2,
    color: '#5865F2',
  },
  {
    name: 'LINE',
    url: 'https://line.me/R/ti/p/@620abpnj',
    icon: MessageCircle,
    color: '#06C755',
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/people/高嶺のなでしこ-Takane-No-Nadeshiko/61554973852737/',
    icon: Globe,
    color: '#1877F2',
  },
  {
    name: t('about.links.douyin'),
    url: 'https://www.douyin.com/user/MS4wLjABAAAAQYxY_cUHv7K8JyUWvWB0hOCp4U-oMp81Zr8g52KxBxI',
    icon: Video,
    color: '#000000',
  },
  {
    name: t('about.links.redbook'),
    url: 'https://www.xiaohongshu.com/user/profile/670366fd000000001d033fdf',
    icon: Camera,
    color: '#FE2C55',
  },
  {
    name: 'Weibo',
    url: 'https://weibo.com/u/7953892369',
    icon: Globe,
    color: '#E6162D',
  },
  {
    name: 'Bilibili',
    url: 'https://space.bilibili.com/3493257990375590',
    icon: Disc,
    color: '#00A1D6',
  },
  {
    name: 'BeReal',
    url: 'https://bere.al/takanenofficial',
    icon: Camera,
    color: '#000000',
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
.about-hero .page-hero__content {
  align-items: center;
  text-align: center;
}

.about-hero .page-hero__heading {
  justify-items: center;
}

.about-hero .page-hero__eyebrow {
  align-self: center;
}

/* 章节 */
.section {
  margin-bottom: var(--spacing-8);
}

.about-section-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.about-section-icon {
  color: var(--color-primary);
}

.about-section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  margin: 0;
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
  width: 18.75rem;
  height: 18.75rem;
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
  min-inline-size: 0;
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
  width: 5rem;
  height: 5rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: 50%;
  position: relative;
}

.name-decoration::before {
  content: '';
  position: absolute;
  inset: -0.25rem;
  border-radius: 50%;
  background: var(--gradient-primary);
  opacity: 0.16;
}

.decoration-icon {
  color: var(--color-primary);
  position: relative;
  z-index: 1;
}

/* 子标题 */
.subsection-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin: 0 0 var(--spacing-4);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid var(--page-control-border);
}

.subsection-title svg {
  color: var(--color-primary);
}

/* 个人资料区域 */
.profile-section {
  padding: var(--spacing-6);
  display: grid;
  gap: var(--spacing-4);
  border-top: 1px solid rgba(var(--color-primary-rgb), 0.08);
}

.profile-grid-enhanced {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 17.5rem), 1fr));
  gap: var(--spacing-3);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
}

.profile-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  background: rgba(var(--color-primary-rgb), 0.1);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  flex-shrink: 0;
}

.profile-card-content {
  flex: 1;
  min-inline-size: 0;
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
  border-inline-start: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}

.bio-highlight::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 6.25rem;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}

.highlight-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.125rem;
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
  margin: 0 0 var(--spacing-4);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid var(--page-control-border);
}

.links-group .subsection-title svg {
  color: var(--color-primary);
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18.75rem), 1fr));
  gap: var(--spacing-3);
}

.links-grid--social {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
}

.link-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  min-inline-size: 0;
  text-decoration: none;
  color: inherit;
}

.link-card--compact {
  padding: var(--spacing-3);
}

.link-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--link-color, var(--color-primary)) 12%, transparent);
  color: var(--link-color, var(--color-primary));
  flex-shrink: 0;
}

.link-card--compact .link-icon-wrap {
  width: 2.25rem;
  height: 2.25rem;
}

.link-info {
  flex: 1;
  min-inline-size: 0;
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
  margin-top: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-arrow {
  color: color-mix(
    in srgb,
    var(--link-color, var(--color-primary)) 58%,
    var(--color-text-tertiary)
  );
  opacity: 0.72;
  flex-shrink: 0;
}

/* 核心功能 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.625rem), 1fr));
  gap: var(--spacing-4);
}

.feature-card {
  display: grid;
  justify-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  text-align: center;
}

.feature-icon {
  color: var(--color-primary);
  margin: 0;
}

.feature-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--color-text);
}

.feature-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  gap: var(--spacing-4);
}

.tech-card {
  display: grid;
  align-content: start;
  gap: var(--spacing-3);
  padding: var(--spacing-5);
  text-decoration: none;
  color: inherit;
  min-block-size: 10rem;
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
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.tech-version-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  border: 1px solid rgba(var(--color-primary-rgb), 0.16);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.tech-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin: 0;
}

/* 项目信息 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
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
  width: 0.5rem;
  height: 0.5rem;
  background: var(--color-success);
  border-radius: 50%;
  box-shadow: 0 0 0 6px rgba(var(--color-success-rgb), 0.15);
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
    width: 3.75rem;
    height: 3.75rem;
    align-self: flex-end;
  }

  .decoration-icon {
    width: 1.5rem;
    height: 1.5rem;
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
  }

  .tech-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
