<template>
  <div class="authors-page">
    <div class="container">
      <div class="page-title-row">
        <h1 class="page-title">{{ $t('nav.authors') }}</h1>
        <span v-if="isLoading && authors.length > 0" class="spinner spinner-sm" />
      </div>

      <StateIndicator v-if="error" variant="error" :description="error" @action="fetchAuthors" />

      <template v-else>
        <div v-if="isLoading && authors.length === 0" class="authors-grid">
          <div v-for="i in 8" :key="i" class="author-card glass-card">
            <div class="author-avatar skeleton" />
            <div class="author-info">
              <div class="skeleton" style="height: 20px; width: 60%" />
              <div class="skeleton" style="height: 14px; width: 40%; margin-top: 8px" />
            </div>
          </div>
        </div>

        <template v-else>
          <div class="authors-grid">
            <button
              v-for="author in authors"
              :key="author.id"
              type="button"
              class="author-card glass-card author-card-btn content-auto-sm"
              @click="goToAuthor(author.id)"
              @mouseenter="prefetchAuthorDetailPage"
              @focus="prefetchAuthorDetailPage"
            >
              <img
                v-if="author.avatar_url"
                class="author-avatar"
                :src="author.avatar_url"
                :alt="author.name"
                loading="lazy"
                decoding="async"
                style="object-fit: cover"
              />
              <div v-else class="author-avatar skeleton" />

              <div class="author-info">
                <h3 class="author-name">{{ author.name }}</h3>
                <p class="author-username">@{{ author.username }}</p>
              </div>
            </button>
          </div>

          <StateIndicator v-if="authors.length === 0" variant="empty" />

          <div v-if="authors.length > 0" class="load-more-section">
            <div class="quota-indicator">
              <span class="quota-text">{{
                $t('common.showing', { count: authors.length, total })
              }}</span>
            </div>
            <div v-if="hasMore" ref="sentinelRef" class="scroll-sentinel">
              <span v-if="isLoadingMore" class="spinner spinner-sm" />
            </div>
            <Button v-if="hasMore" variant="secondary" :disabled="isLoadingMore" @click="loadMore">
              <span v-if="isLoadingMore" class="spinner spinner-sm" />
              {{ $t('common.loadMore') }}
            </Button>
            <p v-else class="no-more-text">{{ $t('common.noMoreItems') }}</p>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthorsPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorListItem, ApiError } from '@/api'
import { useInfiniteScroll } from '@/composables/useInfiniteScroll'
import Button from '@/components/ui/Button.vue'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()

const { t } = useI18n()

const authors = ref<AuthorListItem[]>([])
const isLoading = ref(false)
const isLoadingMore = ref(false)
const error = ref<string | null>(null)

const page = ref(1)
const total = ref(0)
const pageSize = 24

const hasMore = computed(() => authors.value.length < total.value)

const sentinelRef = ref<HTMLElement | null>(null)

let hasPrefetchedAuthorDetailPage = false

function prefetchAuthorDetailPage() {
  if (hasPrefetchedAuthorDetailPage) return
  hasPrefetchedAuthorDetailPage = true
  import('@/views/AuthorDetailPage.vue').catch(() => {})
}

async function fetchAuthors(reset = true): Promise<boolean> {
  const hadData = authors.value.length > 0

  if (reset) {
    if (isLoading.value) return false
    isLoading.value = true
    page.value = 1
    if (!hadData) {
      authors.value = []
    }
  } else {
    if (isLoadingMore.value) return false
    isLoadingMore.value = true
  }

  error.value = null

  try {
    const res = await authorService.listAuthors({ page: page.value, page_size: pageSize })

    if (reset) {
      authors.value = res.items
    } else {
      authors.value.push(...res.items)
    }
    total.value = res.total

    return true
  } catch (err) {
    if (authors.value.length === 0) {
      if (err instanceof ApiError) {
        error.value = err.message
      } else {
        error.value = t('common.error')
      }
    }

    return false
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

async function loadMore(): Promise<boolean> {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) return false

  const nextPage = page.value + 1
  page.value = nextPage
  const ok = await fetchAuthors(false)
  if (!ok) {
    page.value = nextPage - 1
  }
  return ok
}

useInfiniteScroll(sentinelRef, loadMore, {
  rootMargin: '400px',
  enabled: () => hasMore.value && !isLoading.value && !isLoadingMore.value,
})

function goToAuthor(authorId: string) {
  router.push(`/author/${authorId}`)
}

onMounted(() => {
  fetchAuthors()
})
</script>

<style scoped>
.authors-page {
  padding: var(--spacing-8) 0;
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-6);
}

.page-title {
  margin-bottom: 0;
}

.authors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.author-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
}

.author-card-btn {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.author-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.load-more-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
  margin-top: var(--spacing-8);
}

.quota-indicator {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.quota-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.no-more-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
