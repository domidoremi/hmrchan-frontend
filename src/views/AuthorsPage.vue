<template>
  <MainLayout>
    <div class="authors-page">
      <h1 class="page-title">{{ $t('nav.authors') }}</h1>

      <LoadingSpinner v-if="loading" size="lg" />

      <div v-else-if="authors.length > 0" class="authors-grid">
        <div v-for="author in authors" :key="author.id" class="author-card glass-card">
          <div class="author-avatar">
            <User :size="32" />
          </div>
          <h3>{{ author.name }}</h3>
          <p v-if="author.username" class="author-username">@{{ author.username }}</p>
          <div class="author-stats">
            <div class="stat">
              <span class="stat-value">{{ formatNumber(author.follower_count || 0) }}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ author.post_count || 0 }}</span>
              <span class="stat-label">Posts</span>
            </div>
          </div>
          <div class="platform-badge" :style="{ background: getPlatformColor(author.platform) }">
            {{ author.platform }}
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <Users :size="64" />
        <h3>No authors found</h3>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User, Users } from 'lucide-vue-next'

import MainLayout from '@/components/layout/MainLayout.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { PLATFORM_COLORS } from '@/types'

const loading = ref(true)
const authors = ref<any[]>([])

onMounted(async () => {
  // TODO: Fetch authors from API
  loading.value = false
})

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

const getPlatformColor = (platform: string) => {
  return PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || '#666'
}
</script>

<style scoped>
.authors-page {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.page-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.author-card {
  padding: var(--spacing-xl);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.author-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: var(--spacing-sm);
}

.author-card h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.author-username {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.author-stats {
  display: flex;
  gap: var(--spacing-xl);
  margin: var(--spacing-md) 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.platform-badge {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-3xl);
  color: var(--color-text-tertiary);
}
</style>
