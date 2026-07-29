<template>
  <div class="about-page">
    <div class="container">
      <PageHeroShell class="about-hero page-hero-shell--comfortable">
        <template #heading>
          <h1 class="page-hero-shell__title gradient-text">{{ $t('about.title') }}</h1>
          <p class="page-hero-shell__subtitle">{{ $t('about.subtitle') }}</p>
        </template>

        <template #meta>
          <PageMetaRow class="page-meta-row--comfortable">
            <PageMetaChip>{{ $t('about.links.title') }}</PageMetaChip>
            <PageMetaChip>{{ $t('about.features.title') }}</PageMetaChip>
          </PageMetaRow>
        </template>
      </PageHeroShell>

      <section class="section himeri-section">
        <div class="page-section-head about-section-head">
          <AnimatedIcon name="heart" :fallback-icon="Heart" size="lg" class="about-section-icon" />
          <h2 class="page-section-title about-section-title">{{ $t('about.origin.title') }}</h2>
        </div>
        <div class="origin-content empty-surface">
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

      <section class="section links-section content-auto-lg">
        <div class="page-section-head about-section-head">
          <AnimatedIcon
            name="explore"
            :fallback-icon="Globe"
            size="lg"
            class="about-section-icon"
          />
          <h2 class="page-section-title about-section-title">{{ $t('about.links.title') }}</h2>
        </div>

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

      <section class="section content-auto-lg">
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
        <p class="footer-copyright">© 2026 MomiChan. {{ $t('about.footer.rights') }}</p>
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
  Video,
  MessageCircle,
  Radio,
  BookOpen,
  ShoppingBag,
  Disc,
  Gamepad2,
  Camera,
} from '@lucide/vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'
import { PageHeroShell, PageMetaChip, PageMetaRow } from '@/components/appearance'
import { IconInstagram, IconX, IconYoutube } from '@/components/icons'

const { t } = useI18n()

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
    icon: IconX,
    color: '#000000',
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/momichan_hime/',
    icon: IconInstagram,
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
    icon: IconYoutube,
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
    icon: IconInstagram,
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
</script>
