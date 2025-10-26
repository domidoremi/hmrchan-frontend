<template>
  <div class="main-layout">
    <AppNavbar />
    <main class="main-content">
      <div class="container">
        <slot />
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: var(--spacing-2xl) 0;
}
</style>
