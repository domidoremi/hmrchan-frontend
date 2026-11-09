<template>
  <div class="about-page">
    <header class="about-masthead">
      <div class="about-intro">
        <span class="eyebrow">{{ isArchive ? 'THE ARCHIVE' : 'THE JOURNAL' }}</span>
        <h1>MomiChan<span>↗</span></h1>
        <p>{{ $t('about.subtitle') }}</p>
        <nav class="about-index" :aria-label="$t('nav.about')">
          <RouterLink v-for="(item, index) in destinations" :key="item.path" :to="item.path"
            ><small>0{{ index + 1 }}</small
            ><span>{{ $t(item.label) }}</span
            ><ArrowUpRight :size="20"
          /></RouterLink>
        </nav>
        <p class="about-disclaimer">{{ $t('about.footer.fanProject') }}</p>
      </div>
      <EditionAuthArt />
    </header>
    <section class="about-links" :aria-label="$t('about.links.title')">
      <div v-for="group in linkGroups" :key="group.label" class="about-link-group">
        <h2>{{ $t(group.label) }}</h2>
        <div class="about-link-list">
          <a
            v-for="link in group.links"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            ><component :is="link.icon" :size="20" /><span>{{ link.name }}</span
            ><ExternalLink :size="16"
          /></a>
        </div>
      </div>
    </section>
    <div class="about-colophon">
      <span>© {{ new Date().getFullYear() }} MomiChan</span
      ><a href="https://github.com/domidoremi" target="_blank" rel="noopener noreferrer">@domi ↗</a
      ><RouterLink to="/contact">{{ $t('nav.contact') }} ↗</RouterLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowUpRight,
  Globe,
  User,
  BookOpen,
  Heart,
  ShoppingBag,
  Video,
  Radio,
  Gamepad2,
  MessageCircle,
  Camera,
  Disc,
  ExternalLink,
} from '@lucide/vue'
import { IconInstagram, IconX, IconYoutube } from '@/components/icons'
import { designEdition } from '@/config/designEdition'
import EditionAuthArt from '@/components/auth/EditionAuthArt.vue'
const { t } = useI18n()
const isArchive = designEdition === 'archive'
const destinations = [
  { path: '/explore', label: 'nav.explore' },
  { path: '/authors', label: 'nav.authors' },
  { path: '/schedule', label: 'nav.schedule' },
  { path: '/community', label: 'nav.community' },
]
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

const linkGroups = computed(() => [
  { label: 'about.links.official', links: officialLinks.value },
  { label: 'about.links.personal', links: personalLinks.value },
  { label: 'about.links.groupSocial', links: groupSocialLinks.value },
])
</script>

<style>
@import '@/styles/page-systems/about-page-view.css' layer(page-systems);
</style>
