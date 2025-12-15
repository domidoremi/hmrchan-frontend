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
        <div class="section-header">
          <h2 class="section-title">{{ $t('home.latest') }}</h2>
          <span v-if="isLoading && posts.length > 0" class="spinner spinner-sm" />
        </div>

        <StateIndicator
          v-if="error"
          variant="error"
          :description="error"
          @action="fetchLatestPosts"
        />

        <template v-else>
          <div v-if="isLoading && posts.length === 0" class="posts-grid">
            <div v-for="i in 6" :key="i" class="post-card glass-card">
              <div class="post-image skeleton" style="aspect-ratio: 16/9;" />
              <div class="post-content">
                <div class="skeleton" style="height: 24px; width: 80%;" />
                <div class="skeleton" style="height: 16px; width: 60%; margin-top: 8px;" />
              </div>
            </div>
          </div>

          <template v-else>
            <div class="posts-grid">
              <button
                v-for="post in posts"
                :key="post.id"
                type="button"
                class="post-card glass-card post-card-btn"
                @click="goToPost(post.id)"
              >
                <img
                  v-if="post.thumbnail_url"
                  class="post-image"
                  :src="post.thumbnail_url"
                  :alt="post.title"
                  loading="lazy"
                  style="aspect-ratio: 16/9; object-fit: cover;"
                />
                <div v-else class="post-image skeleton" style="aspect-ratio: 16/9;" />

                <div class="post-content">
                  <h3 class="post-title">{{ post.title }}</h3>
                  <p class="post-meta">{{ post.author_name }}</p>
                </div>
              </button>
            </div>

            <StateIndicator v-if="posts.length === 0" variant="empty" />
          </template>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Compass } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores'
import { postService, type PostListItem, ApiError } from '@/api'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const { t } = useI18n()

const posts = ref<PostListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function fetchLatestPosts() {
  if (isLoading.value) return

  const hadData = posts.value.length > 0

  isLoading.value = true
  error.value = null

  try {
    const res = await postService.listPosts({
      page: 1,
      page_size: 12,
      sort_by: 'published_at',
      sort_order: 'desc',
    })
    posts.value = res.items
  } catch (err) {
    if (hadData) return

    if (err instanceof ApiError) {
      error.value = err.message
    } else {
      error.value = t('common.error')
    }
  } finally {
    isLoading.value = false
  }
}

function goToExplore() {
  router.push('/explore')
}

function goToPost(postId: string) {
  router.push(`/post/${postId}`)
}

onMounted(() => {
  fetchLatestPosts()
})
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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.section-title {
  font-size: var(--text-2xl);
  margin-bottom: 0;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.post-card {
  overflow: hidden;
}

.post-card-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
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
