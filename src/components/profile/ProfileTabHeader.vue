<template>
  <header class="profile-tab-header">
    <h2 class="profile-tab-header__title">{{ title }}</h2>
    <span v-if="showCount" class="profile-tab-header__count">{{ count }}</span>
    <div v-if="hasActions" class="profile-tab-header__spacer" />
    <div v-if="hasActions" class="profile-tab-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

defineOptions({ name: 'ProfileTabHeader' })

const props = defineProps<{
  title: string
  count?: number
}>()

const slots = useSlots()

const showCount = computed(() => typeof props.count === 'number' && props.count > 0)
const hasActions = computed(() => Boolean(slots['actions']))
</script>

<style scoped>
.profile-tab-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-block-end: clamp(1.25rem, 3vw, 2rem);
}

.profile-tab-header__title {
  margin: 0;
  font-size: clamp(var(--text-lg), 2.5vw, var(--text-xl));
  font-weight: var(--font-bold);
}

.profile-tab-header__count {
  padding: 0.125rem 0.625rem;
  border: 1px solid var(--profile-tab-header-count-border, var(--profile-chip-border));
  border-radius: var(--profile-tab-header-count-radius, var(--radius-full));
  background: var(--profile-tab-header-count-bg, var(--profile-chip-bg));
  color: var(--profile-tab-header-count-color, var(--color-primary));
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.profile-tab-header__spacer {
  flex: 1;
}

.profile-tab-header__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}

@media (max-width: 768px) {
  .profile-tab-header {
    flex-wrap: wrap;
  }
}
</style>
