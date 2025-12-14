<template>
  <div class="explore-page">
    <div class="container">
      <header class="page-header">
        <h1>{{ $t('explore.title') }}</h1>
        <div class="search-bar">
          <Search :size="20" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="glass-input search-input"
            :placeholder="$t('explore.searchPlaceholder')"
          />
        </div>
      </header>

      <div class="filters">
        <button
          v-for="sort in sortOptions"
          :key="sort.value"
          class="filter-btn"
          :class="{ active: currentSort === sort.value }"
          @click="currentSort = sort.value"
        >
          {{ $t(`explore.${sort.value}`) }}
        </button>
      </div>

      <div class="posts-grid">
        <div v-for="i in 12" :key="i" class="post-card glass-card">
          <div class="post-image skeleton" style="aspect-ratio: 1;" />
          <div class="post-content">
            <div class="skeleton" style="height: 20px; width: 80%;" />
            <div class="skeleton" style="height: 14px; width: 50%; margin-top: 8px;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from 'lucide-vue-next'

const searchQuery = ref('')
const currentSort = ref('newest')

const sortOptions = [
  { value: 'newest' },
  { value: 'popular' },
  { value: 'trending' },
]
</script>

<style scoped>
.explore-page {
  padding: var(--spacing-8) 0;
}

.page-header {
  margin-bottom: var(--spacing-6);
}

.page-header h1 {
  margin-bottom: var(--spacing-4);
}

.search-bar {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-4);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
}

.search-input {
  padding-left: var(--spacing-12);
}

.filters {
  display: flex;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-6);
}

.filter-btn {
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border: 1px solid var(--glass-border);
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background: var(--glass-bg-light);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
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
