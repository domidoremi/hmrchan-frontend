<template>
  <section class="auth-shell" :class="{ 'auth-shell--wide': wide }">
    <header class="auth-shell__header">
      <div class="auth-shell__topline">
        <button
          v-if="showBack"
          type="button"
          class="auth-shell__back"
          :aria-label="backLabel || $t('common.back')"
          @click="$emit('back')"
        >
          <ArrowLeft :size="18" />
        </button>
        <div class="auth-shell__copy">
          <slot name="eyebrow" />
          <h1 class="auth-title">{{ title }}</h1>
          <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <AuthTabNav
        v-if="showTabs && activeTab"
        :active-tab="activeTab"
        :redirect-to="redirectTo"
        :aria-label="tabAriaLabel || title"
      />
    </header>

    <div class="auth-shell__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="auth-shell__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import AuthTabNav from './AuthTabNav.vue'
import type { AuthEntryTab } from './authTypes'

defineOptions({ name: 'AuthEntryShell' })

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    activeTab?: AuthEntryTab
    redirectTo?: string
    showTabs?: boolean
    showBack?: boolean
    backLabel?: string
    tabAriaLabel?: string
    wide?: boolean
  }>(),
  {
    subtitle: '',
    activeTab: undefined,
    redirectTo: '/',
    showTabs: true,
    showBack: true,
    backLabel: '',
    tabAriaLabel: '',
    wide: false,
  }
)

defineEmits<{
  back: []
}>()
</script>
