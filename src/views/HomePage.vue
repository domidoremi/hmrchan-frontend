<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section v-if="settings.showHeroSection" class="hero">
      <div class="container hero-content">
        <h1 class="hero-title animate-slide-up">{{ $t('home.hero.title') }}</h1>
        <p class="hero-subtitle animate-slide-up stagger-1">{{ $t('home.hero.subtitle') }}</p>
        <div class="hero-actions animate-slide-up stagger-2">
          <Button size="lg" @click="goToExplore">
            <Compass :size="20" />
            {{ $t('nav.explore') }}
          </Button>
        </div>
      </div>
    </section>

    <!-- Latest Posts -->
    <section class="section">
      <div class="container">
        <h2 class="section-title">{{ $t('home.latest') }}</h2>
        <div class="posts-grid">
          <div v-for="i in 6" :key="i" class="post-card glass-card">
            <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
            <div class="post-content">
              <div class="skeleton" style="height: 24px; width: 80%;" />
              <div class="skeleton" style="height: 16px; width: 60%; margin-top: 8px;" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Compass } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import Button from '@/components/ui/Button.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

function goToExplore() {
  router.push('/explore')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.hero {
  padding: var(--spacing-20) 0;
  text-align: center;
  background: linear-gradient(
    180deg,
    rgba(139, 92, 246, 0.1) 0%,
    transparent 100%
  );
}

.hero-content {
  max-width: 800px;
}

.hero-title {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-4);
}

.hero-subtitle {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-8);
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-4);
}

.section {
  padding: var(--spacing-12) 0;
}

.section-title {
  font-size: var(--text-2xl);
  margin-bottom: var(--spacing-6);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.post-card {
  overflow: hidden;
}

.post-image {
  width: 100%;
}

.post-content {
  padding: var(--spacing-4);
}

@media (max-width: 768px) {
  .hero {
    padding: var(--spacing-12) 0;
  }

  .hero-title {
    font-size: var(--text-3xl);
  }

  .hero-subtitle {
    font-size: var(--text-lg);
  }
}
</style>
