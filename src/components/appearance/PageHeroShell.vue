<template>
  <component
    :is="tag"
    class="page-hero-shell"
    :class="{
      'page-hero-shell--bare': bare,
    }"
  >
    <div class="page-hero-shell__content">
      <div class="page-hero-shell__header">
        <div class="page-hero-shell__heading">
          <slot name="heading">
            <span v-if="eyebrow" class="page-hero-shell__eyebrow">{{ eyebrow }}</span>
            <div class="page-hero-shell__title-row">
              <h1 v-if="title" class="page-hero-shell__title">{{ title }}</h1>
              <span v-if="badge" class="page-hero-shell__badge">{{ badge }}</span>
            </div>
            <p v-if="subtitle" class="page-hero-shell__subtitle">{{ subtitle }}</p>
          </slot>
        </div>
        <div v-if="$slots.actions" class="page-hero-shell__actions">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.default" class="page-hero-shell__body">
        <slot />
      </div>

      <div v-if="$slots.meta" class="page-hero-shell__meta">
        <slot name="meta" />
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
interface Props {
  tag?: string
  eyebrow?: string
  title?: string
  subtitle?: string
  badge?: string | number
  bare?: boolean
}

withDefaults(defineProps<Props>(), {
  tag: 'header',
  eyebrow: '',
  title: '',
  subtitle: '',
  badge: '',
  bare: false,
})

defineSlots<{
  default?: () => unknown
  heading?: () => unknown
  actions?: () => unknown
  meta?: () => unknown
}>()
</script>
