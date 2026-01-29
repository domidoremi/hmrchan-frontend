<template>
  <div class="profile-page">
    <div class="container">
      <header class="profile-page-header glass-card">
        <div class="header-left">
          <button type="button" class="back-btn glass-button" @click="goBack">
            <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
          </button>
          <div>
            <h1>{{ $t('profile.tabs.devices') }}</h1>
            <p class="header-subtitle">{{ $t('profile.devicesSubtitle') }}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" @click="goToProfile">
          <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
          {{ $t('nav.profile') }}
        </Button>
      </header>

      <Card class="profile-page-card" variant="subtle">
        <DeviceManagement />
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, User } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import DeviceManagement from '@/components/profile/DeviceManagement.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

const router = useRouter()

function goBack() {
  router.back()
}

function goToProfile() {
  router.push('/profile')
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: var(--spacing-4) 0;
}

.profile-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.header-left h1 {
  margin: 0;
  font-size: var(--text-xl);
}

.header-subtitle {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.profile-page-card {
  padding: var(--spacing-4);
}

@media (max-width: 768px) {
  .profile-page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left {
    width: 100%;
  }
}
</style>
