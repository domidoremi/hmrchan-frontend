<template>
  <div class="favorites-page">
    <div class="container">
      <h1 class="page-title">{{ $t('nav.favorites') }}</h1>

      <div v-if="!isAuthenticated" class="empty-state glass-card">
        <Heart :size="48" class="empty-icon" />
        <p>Please login to view your favorites</p>
        <Button @click="goToLogin">{{ $t('nav.login') }}</Button>
      </div>

      <div v-else class="posts-grid">
        <div v-for="i in 6" :key="i" class="post-card glass-card">
          <div class="post-image skeleton" style="aspect-ratio: 1;" />
          <div class="post-content">
            <div class="skeleton" style="height: 18px; width: 80%;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Heart } from 'lucide-vue-next'
import { useAuthStore } from '@/stores'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.favorites-page {
  padding: var(--spacing-8) 0;
}

.page-title {
  margin-bottom: var(--spacing-6);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-12);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.post-card {
  overflow: hidden;
}

.post-content {
  padding: var(--spacing-3);
}
</style>
