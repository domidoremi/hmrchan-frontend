<template>
  <div class="about-page">
    <header class="about-masthead">
      <h1>MomiChan<span v-if="isArchive">Next</span></h1>
      <nav class="about-index" :aria-label="$t('common.primaryNavigation')">
        <RouterLink v-for="item in destinations" :key="item.path" :to="item.path">
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ $t(item.label) }}</span>
        </RouterLink>
      </nav>
    </header>
    <nav class="about-directory" :aria-label="$t('about.links.title')">
      <section
        v-for="group in linkGroups"
        :key="group.id"
        :data-directory="group.id"
        class="about-directory-group liquid-surface"
      >
        <h2>{{ $t(group.label) }}</h2>
        <ul class="about-directory-links">
          <li v-for="link in group.links" :key="link.url">
            <a :href="link.url" target="_blank" rel="noopener noreferrer">
              <component :is="link.icon" aria-hidden="true" />
              <span>{{ link.name }}</span>
              <ArrowUpRight class="about-outbound" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </section>
    </nav>
    <footer class="about-colophon">
      <p>{{ $t('about.footer.fanProject') }}</p>
      <a href="https://github.com/domidoremi" target="_blank" rel="noopener noreferrer"
        >@domi <ArrowUpRight aria-hidden="true"
      /></a>
      <RouterLink to="/contact">{{ $t('nav.contact') }}</RouterLink>
    </footer>
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
  Compass,
  Users,
  CalendarDays,
  MessagesSquare,
} from '@lucide/vue'
import { IconInstagram, IconX, IconYoutube } from '@/components/icons'
import { designEdition } from '@/config/designEdition'
const { t } = useI18n()
const isArchive = designEdition === 'archive'
const destinations = [
  { path: '/explore', label: 'nav.explore', icon: Compass },
  { path: '/authors', label: 'nav.authors', icon: Users },
  { path: '/schedule', label: 'nav.schedule', icon: CalendarDays },
  { path: '/community', label: 'nav.community', icon: MessagesSquare },
]
const officialLinks = computed(() => [
  {
    name: t('about.links.groupSite'),
    url: 'https://takanenonadeshiko.jp/',
    icon: Globe,
  },
  {
    name: t('about.links.memberPage'),
    url: 'https://takanenonadeshiko.jp/himeri_momiyama/',
    icon: User,
  },
  {
    name: t('about.links.schedule'),
    url: 'https://takanenonadeshiko.jp/schedule/',
    icon: BookOpen,
  },
  {
    name: t('about.links.fanClub'),
    url: 'https://takanekofc.com/',
    icon: Heart,
  },
  {
    name: t('about.links.ecShop'),
    url: 'https://takanenonadeshiko-ec.com/',
    icon: ShoppingBag,
  },
])

// Himeri's personal social media (from her profile page)
const personalLinks = [
  {
    name: 'X (Twitter)',
    url: 'https://mobile.twitter.com/himeri_momiyama',
    icon: IconX,
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/momichan_hime/',
    icon: IconInstagram,
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@momichan_hime/',
    icon: Video,
  },
  {
    name: 'SHOWROOM',
    url: 'https://www.showroom-live.com/r/himeri_momiyama',
    icon: Radio,
  },
]

// Group social media (from official site footer)
const groupSocialLinks = computed(() => [
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/channel/UCoR4zZDvWvUIqgEWz4HS-sA',
    icon: IconYoutube,
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@takanenofficial',
    icon: Video,
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/takanenofficial/',
    icon: IconInstagram,
  },
  {
    name: 'Discord',
    url: 'https://discord.gg/gao-ling-nonadeshiko-1158648392516378624',
    icon: Gamepad2,
  },
  {
    name: 'LINE',
    url: 'https://line.me/R/ti/p/@620abpnj',
    icon: MessageCircle,
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/people/高嶺のなでしこ-Takane-No-Nadeshiko/61554973852737/',
    icon: Globe,
  },
  {
    name: t('about.links.douyin'),
    url: 'https://www.douyin.com/user/MS4wLjABAAAAQYxY_cUHv7K8JyUWvWB0hOCp4U-oMp81Zr8g52KxBxI',
    icon: Video,
  },
  {
    name: t('about.links.redbook'),
    url: 'https://www.xiaohongshu.com/user/profile/670366fd000000001d033fdf',
    icon: Camera,
  },
  {
    name: 'Weibo',
    url: 'https://weibo.com/u/7953892369',
    icon: Globe,
  },
  {
    name: 'Bilibili',
    url: 'https://space.bilibili.com/3493257990375590',
    icon: Disc,
  },
  {
    name: 'BeReal',
    url: 'https://bere.al/takanenofficial',
    icon: Camera,
  },
])

const linkGroups = computed(() => [
  { id: 'official', label: 'about.links.official', links: officialLinks.value },
  { id: 'personal', label: 'about.links.personal', links: personalLinks },
  { id: 'group', label: 'about.links.groupSocial', links: groupSocialLinks.value },
])
</script>

<style>
@import '@/styles/page-systems/about-page-view.css';
</style>
