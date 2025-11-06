<template>
  <div class="main-layout">
    <!-- Skip to main content link for accessibility -->
    <a href="#main-content" class="skip-to-main">
      {{ $t('aria.skipToMain', 'Skip to main content') }}
    </a>

    <!-- Navigation -->
    <AppNavbar />

    <!-- Main Content Area -->
    <main id="main-content" class="main-content" role="main">
      <div class="container">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Floating Action Button -->
    <Transition name="fade">
      <BackToTop v-if="showBackToTop" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
import BackToTop from '../ui/BackToTop.vue'

// Show/hide back to top button
const showBackToTop = ref(false)

const handleScroll = () => {
  showBackToTop.value = window.scrollY > 400
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Skip to main content link */
.skip-to-main {
  position: fixed;
  left: 50%;
  top: -100px;
  transform: translateX(-50%);
  z-index: 10000;
  padding: var(--spacing-3) var(--spacing-6);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  box-shadow:
    0 8px 24px rgba(139, 92, 246, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.2);
  transition: top var(--transition-bounce);
  white-space: nowrap;
}

.skip-to-main:focus {
  top: var(--spacing-4);
  outline: 3px solid white;
  outline-offset: 3px;
}

/* Main content */
.main-content {
  flex: 1;
  padding: var(--spacing-12) 0;

  /* Smooth scroll for anchor links */
  scroll-margin-top: 80px;
}

/* Fade transition for back to top */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .main-content {
    padding: var(--spacing-8) 0;
  }
}
</style>
