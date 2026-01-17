<template>
  <div v-if="show" class="guest-limit-banner glass-card">
    <div class="banner-icon">
      <Lock :size="20" />
    </div>
    <div class="banner-content">
      <h3 class="banner-title">{{ $t('guestLimit.title') }}</h3>
      <p class="banner-description">
        {{ description }}
      </p>
    </div>
    <Button variant="primary" size="sm" @click="goToLogin">
      {{ $t('auth.login') }}
    </Button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'GuestLimitBanner' })

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Lock } from 'lucide-vue-next'
import type { ContentLimitInfo } from '@/api/client'
import Button from './Button.vue'

interface Props {
  limitInfo?: ContentLimitInfo
}

const { limitInfo } = defineProps<Props>()

const router = useRouter()
const { t } = useI18n()

const show = computed(() => limitInfo?.isLimited ?? false)

const description = computed(() => {
  if (!limitInfo) return ''

  if (limitInfo.perPlatformLimit) {
    return t('guestLimit.multiPlatformDescription', {
      perPlatform: limitInfo.perPlatformLimit,
      total: limitInfo.maxResults || 60,
    })
  }

  return t('guestLimit.singlePlatformDescription', {
    limit: limitInfo.guestLimit || 10,
  })
})

function goToLogin() {
  router.push({
    path: '/login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
}
</script>

<style scoped>
.guest-limit-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  background: linear-gradient(
    135deg,
    rgba(var(--color-primary-rgb), 0.05),
    rgba(var(--color-accent-rgb), 0.05)
  );
}

.banner-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-1);
  color: var(--color-text);
}

.banner-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}

@media (max-width: 640px) {
  .guest-limit-banner {
    flex-direction: column;
    text-align: center;
  }

  .banner-content {
    text-align: center;
  }
}
</style>
