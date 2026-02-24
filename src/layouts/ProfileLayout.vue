<template>
  <div class="profile-layout">
    <RouterView v-slot="{ Component, route: childRoute }">
      <Transition name="profile-slide" mode="out-in">
        <component :is="Component" :key="childRoute.name ?? childRoute.path" />
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileLayout' })
</script>

<style scoped>
.profile-layout {
  min-height: 100dvh;
  min-height: 100svh;
}

/* Slide transition for sub-page navigation */
.profile-slide-enter-active,
.profile-slide-leave-active {
  transition:
    opacity var(--duration-normal) var(--ease-smooth),
    translate var(--duration-normal) var(--ease-out-smooth);
}

.profile-slide-enter-from {
  opacity: 0;
  translate: 1rem 0;
}

.profile-slide-leave-to {
  opacity: 0;
  translate: -1rem 0;
}
</style>
