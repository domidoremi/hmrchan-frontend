<template>
  <div class="post-card-skeleton glass-card">
    <div class="skeleton-image glass-skeleton glass-skeleton--wave" />
    <div class="skeleton-content">
      <div class="skeleton-title glass-skeleton glass-skeleton--wave" />
      <div class="skeleton-meta">
        <div class="skeleton-avatar glass-skeleton glass-skeleton--wave" />
        <div class="skeleton-author glass-skeleton glass-skeleton--wave" />
        <div class="skeleton-stats">
          <div class="skeleton-stat glass-skeleton glass-skeleton--wave" />
          <div class="skeleton-stat glass-skeleton glass-skeleton--wave" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card-skeleton {
  display: block;
  overflow: hidden;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.skeleton-content {
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.skeleton-title {
  height: 20px;
  width: 85%;
  border-radius: var(--radius-sm);
}

.skeleton-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.skeleton-avatar {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.skeleton-author {
  height: 14px;
  width: 80px;
  border-radius: var(--radius-sm);
}

.skeleton-stats {
  display: flex;
  gap: var(--spacing-3);
  margin-left: auto;
}

.skeleton-stat {
  width: 40px;
  height: 14px;
  border-radius: var(--radius-sm);
}

/* Staggered animation delays */
.post-card-skeleton .skeleton-image {
  animation-delay: 0ms;
}

.post-card-skeleton .skeleton-title {
  animation-delay: 50ms;
}

.post-card-skeleton .skeleton-avatar {
  animation-delay: 100ms;
}

.post-card-skeleton .skeleton-author {
  animation-delay: 150ms;
}

.post-card-skeleton .skeleton-stat:nth-child(1) {
  animation-delay: 200ms;
}

.post-card-skeleton .skeleton-stat:nth-child(2) {
  animation-delay: 250ms;
}
</style>
