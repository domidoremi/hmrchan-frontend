<template>
  <div class="author-detail-page">
    <div class="container">
      <div class="author-header glass-card">
        <div class="author-avatar skeleton" />
        <div class="author-info">
          <div class="skeleton" style="height: 28px; width: 200px;" />
          <div class="skeleton" style="height: 16px; width: 120px; margin-top: 8px;" />
        </div>
      </div>

      <h2 class="section-title">Posts</h2>
      <div class="posts-grid">
        <div v-for="i in 6" :key="i" class="post-card glass-card">
          <div class="post-image skeleton" style="aspect-ratio: 1;" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.author-detail-page {
  padding: var(--spacing-8) 0;
}

.author-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-8);
}

.author-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  flex-shrink: 0;
}

.section-title {
  font-size: var(--text-xl);
  margin-bottom: var(--spacing-4);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.post-card {
  overflow: hidden;
}
</style>
