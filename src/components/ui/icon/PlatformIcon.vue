<template>
  <component :is="iconComponent" v-if="isLucideIcon" :size="size" />
  <svg
    v-else-if="platform === 'tiktok'"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.88 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1V9.4a6.17 6.17 0 0 0-.79-.05A6.33 6.33 0 0 0 3.16 15.67a6.33 6.33 0 0 0 6.33 6.33 6.33 6.33 0 0 0 6.33-6.33V9.19a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.62z"
    />
  </svg>
</template>

<script setup lang="ts">
/**
 * PlatformIcon - 平台图标组件
 *
 * 提供各社交媒体平台的图标，TikTok 使用自定义 SVG
 */
import { computed, type Component } from 'vue'
import { Youtube, Twitter, Instagram, Globe2, type LucideIcon } from 'lucide-vue-next'

interface Props {
  /** 平台名称 */
  platform: 'youtube' | 'twitter' | 'tiktok' | 'instagram' | 'all' | ''
  /** 图标尺寸 */
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 16,
})

const isLucideIcon = computed(() => props.platform !== 'tiktok')

const iconComponent = computed<Component | LucideIcon | null>(() => {
  switch (props.platform) {
    case 'youtube':
      return Youtube
    case 'twitter':
      return Twitter
    case 'instagram':
      return Instagram
    case 'all':
    case '':
      return Globe2
    default:
      return null
  }
})
</script>
