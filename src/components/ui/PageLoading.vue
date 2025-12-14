<template>
  <div class="page-loading">
    <div class="loading-spinner">
      <span class="spinner spinner-lg" />
    </div>
    <p class="loading-text">{{ $t('common.loading') }}</p>
  </div>
</template>

<style scoped>
.page-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: var(--spacing-4);
}

.loading-spinner {
  color: var(--color-primary);
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
