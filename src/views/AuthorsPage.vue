<template>
  <div class="authors-page">
    <div class="container">
      <h1 class="page-title">{{ $t('nav.authors') }}</h1>

      <div class="authors-grid">
        <div v-for="i in 8" :key="i" class="author-card glass-card">
          <div class="author-avatar skeleton" />
          <div class="author-info">
            <div class="skeleton" style="height: 20px; width: 60%;" />
            <div class="skeleton" style="height: 14px; width: 40%; margin-top: 8px;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.authors-page {
  padding: var(--spacing-8) 0;
}

.page-title {
  margin-bottom: var(--spacing-6);
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
