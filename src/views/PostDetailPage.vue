<template>
  <div class="post-detail-page">
    <div class="container">
      <button class="back-btn" @click="goBack">
        <ArrowLeft :size="20" />
        {{ $t('common.back') }}
      </button>

      <article class="post-content glass-card">
        <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
        <div class="post-body">
          <div class="skeleton" style="height: 32px; width: 70%;" />
          <div class="skeleton" style="height: 20px; width: 40%; margin-top: 12px;" />
          <div class="skeleton" style="height: 100px; margin-top: 24px;" />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<style scoped>
.post-detail-page {
  padding: var(--spacing-6) 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-4);
  border-radius: var(--radius-lg);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.back-btn:hover {
  background: var(--glass-bg-light);
  color: var(--color-text-primary);
}

.post-content {
  overflow: hidden;
}

.post-body {
  padding: var(--spacing-6);
}
</style>
