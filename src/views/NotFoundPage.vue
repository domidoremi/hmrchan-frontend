<template>
  <div class="not-found-page" v-once>
    <div class="not-found-content glass-card">
      <div class="error-code">404</div>
      <h1>{{ $t('error.notFound.title', 'Page Not Found') }}</h1>
      <p>
        {{
          $t(
            'error.notFound.description',
            "The page you're looking for doesn't exist or has been moved.",
          )
        }}
      </p>

      <div class="actions">
        <GlassButton size="lg" @click="goHome">
          <Home :size="20" />
          {{ $t('error.notFound.goHome', 'Go Home') }}
        </GlassButton>
        <GlassButton size="lg" variant="ghost" @click="goBack">
          <ArrowLeft :size="20" />
          {{ $t('common.back', 'Go Back') }}
        </GlassButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'
import GlassButton from '@/components/ui/Button.vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
}

.not-found-content {
  max-width: 600px;
  padding: var(--spacing-3xl);
  text-align: center;
}

.error-code {
  font-size: 8rem;
  font-weight: var(--font-bold);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: var(--spacing-lg);
}

.not-found-content h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.not-found-content p {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2xl);
}

.actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  flex-wrap: wrap;
}
</style>
