<template>
  <div class="auth-divider" role="presentation" :aria-label="label">
    <span class="auth-divider__line" />
    <span class="auth-divider__label">{{ label }}</span>
    <span class="auth-divider__line" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthDivider' })

defineProps<{
  label: string
}>()
</script>
