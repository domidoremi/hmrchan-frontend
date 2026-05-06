<template>
  <article class="hmr-profile-page">
    <header class="hmr-profile-hero">
      <aside class="hmr-profile-nav" aria-label="Profile sections">
        <RouterLink v-for="item in sections" :key="item.section" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </aside>

      <div class="hmr-profile-hero-copy">
        <p class="hmr-kicker">{{ auth.displayName }}</p>
        <h1 class="hmr-page-title" data-hmr-text-reveal>{{ currentTitle }}</h1>
        <p class="hmr-body">{{ sectionIntro }}</p>
        <HmrPageStateBlock
          :loading="state === 'loading'"
          :empty="state === 'empty'"
          :error="resource.error"
          :title="sectionStateTitle"
          :body="sectionStateBody"
          @retry="loadSection"
        />
        <div class="hmr-action-row">
          <RouterLink class="hmr-cta" to="/settings">打开设置</RouterLink>
          <button class="hmr-text-button" type="button" :disabled="auth.isLoading" @click="logout">
            退出登录
          </button>
        </div>
      </div>
    </header>

    <section class="hmr-section" data-hmr-reveal>
      <div class="hmr-sticky-split">
        <div class="hmr-sticky-copy">
          <p class="hmr-kicker">账户状态</p>
          <h2 class="hmr-section-title">个人内容</h2>
          <p class="hmr-body">收藏、历史、收件箱和安全状态集中展示。</p>
        </div>

        <div class="hmr-story-stack">
          <article v-for="item in content.summary" :key="item.id" class="hmr-story-block">
            <p class="hmr-kicker">{{ item.metric }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
          </article>
        </div>
      </div>
    </section>

    <section class="hmr-section hmr-section--tight" data-hmr-reveal>
      <div class="hmr-container hmr-container--large">
        <div class="hmr-list">
          <div v-for="item in content.rows" :key="item.id" class="hmr-list-row">
            <strong>{{ item.title }}</strong>
            <span>{{ item.excerpt }}</span>
            <em>{{ item.metric }}</em>
          </div>
        </div>

        <div class="hmr-profile-security">
          <div v-for="item in sectionCards" :key="item.title" class="hmr-mini-panel">
            <p class="hmr-kicker">{{ item.kicker }}</p>
            <strong>{{ item.title }}</strong>
            <span>{{ item.body }}</span>
          </div>
        </div>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'
import {
  seedCommunity,
  loadProfileSectionContentResource,
  type HmrProfileSectionContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import type { HmrAsyncResource, HmrPageState } from '@/hmr/types'

const props = defineProps<{
  section: string
}>()

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const auth = useAuthStore()
const state = ref<HmrPageState>('idle')
const content = ref<HmrProfileSectionContent>({
  section: 'overview',
  title: '个人概览',
  summary: seedCommunity,
  rows: seedCommunity,
})
const resource = ref<HmrAsyncResource<HmrProfileSectionContent>>({
  state: 'idle',
  data: content.value,
  source: 'local',
  error: null,
  paths: ['/auth/me', '/users/me/profile'],
  updatedAt: null,
})

const sections = computed(() => [
  { section: 'overview', label: t('profile.overview'), to: '/profile' },
  { section: 'security', label: t('profile.security'), to: '/profile/security' },
  { section: 'preferences', label: t('profile.preferences'), to: '/profile/preferences' },
  { section: 'favorites', label: t('profile.favorites'), to: '/profile/favorites' },
  { section: 'history', label: t('profile.history'), to: '/profile/history' },
  { section: 'inbox', label: t('profile.inbox'), to: '/profile/inbox' },
])

const currentTitle = computed(() => {
  return content.value.title
})

const sectionIntro = computed(() => {
  switch (props.section) {
    case 'security':
      return '管理 Passkey、2FA、设备会话和敏感操作验证。'
    case 'preferences':
      return '管理主题、语言、通知和内容密度。'
    case 'favorites':
      return '收藏内容会在这里形成可回看的个人索引。'
    case 'history':
      return '浏览、阅读和互动历史会在这里展示。'
    case 'inbox':
      return '评论、回复、系统通知和审核结果会进入这里。'
    default:
      return t('profile.empty')
  }
})

const sectionCards = computed(() => [
  {
    kicker: '会话',
    title: auth.isAuthenticated ? '当前会话' : '等待登录',
    body: auth.sessionExpiresAt ? `有效期至 ${auth.sessionExpiresAt}` : t('profile.sessionState'),
  },
  {
    kicker: '身份',
    title: auth.user?.id ?? 'guest',
    body: auth.user?.email ?? '登录后显示邮箱和个人资料。',
  },
  ...(content.value.security
    ? [
        {
          kicker: '安全',
          title: `${content.value.security.passkeys} Passkey`,
          body: content.value.security.twoFactorEnabled ? '2FA 已启用。' : '2FA 尚未启用。',
        },
      ]
    : []),
  ...(content.value.inbox
    ? [
        {
          kicker: '收件箱',
          title: `${content.value.inbox.unreadCount} 未读`,
          body: content.value.inbox.latestLabel,
        },
      ]
    : []),
])

const sectionStateTitle = computed(() => {
  if (state.value === 'loading') return '正在整理个人信息。'
  if (state.value === 'empty') return '暂时没有更多内容。'
  if (resource.value.error?.kind === 'unauthorized') return '登录后继续。'
  if (resource.value.error?.kind === 'refresh-needed') return '请刷新页面后重新查看。'
  if (resource.value.error) return '个人页刷新失败。'
  return '个人内容已就绪。'
})

const sectionStateBody = computed(() => {
  if (state.value === 'loading') return '正在加载收藏、历史、收件箱和安全状态。'
  if (state.value === 'empty') return '切换到其他分区，或稍后再打开。'
  if (resource.value.error?.kind === 'unauthorized') return '登录后就可以查看完整个人状态。'
  if (resource.value.error) return '稍后再试，页面会保留当前内容。'
  return '继续查看收藏、历史、收件箱和安全信息。'
})

async function loadSection(): Promise<void> {
  state.value = 'loading'
  const nextResource = await loadProfileSectionContentResource(props.section)
  resource.value = nextResource
  content.value = nextResource.data
  state.value = content.value.rows.length || content.value.summary.length ? 'ready' : 'empty'
}

async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}

onMounted(() => {
  void loadSection()
})

watch(
  () => props.section,
  () => {
    void loadSection()
  }
)
</script>
