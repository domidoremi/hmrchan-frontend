<script setup lang="ts">
import { ref } from 'vue'
import PlatformFilter from '@/components/business/PlatformFilter.vue'

type Platform = 'all' | 'instagram' | 'tiktok' | 'youtube' | 'twitter'

const selectedPlatform = ref<Platform>('all')

// Your existing explore page logic here
// const posts = ref([])
// const { loadMore, isLoading } = useInfiniteScroll(...)
</script>

<template>
  <div class="explore-page">
    <div class="explore-header">
      <h1 class="explore-title">Explore</h1>
      <p class="explore-subtitle">Discover amazing content from Himeri</p>

      <!-- Platform Filter with Background Switching -->
      <PlatformFilter v-model="selectedPlatform" />
    </div>

    <div class="explore-content">
      <!-- Your masonry grid or content here -->
      <p class="demo-text">
        Selected platform: <strong>{{ selectedPlatform }}</strong>
      </p>
      <p class="demo-hint">Switch between platforms to see the background morph!</p>
    </div>
  </div>
</template>

<style scoped>
.explore-page {
  min-height: 100vh;
  padding: 2rem 1rem;
}

.explore-header {
  max-width: 1200px;
  margin: 0 auto 3rem;
  text-align: center;
}

.explore-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #4169e1 0%, #6495ed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.explore-subtitle {
  font-size: 1.25rem;
  color: var(--color-text-secondary, #666);
  margin-bottom: 2rem;
}

.explore-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(65, 105, 225, 0.1);
}

.demo-text {
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 1rem;
}

.demo-hint {
  text-align: center;
  color: var(--color-text-secondary, #666);
  font-style: italic;
}

@media (max-width: 768px) {
  .explore-title {
    font-size: 2rem;
  }

  .explore-subtitle {
    font-size: 1rem;
  }
}
</style>
