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
              <div class="skeleton" style="height: 20px; width: 60%;" />
              <div class="skeleton" style="height: 14px; width: 40%; margin-top: 8px;" />
            </div>
          </div>

        </div>

        <template v-else>
          <div class="authors-grid">
          <button
            v-for="author in authors"
            :key="author.id"
            type="button"
            class="author-card glass-card author-card-btn"
            @click="goToAuthor(author.id)"
          >
            <img
              v-if="author.avatar_url"
              class="author-avatar"
              :src="author.avatar_url"
              :alt="author.name"
              loading="lazy"
              style="object-fit: cover;"
            />
            <div v-else class="author-avatar skeleton" />

            <div class="author-info">
              <h3 class="author-name">{{ author.name }}</h3>
              <p class="author-username">@{{ author.username }}</p>
            </div>
          </button>

          </div>

          <StateIndicator v-if="authors.length === 0" variant="empty" />
        </template>

      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthorsPage' })

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authorService, type AuthorListItem, ApiError } from '@/api'
import StateIndicator from '@/components/ui/StateIndicator.vue'

const router = useRouter()

const { t } = useI18n()

const authors = ref<AuthorListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

async function fetchAuthors() {
  if (isLoading.value) return

  const hadData = authors.value.length > 0

  isLoading.value = true
  error.value = null

  try {
    const res = await authorService.listAuthors({ page: 1, page_size: 24 })
    authors.value = res.items
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
</style>
