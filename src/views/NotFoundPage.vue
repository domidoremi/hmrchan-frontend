<template>
  <div class="not-found-page">
    <div class="content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">{{ $t('error.notFound') }}</h2>
      <p class="error-message">{{ $t('error.notFoundMessage') }}</p>
      <Button @click="goHome">
        <Home :size="18" />
        {{ $t('error.goHome') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.not-found-page {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-4);
}

.error-code {
  font-size: 120px;
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: var(--spacing-4);
}

.error-title {
  font-size: var(--text-2xl);
  margin-bottom: var(--spacing-2);
}

.error-message {
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-6);
}
</style>
