<template>
  <nav class="home-quick-nav" :aria-label="$t('home.quickNav.ariaLabel')">
    <button
      v-for="anchor in anchors"
      :key="anchor.id"
      type="button"
      class="home-quick-nav__item"
      :class="{ 'is-active': anchor.id === activeId }"
      :aria-label="$t(anchor.labelKey)"
      :aria-current="anchor.id === activeId ? 'location' : undefined"
      @click="$emit('navigate', anchor.id)"
    >
      <component :is="anchor.icon" :size="18" stroke-width="1.8" aria-hidden="true" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { HomeSectionAnchor } from '@/config/homeSections'

defineOptions({ name: 'HomeQuickNav' })

defineProps<{
  anchors: readonly HomeSectionAnchor[]
  activeId: HomeSectionAnchor['id']
}>()

defineEmits<{
  navigate: [target: HomeSectionAnchor['id']]
}>()
</script>

<style scoped>
.home-quick-nav {
  position: fixed;
  inset-inline-end: clamp(1rem, 2.6vw, 2rem);
  inset-block-start: 50%;
  z-index: calc(var(--z-sticky) + 4);
  display: grid;
  gap: 0.625rem;
  transform: translateY(-50%);
  pointer-events: none;
}

.home-quick-nav__item {
  pointer-events: auto;
  inline-size: 2.625rem;
  block-size: 2.625rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0.0625rem solid rgba(15, 23, 42, 0.06);
  border-radius: 999rem;
  background: rgba(255, 255, 255, 0.34);
  color: color-mix(in srgb, var(--color-text-primary) 72%, transparent);
  box-shadow: 0 1rem 2.25rem -1.9rem rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(0.25rem);
  -webkit-backdrop-filter: blur(0.25rem);
  transition:
    transform var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.home-quick-nav__item:hover {
  transform: translate3d(0, -0.125rem, 0);
  border-color: rgba(var(--color-primary-rgb), 0.2);
  color: var(--color-text-primary);
}

.home-quick-nav__item.is-active {
  background: rgba(255, 255, 255, 0.62);
  border-color: rgba(var(--color-primary-rgb), 0.22);
  color: var(--color-primary);
  transform: scale(1.04);
}

:global([data-color-mode='dark'] .home-quick-nav__item) {
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.32);
  color: rgba(248, 250, 252, 0.8);
}

:global([data-color-mode='dark'] .home-quick-nav__item.is-active) {
  background: rgba(15, 23, 42, 0.64);
  border-color: rgba(var(--color-primary-rgb), 0.32);
  color: rgba(255, 255, 255, 0.96);
}

@media (max-width: 768px) {
  .home-quick-nav {
    inset-inline-start: 50%;
    inset-inline-end: auto;
    inset-block-start: auto;
    inset-block-end: calc(env(safe-area-inset-bottom, 0rem) + 0.75rem);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
    inline-size: max-content;
    max-inline-size: calc(100vw - 1rem);
    transform: translateX(-50%);
    border: 0.0625rem solid rgba(15, 23, 42, 0.05);
    border-radius: 999rem;
    background: rgba(255, 255, 255, 0.32);
    box-shadow: 0 1.1rem 2.2rem -1.85rem rgba(15, 23, 42, 0.2);
    backdrop-filter: blur(0.5rem);
    -webkit-backdrop-filter: blur(0.5rem);
  }

  .home-quick-nav__item {
    inline-size: 2.5rem;
    block-size: 2.5rem;
    background: transparent;
    box-shadow: none;
  }

  :global([data-color-mode='dark'] .home-quick-nav) {
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.42);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-quick-nav__item {
    transition: none;
  }
}
</style>
