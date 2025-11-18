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
      <div v-if="isOffline" class="network-banner">
        {{ $t('offline.offlineNow') }}
      </div>
      <div v-if="!props.disableContainer" :class="mainContainerClass">
        <slot />
      </div>
      <slot v-else />
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
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
import BackToTop from '../ui/button/BackToTop.vue'
import { useNetworkStore } from '@/stores'

const props = withDefaults(
  defineProps<{
    disableContainer?: boolean
    containerClass?: string | string[] | Record<string, boolean>
  }>(),
  {
    disableContainer: false,
    containerClass: '',
  },
)

const mainContainerClass = computed(() => {
  const base: Array<string | Record<string, boolean>> = ['container']
  const extra = props.containerClass

  if (Array.isArray(extra)) {
    base.push(...extra)
  } else if (typeof extra === 'string' && extra.trim()) {
    base.push(extra)
  } else if (extra && typeof extra === 'object') {
    base.push(extra)
  }

  return base
})

// Show/hide back to top button
const showBackToTop = ref(false)

const handleScroll = () => {
  showBackToTop.value = window.scrollY > 400
}
const networkStore = useNetworkStore()
const isOffline = computed(() => !networkStore.isOnline)

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  networkStore.init()
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
  padding-top: 88px;
  /* 导航栏高度 + 额外间距 */
  padding-bottom: var(--spacing-12);

  /* Smooth scroll for anchor links */
  scroll-margin-top: 88px;
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
    padding-top: 76px;
    /* 移动端导航栏高度 */
    padding-bottom: calc(90px + env(safe-area-inset-bottom));
    /* 底部导航栏高度 + 安全区域 */
  }
}
</style>
