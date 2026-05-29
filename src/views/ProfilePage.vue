<template>
  <article
    class="hmr-profile-page"
    data-testid="profile-section-shell"
    :data-profile-section="activeSection"
  >
    <header class="hmr-profile-hero">
      <aside class="hmr-profile-nav" aria-label="Profile sections">
        <RouterLink
          v-for="item in sections"
          :key="item.section"
          :to="item.to"
          :data-testid="item.testId"
          :aria-current="item.section === activeSection ? 'page' : undefined"
        >
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
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth'
import {
  seedCommunity,
  loadProfileSectionContentResource,
  type HmrProfileSectionContent,
} from '@/api/hmrContent'
import HmrPageStateBlock from '@/hmr/components/HmrPageStateBlock.vue'
import {
  normalizeHmrProfileSection,
  useHmrProfileSection,
} from '@/hmr/composables/useHmrProfileSection'
import { useHmrPrivateContentResource } from '@/hmr/composables/useHmrPrivateContentResource'
import { useHmrRouteResourceRefresh } from '@/hmr/composables/useHmrRouteResourceRefresh'

const props = defineProps<{
  section: string
}>()

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const auth = useAuthStore()
const rawSection = computed(() => props.section)
const initialProfileContent: HmrProfileSectionContent = {
  section: 'overview',
  title: '个人概览',
  summary: seedCommunity,
  rows: seedCommunity,
}
const {
  content,
  pageState: state,
  resource,
  refresh: loadSection,
} = useHmrPrivateContentResource<HmrProfileSectionContent>({
  initialData: initialProfileContent,
  paths: ['/auth/me', '/users/me/profile'],
  loader: () => loadProfileSectionContentResource(normalizeHmrProfileSection(rawSection.value)),
  isEmpty: (data) => data.rows.length === 0 && data.summary.length === 0,
})

const { activeSection, currentTitle, logout, sectionCards, sectionIntro, sections } =
  useHmrProfileSection({
    auth,
    content,
    rawSection,
    router,
    t,
  })

useHmrRouteResourceRefresh({
  refresh: loadSection,
  watchSource: () => activeSection.value,
})
</script>
