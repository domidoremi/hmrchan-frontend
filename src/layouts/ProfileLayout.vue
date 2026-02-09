<template>
  <RouterView v-slot="{ Component, route: childRoute }">
    <Transition name="page-fade" mode="out-in">
      <component :is="Component" :key="childRoute.name ?? childRoute.path" />
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
defineOptions({ name: 'ProfileLayout' })
</script>
