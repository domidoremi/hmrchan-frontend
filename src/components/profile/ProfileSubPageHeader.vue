<template>
  <header class="profile-page-header glass-card">
    <div class="header-left">
      <button type="button" class="back-btn glass-button" @click="goBack">
        <AnimatedIcon name="explore" :fallback-icon="ArrowLeft" size="sm" />
      </button>
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        <p v-if="hint" class="header-hint">{{ hint }}</p>
      </div>
    </div>
    <slot name="actions">
      <Button variant="ghost" size="sm" @click="goToProfile">
        <AnimatedIcon name="user" :fallback-icon="User" size="sm" />
        {{ $t('nav.profile') }}
      </Button>
    </slot>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, User } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import AnimatedIcon from '@/components/animation/AnimatedIcon.vue'

defineProps<{
  title: string
  subtitle?: string
  hint?: string
}>()

const router = useRouter()

function goBack() {
  router.back()
}

function goToProfile() {
  router.push('/profile')
}
</script>

<style scoped>
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

.header-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.back-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
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
