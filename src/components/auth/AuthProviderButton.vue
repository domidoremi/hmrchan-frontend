<template>
  <div class="auth-provider">
    <Button
      type="button"
      variant="ghost"
      full-width
      class="auth-provider__button"
      :icon="icon"
      :loading="loading"
      :disabled="disabled"
      @click="$emit('click')"
    >
      {{ label }}
    </Button>
    <p v-if="hint" class="auth-provider__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import Button from '@/components/ui/Button.vue'
import type { AuthProviderAction } from './authTypes'

defineOptions({ name: 'AuthProviderButton' })

defineProps<{
  action: AuthProviderAction
  label: string
  hint?: string
  loading?: boolean
  disabled?: boolean
  icon?: Component
}>()

defineEmits<{
  click: []
}>()
</script>
