<template>
  <MainLayout>
    <div class="privacy-page">
      <div class="privacy-header glass-card">
        <button class="back-button glass-button" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back') }}
        </button>

        <h1>{{ $t('privacy.title') }}</h1>
        <p class="last-updated">{{ $t('privacy.lastUpdated') }}: {{ lastUpdated }}</p>
      </div>

      <div class="privacy-content glass-card">
        <section v-for="section in sections" :key="section.id" class="privacy-section">
          <h2>{{ section.title }}</h2>
          <!--
            安全说明：v-html 内容来自 i18n 翻译文件（受控的静态内容），
            不包含用户输入，因此 XSS 风险可控。
            如果将来需要渲染用户内容，请使用 DOMPurify 进行消毒。
          -->
          <div v-html="section.content"></div>
        </section>

        <div class="privacy-footer">
          <p>{{ $t('privacy.questions') }}</p>
          <router-link to="/preferences" class="preferences-link">
            {{ $t('privacy.managePreferences') }}
          </router-link>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import MainLayout from '@/components/layout/MainLayout.vue'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n()

const lastUpdated = '2025-10-29'

const goBack = () => {
  router.back()
}

const sections = computed(() => [
  {
    id: 'intro',
    title: t('privacy.intro.title'),
    content: t('privacy.intro.content'),
  },
  {
    id: 'data-collection',
    title: t('privacy.dataCollection.title'),
    content: t('privacy.dataCollection.content'),
  },
  {
    id: 'cookies',
    title: t('privacy.cookies.title'),
    content: t('privacy.cookies.content'),
  },
  {
    id: 'data-use',
    title: t('privacy.dataUse.title'),
    content: t('privacy.dataUse.content'),
  },
  {
    id: 'data-sharing',
    title: t('privacy.dataSharing.title'),
    content: t('privacy.dataSharing.content'),
  },
  {
    id: 'your-rights',
    title: t('privacy.yourRights.title'),
    content: t('privacy.yourRights.content'),
  },
  {
    id: 'security',
    title: t('privacy.security.title'),
    content: t('privacy.security.content'),
  },
  {
    id: 'changes',
    title: t('privacy.changes.title'),
    content: t('privacy.changes.content'),
  },
])
</script>

<style scoped>
.privacy-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

.privacy-header {
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  padding: 0.5rem 1rem;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.privacy-header h1 {
  font-size: var(--text-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
}

.last-updated {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.privacy-content {
  padding: var(--spacing-xl);
}

.privacy-section {
  margin-bottom: var(--spacing-2xl);
}

.privacy-section:last-of-type {
  margin-bottom: var(--spacing-xl);
}

.privacy-section h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--text-primary);
}

.privacy-section :deep(p) {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: var(--spacing-md);
}

.privacy-section :deep(ul) {
  list-style: disc;
  margin-left: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
}

.privacy-section :deep(li) {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: var(--spacing-xs);
}

.privacy-section :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.privacy-footer {
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
  text-align: center;
}

.privacy-footer p {
  font-size: var(--text-md);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.preferences-link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.preferences-link:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* 响应式 */
@media (max-width: 768px) {
  .privacy-page {
    padding: var(--spacing-md);
  }

  .privacy-header,
  .privacy-content {
    padding: var(--spacing-md);
  }

  .privacy-header h1 {
    font-size: var(--text-2xl);
  }

  .privacy-section h2 {
    font-size: var(--text-xl);
  }
}
</style>
